import React from "react";

const getScoreColor = (score) => {
  if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Excelente' };
  if (score >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-400', label: 'Aceptable' };
  if (score >= 40) return { bg: 'bg-orange-500', text: 'text-orange-400', label: 'Necesita atención' };
  return { bg: 'bg-red-500', text: 'text-red-400', label: 'Crítico' };
};

export default function DiagnosticHealthBar({ score, summary, timestamp }) {
  const color = getScoreColor(score);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider">Puntuación de salud</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black ${color.text}`}>{score}</span>
            <span className="text-slate-500 text-lg">/100</span>
            <span className={`text-sm font-semibold ${color.text} ml-2`}>{color.label}</span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>{new Date(timestamp).toLocaleString('es-ES')}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-red-400">🔴 {summary.critical} críticos</span>
            <span className="text-orange-400">🟠 {summary.high} altos</span>
            <span className="text-yellow-400">🟡 {summary.medium} medios</span>
            <span className="text-emerald-400">🟢 {summary.low} info</span>
          </div>
        </div>
      </div>
      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color.bg} rounded-full transition-all duration-1000`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}