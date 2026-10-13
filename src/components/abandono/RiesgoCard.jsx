import React from "react";
import { Mail, Phone, AlertTriangle } from "lucide-react";

const NIVEL = {
  alto: { label: "Riesgo alto", chip: "bg-red-100 text-red-700", bar: "bg-red-500", ring: "border-red-200" },
  medio: { label: "Riesgo medio", chip: "bg-amber-100 text-amber-700", bar: "bg-amber-500", ring: "border-amber-200" },
  bajo: { label: "Riesgo bajo", chip: "bg-slate-100 text-slate-600", bar: "bg-slate-400", ring: "border-slate-200" },
};

export default function RiesgoCard({ jugador }) {
  const n = NIVEL[jugador.nivel] || NIVEL.bajo;
  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${n.ring}`}>
      <div className="flex min-w-0 items-start gap-3">
        {jugador.foto_url ? (
          <img src={jugador.foto_url} alt={jugador.nombre} className="h-12 w-12 shrink-0 rounded-2xl object-cover sm:h-14 sm:w-14" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 sm:h-14 sm:w-14">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-slate-800 truncate m-0">{jugador.nombre}</p>
            <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${n.chip}`}>
              {jugador.riesgo}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{jugador.categoria}</p>

          {/* Barra de riesgo */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all ${n.bar}`} style={{ width: `${jugador.riesgo}%` }} />
          </div>

          {/* Motivos */}
          <ul className="mt-2 space-y-1">
            {jugador.motivos.map((m, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>

          {/* Contacto */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {jugador.telefono && (
              <a href={`tel:${jugador.telefono}`} className="inline-flex max-w-full items-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                <Phone className="w-3.5 h-3.5" /> {jugador.telefono}
              </a>
            )}
            {jugador.email_padre && (
              <a href={`mailto:${jugador.email_padre}`} className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{jugador.email_padre}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}