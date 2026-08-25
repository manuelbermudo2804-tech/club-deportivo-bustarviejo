import React from "react";

export const ESTADOS = [
  { id: "pendiente", label: "Sin revisar" },
  { id: "guardado", label: "Guardados" },
  { id: "publicado", label: "Publicados" },
  { id: "descartado", label: "Descartados" },
];

export default function EstadoTabs({ value, onChange, counts = {} }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {ESTADOS.map((e) => {
        const activo = value === e.id;
        return (
          <button
            key={e.id}
            onClick={() => onChange(e.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${
              activo
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {e.label}
            {counts[e.id] > 0 && (
              <span className={`ml-1.5 ${activo ? "text-slate-300" : "text-slate-400"}`}>{counts[e.id]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}