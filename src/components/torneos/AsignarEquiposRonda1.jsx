import React from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SeedBadge } from "./PartidoResultRow";

// Editor de la PRIMERA RONDA de un cuadro eliminatorio (estilo Mundial):
// para cada partido, el admin elige manualmente qué equipo juega de local
// y cuál de visitante desde un desplegable (ej: 1º vs 16º, 2º vs 15º…).
// Solo se muestra en partidos aún no finalizados de la ronda inicial.
//
// props:
//  - partidos: partidos de la primera ronda (ya ordenados)
//  - equiposCat: equipos de la categoría (para el desplegable)
//  - seedPorEquipo: mapa equipo_id → posición (semilla) para el badge
//  - onAsignar(partido, patch): guarda el equipo elegido en el partido
export default function AsignarEquiposRonda1({ partidos, equiposCat, seedPorEquipo = {}, onAsignar }) {
  if (!partidos || partidos.length === 0) return null;

  // Equipos ya asignados en OTROS partidos de esta ronda (para no repetir)
  const asignadosEnRonda = new Set();
  partidos.forEach((p) => {
    if (p.equipo_local_id) asignadosEnRonda.add(p.equipo_local_id);
    if (p.equipo_visitante_id) asignadosEnRonda.add(p.equipo_visitante_id);
  });

  const setEquipo = (partido, lado, equipoId) => {
    const eq = equiposCat.find((e) => e.id === equipoId);
    const campo = lado === "local"
      ? { equipo_local_id: equipoId, equipo_local_placeholder: eq?.nombre || "" }
      : { equipo_visitante_id: equipoId, equipo_visitante_placeholder: eq?.nombre || "" };
    onAsignar(partido, campo);
  };

  const opcionesPara = (partido, ladoActual) => {
    // El propio seleccionado del lado + todos los libres (no usados en la ronda)
    const actual = ladoActual === "local" ? partido.equipo_local_id : partido.equipo_visitante_id;
    const otroDelPartido = ladoActual === "local" ? partido.equipo_visitante_id : partido.equipo_local_id;
    return equiposCat
      .filter((e) => e.id === actual || (!asignadosEnRonda.has(e.id) && e.id !== otroDelPartido))
      .sort((a, b) => {
        const pa = Number(seedPorEquipo[a.id]) || 999;
        const pb = Number(seedPorEquipo[b.id]) || 999;
        return pa - pb;
      });
  };

  const Selector = ({ partido, lado }) => {
    const actual = lado === "local" ? partido.equipo_local_id : partido.equipo_visitante_id;
    return (
      <div className="flex items-center gap-1.5">
        <SeedBadge pos={seedPorEquipo[actual]} />
        <Select value={actual || ""} onValueChange={(v) => setEquipo(partido, lado, v)}>
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue placeholder="Elegir equipo…" />
          </SelectTrigger>
          <SelectContent>
            {opcionesPara(partido, lado).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {seedPorEquipo[e.id] ? `${seedPorEquipo[e.id]}º · ` : ""}{e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-900">
        ✏️ Asigna manualmente los cruces de la primera ronda
      </p>
      <div className="space-y-2">
        {partidos.map((p, idx) => (
          <div key={p.id} className="bg-white rounded-lg border p-2 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400">Partido {idx + 1}</p>
            <Selector partido={p} lado="local" />
            <div className="text-center text-[10px] text-slate-300 font-bold">VS</div>
            <Selector partido={p} lado="visitante" />
          </div>
        ))}
      </div>
    </div>
  );
}