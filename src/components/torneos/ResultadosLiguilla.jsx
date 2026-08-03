import React, { useMemo } from "react";
import { Clock, MapPin } from "lucide-react";
import { enriquecerPartidos, horaCorta } from "@/lib/torneoPartidos";

// Fila de un partido con su resultado (o "vs" si aún no se ha jugado)
function PartidoFila({ p }) {
  const jugado = p.finalizado && p.marcador_local != null && p.marcador_visitante != null;
  const ganaL = jugado && p.marcador_local > p.marcador_visitante;
  const ganaV = jugado && p.marcador_visitante > p.marcador_local;
  return (
    <div className="bg-white rounded-lg border p-2.5">
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
        <span className="flex items-center gap-1">
          {(p.sede_nombre || p.campo) && (
            <><MapPin className="w-3 h-3" />{[p.sede_nombre, p.campo].filter(Boolean).join(" · ")}</>
          )}
        </span>
        {horaCorta(p.fecha_hora) && (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{horaCorta(p.fecha_hora)}</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className={`flex-1 flex items-center justify-end gap-1.5 truncate ${ganaL ? "font-bold text-slate-900" : "text-slate-700"}`}>
          <span className="truncate">{p.local_nombre}</span>
          {p.local_escudo && <img src={p.local_escudo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />}
        </span>
        <span className="flex-shrink-0 min-w-[44px] text-center font-bold tabular-nums">
          {jugado ? `${p.marcador_local} - ${p.marcador_visitante}` : <span className="text-slate-400 font-normal">vs</span>}
        </span>
        <span className={`flex-1 flex items-center gap-1.5 truncate ${ganaV ? "font-bold text-slate-900" : "text-slate-700"}`}>
          {p.visitante_escudo && <img src={p.visitante_escudo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />}
          <span className="truncate">{p.visitante_nombre}</span>
        </span>
      </div>
    </div>
  );
}

// Lista completa de partidos de la liguilla (jugados con su resultado + pendientes),
// ordenados por fecha. Sirve para que el público vea todo lo que se ha jugado.
export default function ResultadosLiguilla({ equipos, partidos, grupos }) {
  const lista = useMemo(() => {
    const soloLiguilla = partidos.filter((p) => p.fase === "liguilla");
    return enriquecerPartidos(soloLiguilla, equipos, grupos).sort(
      (a, b) => new Date(a.fecha_hora || 0) - new Date(b.fecha_hora || 0)
    );
  }, [partidos, equipos, grupos]);

  if (lista.length === 0) {
    return <p className="text-center text-slate-400 py-8 text-sm">Todavía no hay partidos programados.</p>;
  }

  return (
    <div className="space-y-2">
      {lista.map((p) => <PartidoFila key={p.id} p={p} />)}
    </div>
  );
}