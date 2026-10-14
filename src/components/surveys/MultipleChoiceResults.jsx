import React from "react";

export default function MultipleChoiceResults({ question, index, responses }) {
  const answers = responses.map(r => String(r.respuestas?.[index]?.respuesta || "").trim()).filter(Boolean);
  const total = answers.length;
  const options = [...(question.opciones || [])];
  answers.forEach(a => { if (!options.includes(a)) options.push(a); });
  const rows = options
    .map(op => ({ op, count: answers.filter(a => a === op).length }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-600">{total} voto(s)</p>
      {rows.map(({ op, count }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={op}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-700">{op}</span>
              <span className="font-semibold text-slate-900">{count} · {pct}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}