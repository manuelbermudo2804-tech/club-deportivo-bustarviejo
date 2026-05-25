import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

// Panel con jugadores activos en la categoría seleccionada que aún no tienen dorsal asignado.
export default function PendingPlayersPanel({ players = [], assignments = [], categoria, onAssignClick }) {
  const asignadosIds = new Set(
    assignments.filter((a) => a.estado === "asignado").map((a) => a.jugador_id)
  );

  const pendientes = players.filter((p) => {
    if (!p.activo) return false;
    if (asignadosIds.has(p.id)) return false;
    const cats = p.categorias?.length ? p.categorias : [p.deporte || p.categoria_principal].filter(Boolean);
    return cats.includes(categoria);
  });

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
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-orange-600" />
            Jugadores sin dorsal
          </h3>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            {pendientes.length}
          </Badge>
        </div>
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