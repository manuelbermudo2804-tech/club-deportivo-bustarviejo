import React from "react";

const LABELS = {
  coordinador: { emoji: "🎓", label: "Coordinación" },
  entrenador: { emoji: "🧢", label: "Entrenador" },
  familia: { emoji: "👨‍👩‍👧", label: "Familia" },
};

export default function RolePanelTabs({ tabs = [], value, onChange }) {
  if (tabs.length < 2) return null;

  return (
    <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur px-3 py-2 border-b border-slate-700">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((key) => {
          const t = LABELS[key] || { emoji: "•", label: key };
          const active = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex-1 min-w-[110px] h-11 px-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                active
                  ? "bg-white text-slate-900 shadow"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              <span className="mr-1.5">{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}