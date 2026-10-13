import React from "react";

const TONES = {
  slate: "bg-slate-100 text-slate-600",
  green: "bg-green-100 text-green-600",
  red: "bg-red-100 text-red-600",
  blue: "bg-blue-100 text-blue-600",
  cyan: "bg-cyan-100 text-cyan-600",
};

export default function DiagMetric({ icon: Icon, label, value, tone = "slate" }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TONES[tone]}`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-slate-900 tabular-nums leading-tight">{value}</div>
        <div className="text-xs text-slate-500 truncate">{label}</div>
      </div>
    </div>
  );
}