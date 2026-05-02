import React from "react";
import { TONOS } from "./contentTypes";

export default function ToneSelector({ value, onChange }) {
  return (
    <div className="bg-slate-800/80 rounded-2xl p-3">
      <p className="text-slate-400 text-xs font-bold mb-2">🎨 Tono</p>
      <div className="grid grid-cols-2 gap-2">
        {TONOS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`text-left rounded-xl px-3 py-2 transition-all border ${
              value === t.id
                ? "bg-gradient-to-br from-sky-600 to-blue-700 border-sky-400 shadow-lg scale-[1.02]"
                : "bg-slate-900/60 border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="font-bold text-white text-sm">{t.label}</div>
            <div className="text-[11px] text-slate-300 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}