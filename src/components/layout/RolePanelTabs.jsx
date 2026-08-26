import React from "react";
import { getPanelDef } from "@/hooks/useRolePanel";

/**
 * Barra de pestañas para cambiar de panel cuando una persona tiene varios roles
 * (por ejemplo coordinador + entrenador + familia). No se muestra si solo tiene uno.
 */
export default function RolePanelTabs({ panels = [], value, onChange, dots = {} }) {
  if (!panels || panels.length < 2) return null;

  return (
    <div className="bg-slate-800/80 p-1 rounded-2xl border border-slate-700 flex gap-1 overflow-x-auto">
      {panels.map((key) => {
        const def = getPanelDef(key);
        if (!def) return null;
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`relative flex-1 min-w-[92px] h-11 px-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              active ? "bg-white text-slate-900 shadow" : "text-slate-300 hover:text-white"
            }`}
          >
            <span className="mr-1.5">{def.emoji}</span>
            {def.label}
            {!active && dots[key] > 0 && (
              <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}