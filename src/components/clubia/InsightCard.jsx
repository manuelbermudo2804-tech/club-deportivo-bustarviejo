import React from "react";
import { ArrowRight } from "lucide-react";

const URGENCIA_STYLE = {
  alta: { dot: "bg-red-500", label: "Urgente", chip: "bg-red-100 text-red-700" },
  media: { dot: "bg-amber-500", label: "Importante", chip: "bg-amber-100 text-amber-700" },
  baja: { dot: "bg-slate-400", label: "Observación", chip: "bg-slate-100 text-slate-600" },
};

export default function InsightCard({ insight }) {
  const u = URGENCIA_STYLE[insight.urgencia] || URGENCIA_STYLE.baja;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${u.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${u.chip}`}>
              {u.label}
            </span>
          </div>
          <p className="text-slate-800 font-medium leading-snug">{insight.texto}</p>
          {insight.accion && (
            <div className="flex items-start gap-1.5 mt-2 text-sm text-slate-500">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
              <span>{insight.accion}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}