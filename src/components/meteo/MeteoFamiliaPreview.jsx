import React from "react";
import { DECISION_LABELS } from "@/lib/meteoRules";

// Lo que ve exactamente una familia: sin datos meteorológicos, solo lo práctico.
export default function MeteoFamiliaPreview({ item, horaLimite = "16:30" }) {
  if (!item) return null;

  const d = item.decision;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">⚽ {item.categoria} · Hoy {item.hora_inicio}</p>
      {d ? (
        <>
          <p className="font-bold text-slate-900 mt-1">{DECISION_LABELS[d.decision]}</p>
          {d.decision === "semicubierto" && (
            <p className="text-sm text-slate-600">Misma hora, en {d.ubicacion_alternativa || "la instalación semicubierta"}.</p>
          )}
          {d.decision === "aplazar" && d.nueva_hora && (
            <p className="text-sm text-slate-600">Nueva hora: {d.nueva_hora}.</p>
          )}
          {d.mensaje_aviso && <p className="text-sm text-slate-700 mt-1">{d.mensaje_aviso}</p>}
          {d.motivo && <p className="text-sm text-slate-600 mt-1">{d.motivo}</p>}
        </>
      ) : item.nivel === "verde" ? (
        <p className="font-bold text-slate-900 mt-1">✅ Entrenamiento normal</p>
      ) : (
        <>
          <p className="font-bold text-slate-900 mt-1">🌦️ Posible cambio por el tiempo</p>
          <p className="text-sm text-slate-600">El club avisará antes de las {horaLimite}.</p>
        </>
      )}
    </div>
  );
}