import React from "react";
import { CalendarDays, MapPin, AlertTriangle, Dumbbell, Trophy } from "lucide-react";

// Bloque "Mi Semana" que se renderiza DENTRO del AlertCenter, encima de las alertas.
// Recibe la agenda ya calculada (items + conflicts). Si no hay nada, no renderiza nada.
export default function MiSemanaSection({ items = [], conflicts = [] }) {
  if ((!items || items.length === 0) && (!conflicts || conflicts.length === 0)) {
    return null;
  }

  return (
    <div className="mb-3 pb-3 border-b border-orange-200">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="w-4 h-4 text-orange-600" />
        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Mi semana</p>
      </div>

      {/* Avisos de choques entre hermanos */}
      {conflicts.length > 0 && (
        <div className="space-y-1 mb-2">
          {conflicts.map((c, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-snug">{c.texto}</p>
            </div>
          ))}
        </div>
      )}

      {/* Agenda cronológica */}
      <div className="space-y-1.5">
        {items.map((it, i) => {
          const esPartido = it.tipo === "partido" || it.tipo === "evento";
          const Icon = esPartido ? Trophy : Dumbbell;
          const iconColor = esPartido ? "bg-blue-500" : "bg-green-500";
          return (
            <div key={i} className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  <span className="capitalize">{it.diaLabel}</span>
                  {it.hora ? ` · ${it.hora}` : ""} · {it.titulo}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="truncate">{it.subtitulo}</span>
                  {it.horaConcentracion && <span>· Concentración {it.horaConcentracion}</span>}
                  {it.ubicacion && (
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3" /> {it.ubicacion}
                    </span>
                  )}
                </div>
                {it.jugadores?.length > 0 && (
                  <p className="text-[10px] text-slate-400 truncate">{it.jugadores.join(", ")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}