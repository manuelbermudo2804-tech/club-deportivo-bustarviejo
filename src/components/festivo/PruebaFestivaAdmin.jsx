import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { TEMAS_FESTIVOS } from "./temasFestivos";

// Modo prueba: el admin ve la decoración solo en su dispositivo, sin activarla para nadie más.
export default function PruebaFestivaAdmin() {
  const actual = localStorage.getItem("tema_festivo_prueba");

  const probar = (clave) => {
    if (clave) localStorage.setItem("tema_festivo_prueba", clave);
    else localStorage.removeItem("tema_festivo_prueba");
    window.location.href = "/";
  };

  return (
    <div className="rounded-xl bg-white border border-violet-100 p-3 space-y-2">
      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <Eye className="w-4 h-4 text-violet-600" /> Probar solo en mi pantalla
      </p>
      <p className="text-xs text-slate-500">Nadie más lo verá. Ideal para ver cómo queda antes de activarlo.</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TEMAS_FESTIVOS).map(([clave, t]) => (
          <button
            key={clave}
            onClick={() => probar(clave)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${actual === clave ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200 hover:border-violet-400"}`}
          >
            {t.emoji} {t.nombre}
          </button>
        ))}
        {actual && (
          <button onClick={() => probar(null)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
            <EyeOff className="w-3.5 h-3.5" /> Quitar prueba
          </button>
        )}
      </div>
    </div>
  );
}