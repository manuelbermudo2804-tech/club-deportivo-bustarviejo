import React from "react";
import { Calendar, MapPin } from "lucide-react";

const ICONO = { entreno: "🏃", partido: "⚽", evento: "📅" };
const AMBITO = {
  familia: { label: "👨‍👩‍👧", clase: "bg-green-500/15 text-green-300" },
  equipo: { label: "🧢", clase: "bg-blue-500/15 text-blue-300" },
};

export default function PanelAgenda({ items = [] }) {
  return (
    <div className="bg-slate-800/60 border-2 border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-orange-400" />
        <h2 className="text-white font-bold text-sm uppercase tracking-wide">Esta semana</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-400 text-sm">No hay entrenamientos ni partidos esta semana.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => {
            const amb = AMBITO[it.ambito] || AMBITO.familia;
            return (
              <div key={i} className="flex items-start gap-3 bg-slate-900/50 rounded-xl p-3">
                <span className="text-lg leading-none mt-0.5">{ICONO[it.tipo] || "📅"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${amb.clase}`}>{amb.label}</span>
                    <p className="text-white font-semibold text-sm truncate">{it.titulo}</p>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {it.diaLabel || it.fecha.toLocaleDateString("es-ES", { weekday: "long" })}
                    {it.hora ? ` · ${it.hora}` : ""} · {it.subtitulo}
                  </p>
                  {it.jugadores?.length > 0 && (
                    <p className="text-slate-500 text-xs">{it.jugadores.join(", ")}</p>
                  )}
                  {it.ubicacion && (
                    <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {it.ubicacion}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}