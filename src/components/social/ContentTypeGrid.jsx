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
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">{group.label}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.items.map((type) => (
              <button
                key={type.id}
                onClick={() => onSelect(type.id)}
                className="flex min-h-[68px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 ring-1 ring-orange-100"
                >
                  <type.icon className="h-4 w-4 text-orange-700" />
                </span>
                <p className="text-xs font-semibold leading-tight text-slate-800">{limpiar(type.title)}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}