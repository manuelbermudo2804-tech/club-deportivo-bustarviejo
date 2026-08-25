import React from "react";
import { CONTENT_TYPES, GROUPS } from "./contentTypes";

// Quita emojis del título para mostrarlo limpio (el icono ya es el signo visual)
const limpiar = (t) => t.replace(/[^\p{L}\p{N}\s/·-]/gu, "").trim();

export default function ContentTypeGrid({ onSelect, search = "" }) {
  const q = search.trim().toLowerCase();
  const filtrar = (items) =>
    q ? items.filter((t) => limpiar(t.title).toLowerCase().includes(q) || t.id.includes(q)) : items;

  const gruposVisibles = GROUPS.map((g) => ({
    ...g,
    items: filtrar(CONTENT_TYPES.filter((t) => t.group === g.id)),
  })).filter((g) => g.items.length > 0);

  if (!gruposVisibles.length) {
    return <p className="text-slate-500 text-sm text-center py-6">Nada coincide con esa búsqueda.</p>;
  }

  return (
    <div className="space-y-4">
      {gruposVisibles.map((group) => (
        <div key={group.id}>
          <p className={`text-xs font-bold mb-2 ${group.color}`}>{group.label}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.items.map((type) => (
              <button
                key={type.id}
                onClick={() => onSelect(type.id)}
                className="flex items-center gap-2.5 bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500 rounded-xl px-3 py-2.5 text-left transition-all active:scale-95"
              >
                <span
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${type.gradient} flex items-center justify-center flex-shrink-0`}
                >
                  <type.icon className="w-4 h-4 text-white" />
                </span>
                <p className="font-semibold text-xs text-slate-100 leading-tight">{limpiar(type.title)}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}