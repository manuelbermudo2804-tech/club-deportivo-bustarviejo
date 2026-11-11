import React from "react";
import { Button } from "@/components/ui/button";
import { Wind, CloudRain, Thermometer, MapPin } from "lucide-react";
import { NIVEL_STYLES, DECISION_LABELS } from "@/lib/meteoRules";

export default function MeteoEntrenoCard({ item, onDecidir, readOnly = false }) {
  const s = NIVEL_STYLES[item.nivel] || NIVEL_STYLES.verde;
  const m = item.meteo || {};

  return (
    <div className={`rounded-2xl border p-4 ${s.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">{item.categoria}</p>
          <p className="text-sm text-slate-600">
            {item.hora_inicio} – {item.hora_fin}
            {item.ubicacion && <span className="inline-flex items-center gap-1 ml-2"><MapPin className="w-3 h-3" />{item.ubicacion}</span>}
          </p>
        </div>
        <span className="text-2xl">{s.emoji}</span>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-700">
        <span className="inline-flex items-center gap-1"><Wind className="w-4 h-4" />{Math.round(m.viento || 0)} km/h</span>
        <span className="text-slate-500">rachas {Math.round(m.rachas || 0)}</span>
        <span className="inline-flex items-center gap-1"><CloudRain className="w-4 h-4" />{Math.round(m.lluvia || 0)}%</span>
        <span className="inline-flex items-center gap-1"><Thermometer className="w-4 h-4" />{Math.round(m.temperatura || 0)}°</span>
      </div>

      <div className="mt-3 bg-white/70 rounded-xl p-3">
        <p className={`font-semibold ${s.text}`}>{item.recomendacion}</p>
        {item.motivos?.length > 0 && (
          <ul className="mt-1 text-sm text-slate-600 list-disc list-inside">
            {item.motivos.map((mo, i) => <li key={i}>{mo}</li>)}
          </ul>
        )}
      </div>

      {item.decision ? (
        <div className="mt-3 flex items-center justify-between gap-2">
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
          <Button className="w-full mt-3" onClick={() => onDecidir(item)}>DECIDIR</Button>
        )
      )}
    </div>
  );
}