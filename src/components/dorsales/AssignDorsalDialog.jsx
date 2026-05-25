import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Diálogo para asignar un dorsal libre a un jugador pendiente.
export default function AssignDorsalDialog({ open, onOpenChange, dorsal, temporada, categoria, jugadoresPendientes = [], onAssigned }) {
  const [jugadorId, setJugadorId] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return jugadoresPendientes;
    return jugadoresPendientes.filter((p) => (p.nombre || "").toLowerCase().includes(q));
  }, [search, jugadoresPendientes]);

  const handleAssign = async () => {
    if (!jugadorId) {
      toast.error("Selecciona un jugador");
      return;
    }
    const jugador = jugadoresPendientes.find((p) => p.id === jugadorId);
    if (!jugador) return;
    setSaving(true);
    try {
      // Si tenía una asignación previa pendiente en esta temporada/categoría, la actualizamos
      const existing = await base44.entities.DorsalAssignment.filter({
        jugador_id: jugadorId,
        temporada,
      });
      const prev = existing?.[0];
      const payload = {
        jugador_id: jugadorId,
        jugador_nombre: jugador.nombre,
        temporada,
        categoria,
        dorsal: Number(dorsal),
        estado: "asignado",
        origen: "manual",
        email_enviado: false,
      };
      let assignmentId;
      if (prev) {
        await base44.entities.DorsalAssignment.update(prev.id, payload);
        assignmentId = prev.id;
      } else {
        const created = await base44.entities.DorsalAssignment.create(payload);
        assignmentId = created.id;
      }
      toast.success(`Dorsal #${dorsal} asignado a ${jugador.nombre}. Puedes notificar a la familia desde la ficha del dorsal.`);
      onAssigned?.();
      onOpenChange(false);
      setJugadorId("");
      setSearch("");
    } catch (e) {
      console.error(e);
      toast.error("Error al asignar el dorsal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar dorsal #{dorsal}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-slate-600">
            <Badge variant="outline" className="mr-2">{categoria}</Badge>
            <Badge variant="outline">{temporada}</Badge>
          </div>
          <div>
            <Label className="text-xs">Buscar jugador pendiente</Label>
            <Input
              placeholder="Nombre del jugador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-auto border rounded-lg divide-y">
            {filtered.length === 0 && (
              <div className="p-4 text-sm text-slate-500 text-center">
                No hay jugadores pendientes en esta categoría
              </div>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setJugadorId(p.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${jugadorId === p.id ? "bg-orange-100 font-semibold" : ""}`}
              >
                <div>{p.nombre}</div>
                {p.dorsal_preferente && (
                  <div className="text-xs text-slate-500">Prefiere el #{p.dorsal_preferente}</div>
                )}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={!jugadorId || saving} className="bg-orange-600 hover:bg-orange-700">
            {saving ? "Asignando..." : `Asignar #${dorsal}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}