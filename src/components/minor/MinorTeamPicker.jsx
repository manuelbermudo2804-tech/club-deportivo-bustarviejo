import React from "react";

// Selector de equipo para el entrenador en prácticas que apoya a varios equipos.
// Si solo entrena a uno, no se muestra nada.
export default function MinorTeamPicker({ equipos = [], value, onChange }) {
  if (!equipos || equipos.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {equipos.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            c === value
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          {c.replace("Fútbol ", "").replace(" (Mixto)", "")}
        </button>
      ))}
    </div>
  );
}