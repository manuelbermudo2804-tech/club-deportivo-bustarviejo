import React from "react";
import { Button } from "@/components/ui/button";
import { Wind, CloudRain, Thermometer, MapPin } from "lucide-react";
import { NIVEL_STYLES, DECISION_LABELS } from "@/lib/meteoRules";

export default function MeteoEntrenoCard({ item, onDecidir, readOnly = false }) {
  const s = NIVEL_STYLES[item.nivel] || NIVEL_STYLES.verde;
  const m = item.meteo || {};

  return (
    <div className={`group relative overflow-hidden rounded-[24px] border bg-white p-4 shadow-[0_8px_28px_-20px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${s.card}`}>
      <div className="absolute inset-y-0 left-0 w-1.5 bg-current opacity-35" />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <p className="text-base font-extrabold tracking-tight text-slate-900">{item.categoria}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {item.hora_inicio} – {item.hora_fin}
            {item.ubicacion && <span className="inline-flex items-center gap-1 ml-2"><MapPin className="w-3 h-3" />{item.ubicacion}</span>}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-3xl shadow-sm drop-shadow-sm">{s.emoji}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <span className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"><Wind className="h-4 w-4 shrink-0 text-sky-600" /><span><strong className="block text-slate-800">{Math.round(m.viento || 0)} km/h</strong><small className="text-[11px] text-slate-500">Viento</small></span></span>
        <span className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"><Wind className="h-4 w-4 shrink-0 text-indigo-500" /><span><strong className="block text-slate-800">{Math.round(m.rachas || 0)} km/h</strong><small className="text-[11px] text-slate-500">Rachas</small></span></span>
        <span className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"><CloudRain className="h-4 w-4 shrink-0 text-blue-600" /><span><strong className="block text-slate-800">{Math.round(m.lluvia || 0)}%</strong><small className="text-[11px] text-slate-500">Lluvia</small></span></span>
        <span className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"><Thermometer className="h-4 w-4 shrink-0 text-orange-600" /><span><strong className="block text-slate-800">{Math.round(m.temperatura || 0)}°</strong><small className="text-[11px] text-slate-500">Temperatura</small></span></span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner shadow-slate-100/70">
        <p className={`text-sm font-bold tracking-tight ${s.text}`}>{item.recomendacion}</p>
        {item.motivos?.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-slate-600">
            {item.motivos.map((mo, i) => <li key={i}>{mo}</li>)}
          </ul>
        )}
      </div>

      {item.decision ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <p className="font-semibold text-slate-900">{DECISION_LABELS[item.decision.decision]}</p>
            {item.decision.motivo && <p className="text-sm text-slate-600">{item.decision.motivo}</p>}
            <p className="text-xs text-slate-500 mt-0.5">Decidido por {item.decision.decidido_por_nombre || "—"}</p>
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => onDecidir(item)}>Cambiar</Button>
          )}
        </div>
      ) : (
        !readOnly && (
          <Button className="mt-4 h-11 w-full rounded-xl bg-slate-900 font-bold tracking-wide shadow-md shadow-slate-900/10 transition-all hover:bg-orange-600" onClick={() => onDecidir(item)}>DECIDIR</Button>
        )
      )}
    </div>
  );
}