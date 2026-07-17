import React, { useMemo } from "react";
import { Clock, MapPin, PlayCircle } from "lucide-react";
import { enriquecerPartidos, faseLabel, horaCorta } from "@/lib/torneoPartidos";

// Mini-fila de un partido dentro de un campo
function Enfrentamiento({ p, tono }) {
  return (
    <div className={`rounded-lg p-2.5 ${tono === "ahora" ? "bg-amber-500/15 border border-amber-500/40" : "bg-white border"}`}>
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
        <span className="font-semibold">{faseLabel(p)}</span>
        {horaCorta(p.fecha_hora) && (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{horaCorta(p.fecha_hora)}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex-1 text-right text-slate-800 truncate">{p.local_nombre}</span>
        <span className="text-slate-400 font-bold text-xs">vs</span>
        <span className="flex-1 text-left text-slate-800 truncate">{p.visitante_nombre}</span>
      </div>
    </div>
  );
}

export default function OrdenDeJuego({ equipos, partidos, grupos }) {
  const enriquecidos = useMemo(() => enriquecerPartidos(partidos, equipos, grupos), [partidos, equipos, grupos]);

  // Solo partidos con campo/sede asignado y aún no finalizados, agrupados por campo
  const porCampo = useMemo(() => {
    const pendientes = enriquecidos
      .filter((p) => !p.finalizado && (p.campo || p.sede_nombre))
      .sort((a, b) => new Date(a.fecha_hora || 0) - new Date(b.fecha_hora || 0));

    const grupos = {};
    pendientes.forEach((p) => {
      const key = [p.sede_nombre, p.campo].filter(Boolean).join(" · ") || "Sin campo";
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(p);
    });
    return Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0]));
  }, [enriquecidos]);

  if (porCampo.length === 0) {
    return <p className="text-center text-slate-400 py-8 text-sm">No hay partidos programados con campo asignado.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {porCampo.map(([campo, lista]) => {
        const ahora = lista[0];
        const siguientes = lista.slice(1, 4);
        return (
          <div key={campo} className="bg-white rounded-xl border p-3 space-y-2">
            <p className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
              <MapPin className="w-4 h-4 text-amber-500" /> {campo}
            </p>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-bold text-amber-600 mb-1">
                <PlayCircle className="w-3.5 h-3.5" /> AHORA
              </p>
              <Enfrentamiento p={ahora} tono="ahora" />
            </div>
            {siguientes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400">A CONTINUACIÓN</p>
                {siguientes.map((p) => <Enfrentamiento key={p.id} p={p} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}