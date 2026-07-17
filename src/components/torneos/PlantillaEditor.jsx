import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users, ChevronDown, ChevronRight } from "lucide-react";

// Editor de la plantilla (jugadores) de un equipo del torneo.
export default function PlantillaEditor({ torneo, categoria, equipo, jugadores, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [dorsal, setDorsal] = useState("");

  const jugadoresEquipo = jugadores
    .filter((j) => j.equipo_id === equipo.id)
    .sort((a, b) => (Number(a.dorsal) || 999) - (Number(b.dorsal) || 999));

  const addJugador = useMutation({
    mutationFn: () =>
      base44.entities.TorneoJugador.create({
        torneo_id: torneo.id,
        categoria_id: categoria.id,
        equipo_id: equipo.id,
        nombre: nombre.trim(),
        dorsal: dorsal.trim(),
      }),
    onSuccess: () => { setNombre(""); setDorsal(""); onChange(); },
  });

  const delJugador = useMutation({
    mutationFn: (id) => base44.entities.TorneoJugador.delete(id),
    onSuccess: onChange,
  });

  const submit = () => {
    if (!nombre.trim()) return;
    addJugador.mutate();
  };

  return (
    <div className="bg-slate-50 rounded px-2 py-1.5">
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        {equipo.escudo_url && <img src={equipo.escudo_url} alt="" className="w-5 h-5 rounded-full object-cover" />}
        <span className="flex-1 text-sm font-medium truncate">{equipo.nombre}</span>
        <span className="text-xs text-slate-400 inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {jugadoresEquipo.length}
        </span>
      </button>

      {abierto && (
        <div className="mt-2 space-y-1.5 pl-6">
          {jugadoresEquipo.map((j) => (
            <div key={j.id} className="flex items-center gap-2 bg-white rounded px-2 py-1">
              {j.dorsal && <span className="text-xs font-bold text-slate-500 w-6 text-center">{j.dorsal}</span>}
              <span className="flex-1 text-sm truncate">{j.nombre}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400"
                onClick={() => delJugador.mutate(j.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Input value={dorsal} onChange={(e) => setDorsal(e.target.value)}
              placeholder="#" className="w-14 h-8 text-center px-1"
              onKeyDown={(e) => e.key === "Enter" && submit()} />
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del jugador" className="h-8"
              onKeyDown={(e) => e.key === "Enter" && submit()} />
            <Button size="sm" className="h-8" onClick={submit} disabled={addJugador.isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}