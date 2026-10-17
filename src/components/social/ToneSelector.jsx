import React from "react";
import { TONOS } from "./contentTypes";

export default function ToneSelector({ value, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-xs font-bold text-slate-700">🎨 Tono</p>
      <div className="grid grid-cols-2 gap-2">
        {TONOS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`text-left rounded-xl px-3 py-2 transition-all border ${
              value === t.id
                ? "border-orange-400 bg-orange-50 ring-1 ring-orange-100"
                : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50"
            }`}
          >
            <div className="text-sm font-bold text-slate-800">{t.label}</div>
            <div className="mt-0.5 text-[11px] text-slate-600">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}