import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { toast } from "sonner";

// Diálogo para registrar quién marcó los goles de un partido.
// Muestra la plantilla de ambos equipos y permite sumar goles por jugador.
export default function GoleadoresDialog({
  open, onOpenChange, partido, eqLocal, eqVisit, jugadores, golesExistentes, torneo, categoria, onSaved,
}) {
  const [conteo, setConteo] = useState({});

  useEffect(() => {
    if (!open) return;
    const inicial = {};
    (golesExistentes || []).forEach((g) => { inicial[g.jugador_id] = g.goles || 1; });
    setConteo(inicial);
  }, [open, partido?.id]);

  const jugadoresLocal = jugadores.filter((j) => j.equipo_id === eqLocal?.id)
    .sort((a, b) => (Number(a.dorsal) || 999) - (Number(b.dorsal) || 999));
  const jugadoresVisit = jugadores.filter((j) => j.equipo_id === eqVisit?.id)
    .sort((a, b) => (Number(a.dorsal) || 999) - (Number(b.dorsal) || 999));

  const cambiar = (jugadorId, delta) => {
    setConteo((prev) => {
      const nuevo = Math.max(0, (prev[jugadorId] || 0) + delta);
      return { ...prev, [jugadorId]: nuevo };
    });
  };

  const guardar = async () => {
    // Borrar goles previos de este partido y recrear según el conteo actual
    const previos = golesExistentes || [];
    await Promise.all(previos.map((g) => base44.entities.TorneoGol.delete(g.id)));

    const nuevos = [];
    [...jugadoresLocal, ...jugadoresVisit].forEach((j) => {
      const n = conteo[j.id] || 0;
      if (n > 0) {
        const equipo = j.equipo_id === eqLocal?.id ? eqLocal : eqVisit;
        nuevos.push({
          torneo_id: torneo.id,
          categoria_id: categoria.id,
          partido_id: partido.id,
          jugador_id: j.id,
          jugador_nombre: j.nombre,
          equipo_id: j.equipo_id,
          equipo_nombre: equipo?.nombre || "",
          goles: n,
        });
      }
    });
    if (nuevos.length > 0) await base44.entities.TorneoGol.bulkCreate(nuevos);
    toast.success("Goleadores guardados");
    onSaved?.();
    onOpenChange(false);
  };

  const renderEquipo = (equipo, lista) => (
    <div className="space-y-1">
      <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-1">
        {equipo?.escudo_url && <img src={equipo.escudo_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
        {equipo?.nombre}
      </p>
      {lista.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-1">Sin plantilla cargada</p>
      ) : (
        lista.map((j) => (
          <div key={j.id} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1">
            {j.dorsal && <span className="text-xs font-bold text-slate-400 w-5 text-center">{j.dorsal}</span>}
            <span className="flex-1 text-sm truncate">{j.nombre}</span>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => cambiar(j.id, -1)} disabled={!conteo[j.id]}>
              <Minus className="w-3 h-3" />
            </Button>
            <span className="w-5 text-center text-sm font-bold">{conteo[j.id] || 0}</span>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => cambiar(j.id, 1)}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">⚽ Goleadores del partido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {renderEquipo(eqLocal, jugadoresLocal)}
          {renderEquipo(eqVisit, jugadoresVisit)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar}>Guardar goleadores</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}