import React from "react";

// Filtros grandes para la hora de salida: separa a quien sale solo de quien hay que verificar
export default function CampusSalidaFiltros({ value, onChange, counts }) {
  const OPCIONES = [
    ["recogen", "🔒 Verificar recogida", "Pedir nombre y DNI", counts.recogen, "border-orange-500 bg-orange-600 text-white", "border-orange-200 bg-orange-50 text-orange-900"],
    ["salido", "✓ Ya han salido", "Entregados hoy", counts.salido, "border-slate-700 bg-slate-800 text-white", "border-slate-200 bg-slate-50 text-slate-700"],
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {OPCIONES.map(([k, l, sub, n, on, off]) => (
        <button key={k} onClick={() => onChange(k)} className={"rounded-xl border-2 p-2 text-left " + (value === k ? on : off)}>
          <p className="text-2xl font-black leading-none">{n}</p>
          <p className="mt-1 text-xs font-black sm:text-sm">{l}</p>
          <p className="hidden text-[11px] opacity-80 sm:block">{sub}</p>
        </button>
      ))}
    </div>
  );
}