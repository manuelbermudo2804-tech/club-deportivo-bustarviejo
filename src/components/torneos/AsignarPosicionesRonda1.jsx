import React from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Editor de cruces de la PRIMERA RONDA cuando el cuadro está EN BLANCO
// (generado por posiciones, sin equipos reales todavía).
//
// En vez de elegir equipos, el admin elige QUÉ POSICIÓN de la clasificación
// se enfrenta a cuál (ej: 1º vs 12º en lugar del 1º vs 16º por defecto).
// Como todas las posiciones vienen repartidas entre los partidos, elegir una
// posición que ya está en otro sitio hace un INTERCAMBIO (swap): la posición
// que ese hueco tenía antes se le pasa al hueco de donde venía la elegida.
// Así las N posiciones siempre están repartidas y se pueden reorganizar libremente.
//
// props:
//  - partidos: partidos en blanco de la primera ronda (con equipo_*_pos)
//  - onAsignar(partido, patch): guarda la posición elegida y su placeholder
//  - onSwap([{partido, patch}, ...]): aplica varios patches a la vez (intercambio)
export default function AsignarPosicionesRonda1({ partidos, onAsignar, onSwap }) {
  if (!partidos || partidos.length === 0) return null;

  // Todas las posiciones que participan en esta fase.
  const posiciones = [];
  partidos.forEach((p) => {
    if (p.equipo_local_pos != null) posiciones.push(p.equipo_local_pos);
    if (p.equipo_visitante_pos != null) posiciones.push(p.equipo_visitante_pos);
  });
  const posicionesUnicas = Array.from(new Set(posiciones)).sort((a, b) => a - b);

  const patchLado = (lado, pos) =>
    lado === "local"
      ? { equipo_local_pos: pos, equipo_local_placeholder: `${pos}º clasificado` }
      : { equipo_visitante_pos: pos, equipo_visitante_placeholder: `${pos}º clasificado` };

  // Localiza dónde está actualmente una posición (partido + lado).
  const localizar = (pos) => {
    for (const p of partidos) {
      if (p.equipo_local_pos === pos) return { partido: p, lado: "local" };
      if (p.equipo_visitante_pos === pos) return { partido: p, lado: "visitante" };
    }
    return null;
  };

  const elegir = (partido, lado, posStr) => {
    const nueva = Number(posStr);
    const actual = lado === "local" ? partido.equipo_local_pos : partido.equipo_visitante_pos;
    if (nueva === actual) return;

    const origen = localizar(nueva); // dónde estaba la posición que acabo de elegir
    // Si la posición elegida ya estaba en otro hueco → intercambiar.
    if (origen && !(origen.partido.id === partido.id && origen.lado === lado)) {
      const patches = [
        { partido, patch: patchLado(lado, nueva) },
        { partido: origen.partido, patch: patchLado(origen.lado, actual) },
      ];
      if (onSwap) onSwap(patches);
      else patches.forEach((x) => onAsignar(x.partido, x.patch));
    } else {
      onAsignar(partido, patchLado(lado, nueva));
    }
  };

  const Selector = ({ partido, lado }) => {
    const actual = lado === "local" ? partido.equipo_local_pos : partido.equipo_visitante_pos;
    return (
      <Select value={actual != null ? String(actual) : ""} onValueChange={(v) => elegir(partido, lado, v)}>
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
        Elige qué clasificado se enfrenta a cuál (ej: 1º vs 12º). Si eliges una posición que ya estaba en otro cruce, se intercambian automáticamente.
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