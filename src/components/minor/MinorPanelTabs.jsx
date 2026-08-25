import React from "react";

const TABS = [
  { key: "jugador", emoji: "⚽", label: "Jugador" },
  { key: "entrenador", emoji: "🧢", label: "Entrenador" },
];

export default function MinorPanelTabs({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-2xl sticky top-0 z-30">
      {TABS.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`h-11 rounded-xl text-sm font-bold transition-colors ${
              active ? "bg-white text-slate-900 shadow" : "text-slate-500"
            }`}
          >
            <span className="mr-1.5">{t.emoji}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}