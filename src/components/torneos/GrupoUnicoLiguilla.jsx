import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import PartidoResultRow from "./PartidoResultRow";
import ClasificacionGeneral from "./ClasificacionGeneral";
import GoleadoresDialog from "./GoleadoresDialog";

// Liguilla de "grupo único": una sola tabla y partidos añadidos a mano
// (cada equipo juega N partidos definiendo rival, sede y hora manualmente).
export default function GrupoUnicoLiguilla({ torneo, categoria, equipos, partidos, jugadores = [], goles = [] }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });
  const [golPartido, setGolPartido] = useState(null);
  const [nuevoLocal, setNuevoLocal] = useState("");
  const [nuevoVisit, setNuevoVisit] = useState("");

  const equiposCat = equipos.filter((e) => e.categoria_id === categoria.id);
  const partidosCat = partidos
    .filter((p) => p.categoria_id === categoria.id && p.fase === "liguilla")
    .sort((a, b) => (a.fecha_hora || "\uffff").localeCompare(b.fecha_hora || "\uffff"));

  const crearPartido = useMutation({
    mutationFn: () => {
      if (!nuevoLocal || !nuevoVisit) throw new Error("Elige los dos equipos");
      if (nuevoLocal === nuevoVisit) throw new Error("No puede ser el mismo equipo");
      return base44.entities.TorneoPartido.create({
        torneo_id: torneo.id, categoria_id: categoria.id, fase: "liguilla",
        equipo_local_id: nuevoLocal, equipo_visitante_id: nuevoVisit, finalizado: false,
      });
    },
    onSuccess: () => { setNuevoLocal(""); setNuevoVisit(""); invalidate(); toast.success("Partido añadido"); },
    onError: (e) => toast.info(e.message),
  });

  const guardarResultado = useMutation({
    mutationFn: ({ partido, local, visit }) =>
      base44.entities.TorneoPartido.update(partido.id, {
        marcador_local: local, marcador_visitante: visit, finalizado: true,
      }),
    onSuccess: () => { invalidate(); toast.success("Resultado guardado"); },
    onError: () => toast.error("Error al guardar"),
  });

  const guardarUbicacion = useMutation({
    mutationFn: ({ partido, patch }) => base44.entities.TorneoPartido.update(partido.id, patch),
    onSuccess: () => { invalidate(); },
    onError: () => toast.error("Error al guardar campo/hora"),
  });

  const borrarPartido = useMutation({
    mutationFn: (id) => base44.entities.TorneoPartido.delete(id),
    onSuccess: () => { invalidate(); toast.success("Partido eliminado"); },
  });

  if (equiposCat.length < 2) {
    return <p className="text-center text-slate-400 text-sm py-6">Añade al menos 2 equipos en la pestaña Equipos.</p>;
  }

  const nombreEq = (id) => equiposCat.find((e) => e.id === id)?.nombre || "";

  return (
    <div className="space-y-5">
      <ClasificacionGeneral equipos={equiposCat} partidos={partidosCat} torneo={torneo} />

      {/* Añadir partido a mano */}
      <div className="bg-slate-50 border rounded-xl p-3 space-y-2">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Añadir partido
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={nuevoLocal} onValueChange={setNuevoLocal}>
            <SelectTrigger className="flex-1 min-w-[140px]"><SelectValue placeholder="Equipo local" /></SelectTrigger>
            <SelectContent>
              {equiposCat.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-slate-400">vs</span>
          <Select value={nuevoVisit} onValueChange={setNuevoVisit}>
            <SelectTrigger className="flex-1 min-w-[140px]"><SelectValue placeholder="Equipo visitante" /></SelectTrigger>
            <SelectContent>
              {equiposCat.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => crearPartido.mutate()} disabled={crearPartido.isPending}>Añadir</Button>
        </div>
        <p className="text-[11px] text-slate-400">La sede/campo y la hora se asignan en cada partido, abajo.</p>
      </div>

      {/* Partidos */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">
          Partidos <span className="text-slate-400 font-normal">({partidosCat.length})</span>
        </p>
        {partidosCat.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-6">Aún no hay partidos. Añade el primero arriba.</p>
        ) : (
          partidosCat.map((p) => (
            <div key={p.id} className="relative group">
              <PartidoResultRow
                partido={p}
                equipos={equiposCat}
                torneo={torneo}
                onSave={(partido, local, visit) => guardarResultado.mutate({ partido, local, visit })}
                onSaveUbicacion={(partido, patch) => guardarUbicacion.mutate({ partido, patch })}
                isSaving={guardarResultado.isPending}
                golesCount={goles.filter((g) => g.partido_id === p.id).reduce((s, g) => s + (g.goles || 1), 0)}
                onGoleadores={() => setGolPartido(p)}
              />
              {!p.finalizado && (
                <button
                  className="absolute -top-1.5 -right-1.5 bg-white border rounded-full w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm"
                  title="Eliminar partido"
                  onClick={() => { if (confirm(`¿Eliminar ${nombreEq(p.equipo_local_id)} vs ${nombreEq(p.equipo_visitante_id)}?`)) borrarPartido.mutate(p.id); }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {golPartido && (
        <GoleadoresDialog
          open={!!golPartido}
          onOpenChange={(v) => !v && setGolPartido(null)}
          partido={golPartido}
          eqLocal={equiposCat.find((e) => e.id === golPartido.equipo_local_id)}
          eqVisit={equiposCat.find((e) => e.id === golPartido.equipo_visitante_id)}
          jugadores={jugadores}
          golesExistentes={goles.filter((g) => g.partido_id === golPartido.id)}
          torneo={torneo}
          categoria={categoria}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}