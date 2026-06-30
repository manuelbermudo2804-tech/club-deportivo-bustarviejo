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
    <div className={`rounded-xl border bg-white p-4 ${n.ring}`}>
      <div className="flex items-start gap-3">
        {jugador.foto_url ? (
          <img src={jugador.foto_url} alt={jugador.nombre} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-slate-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-slate-800 truncate m-0">{jugador.nombre}</p>
            <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 flex-shrink-0 ${n.chip}`}>
              {jugador.riesgo}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{jugador.categoria}</p>

          {/* Barra de riesgo */}
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className={`h-full ${n.bar}`} style={{ width: `${jugador.riesgo}%` }} />
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
          <div className="flex flex-wrap gap-2 mt-3">
            {jugador.telefono && (
              <a href={`tel:${jugador.telefono}`} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
                <Phone className="w-3.5 h-3.5" /> {jugador.telefono}
              </a>
            )}
            {jugador.email_padre && (
              <a href={`mailto:${jugador.email_padre}`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2.5 py-1 max-w-full truncate">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{jugador.email_padre}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}