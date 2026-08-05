import React from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Editor de cruces de la PRIMERA RONDA cuando el cuadro está EN BLANCO
// (generado por posiciones, sin equipos reales todavía).
//
// En vez de elegir equipos, el admin elige QUÉ POSICIÓN de la clasificación
// se enfrenta a cuál (ej: 1º vs 12º en lugar del 1º vs 16º por defecto).
// Así el público ve los cruces reales, la sede y la hora aunque no se sepa
// qué equipo caerá en cada posición.
//
// props:
//  - partidos: partidos en blanco de la primera ronda (con equipo_*_pos)
//  - onAsignar(partido, patch): guarda la posición elegida y su placeholder
export default function AsignarPosicionesRonda1({ partidos, onAsignar }) {
  if (!partidos || partidos.length === 0) return null;

  // Todas las posiciones que participan en esta fase (las que están repartidas
  // entre todos los partidos de la ronda). Se muestran completas en cada desplegable
  // para que el admin pueda emparejar cualquier posición con cualquier otra.
  const posiciones = [];
  partidos.forEach((p) => {
    if (p.equipo_local_pos != null) posiciones.push(p.equipo_local_pos);
    if (p.equipo_visitante_pos != null) posiciones.push(p.equipo_visitante_pos);
  });
  const posicionesUnicas = Array.from(new Set(posiciones)).sort((a, b) => a - b);

  const setPos = (partido, lado, pos) => {
    const n = Number(pos);
    const campo = lado === "local"
      ? { equipo_local_pos: n, equipo_local_placeholder: `${n}º clasificado` }
      : { equipo_visitante_pos: n, equipo_visitante_placeholder: `${n}º clasificado` };
    onAsignar(partido, campo);
  };

  const Selector = ({ partido, lado }) => {
    const actual = lado === "local" ? partido.equipo_local_pos : partido.equipo_visitante_pos;
    return (
      <Select value={actual != null ? String(actual) : ""} onValueChange={(v) => setPos(partido, lado, v)}>
        <SelectTrigger className="h-8 text-sm flex-1">
          <SelectValue placeholder="Elegir posición…" />
        </SelectTrigger>
        <SelectContent>
          {posicionesUnicas.map((pos) => (
            <SelectItem key={pos} value={String(pos)}>{pos}º clasificado</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-blue-900">
        🔀 Cambia los cruces por posición (cuadro en blanco)
      </p>
      <p className="text-[11px] text-blue-800/80 -mt-1">
        Elige qué clasificado se enfrenta a cuál (ej: 1º vs 12º). El público lo verá al instante, aunque aún no se sepa el equipo.
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