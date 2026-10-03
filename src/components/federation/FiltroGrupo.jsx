import React from "react";

// Bloque de filtros con título e icono; los botones bajan de línea en el móvil
export default function FiltroGrupo({ icon: Icon, titulo, color, opciones, value, onChange }) {
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-2 flex items-center gap-1.5">
        <Icon className="w-4 h-4" /> {titulo}
      </p>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`text-xs font-medium px-3 py-2 rounded-lg border text-left sm:text-center flex items-center justify-between sm:justify-center gap-2 ${value === o.value ? o.on : "bg-white text-slate-700 border-slate-200"}`}
          >
            <span className="truncate">{o.label}</span>
            <span className="font-bold opacity-80">{o.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}