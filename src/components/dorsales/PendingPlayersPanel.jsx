import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Panel con jugadores activos en la categoría seleccionada que aún no tienen dorsal asignado.
// Permite asignar automáticamente los dorsales preferentes libres de un solo click.
export default function PendingPlayersPanel({
  players = [],
  assignments = [],
  categoria,
  temporada,
  config,
  onAssignClick,
  onAutoAssigned,
}) {
  const [autoLoading, setAutoLoading] = useState(false);

  const asignadosIds = new Set(
    assignments.filter((a) => a.estado === "asignado").map((a) => a.jugador_id)
  );

  const pendientes = players.filter((p) => {
    if (!p.activo) return false;
    if (asignadosIds.has(p.id)) return false;
    const cats = p.categorias?.length ? p.categorias : [p.deporte || p.categoria_principal].filter(Boolean);
    return cats.includes(categoria);
  });

  // Pendientes con dorsal preferente LIBRE en esta categoría
  const autoAsignables = useMemo(() => {
    const ocupados = new Set(
      assignments.filter((a) => a.estado === "asignado").map((a) => Number(a.dorsal))
    );
    const reservados = new Set((config?.dorsales_reservados || []).map(Number));
    const min = config?.dorsal_min ?? 1;
    const max = config?.dorsal_max ?? 60;
    const usadosEnLote = new Set();
    const resultado = [];
    for (const p of pendientes) {
      const pref = Number(p.dorsal_preferente);
      if (!pref) continue;
      if (pref < min || pref > max) continue;
      if (reservados.has(pref)) continue;
      if (ocupados.has(pref) || usadosEnLote.has(pref)) continue;
      resultado.push({ player: p, dorsal: pref });
      usadosEnLote.add(pref);
    }
    return resultado;
  }, [pendientes, assignments, config]);

  const handleAutoAssign = async () => {
    if (autoAsignables.length === 0) return;
    if (!confirm(`Se asignarán automáticamente ${autoAsignables.length} dorsales preferentes. ¿Continuar?`)) return;
    setAutoLoading(true);
    try {
      const user = await base44.auth.me();
      for (const { player, dorsal } of autoAsignables) {
        await base44.entities.DorsalAssignment.create({
          jugador_id: player.id,
          jugador_nombre: player.nombre,
          temporada,
          categoria,
          dorsal,
          estado: "asignado",
          origen: "preferente_auto",
          asignado_por: user?.email || "",
        });
      }
      toast.success(`${autoAsignables.length} dorsales asignados automáticamente`);
      onAutoAssigned?.();
    } catch (e) {
      console.error(e);
      toast.error("Error al asignar automáticamente");
    } finally {
      setAutoLoading(false);
    }
  };

  if (pendientes.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 text-center text-sm text-green-800">
          ✅ Todos los jugadores de esta categoría tienen dorsal asignado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-orange-600" />
            Jugadores sin dorsal
          </h3>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            {pendientes.length}
          </Badge>
        </div>

        {autoAsignables.length > 0 && (
          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-purple-900">
              <span className="font-semibold">{autoAsignables.length}</span> jugador{autoAsignables.length === 1 ? "" : "es"} con dorsal preferente libre
            </div>
            <Button
              size="sm"
              onClick={handleAutoAssign}
              disabled={autoLoading}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <Wand2 className="w-4 h-4" />
              {autoLoading ? "Asignando..." : "Asignar preferentes auto"}
            </Button>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-auto">
          {pendientes.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{p.nombre}</div>
                {p.dorsal_preferente && (
                  <div className="text-xs text-orange-600">Prefiere el #{p.dorsal_preferente}</div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => onAssignClick?.(p)} className="text-xs">
                Asignar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}