import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { TEMAS_FESTIVOS } from "./temasFestivos";

// Modo prueba: el admin ve la decoración solo en su dispositivo, sin activarla para nadie más.
export default function PruebaFestivaAdmin() {
  const actual = new URLSearchParams(window.location.search).get("epoca") || localStorage.getItem("tema_festivo_prueba");

  const probar = (clave) => {
    if (clave) {
      localStorage.setItem("tema_festivo_prueba", clave);
      // El parámetro de URL hace la prueba más fiable en móviles/PWA.
      window.location.href = `/?epoca=${encodeURIComponent(clave)}`;
      return;
    }
    localStorage.removeItem("tema_festivo_prueba");
    window.location.href = "/";
  };

  return (
    <div className="rounded-xl bg-white border border-violet-100 p-3 space-y-2">
      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <Eye className="w-4 h-4 text-violet-600" /> Probar solo en mi pantalla
      </p>
      <p className="text-xs text-slate-500">Solo se muestra en este dispositivo. La prueba no activa nada para el resto del club.</p>
      <p className="text-[11px] text-violet-700 bg-violet-50 rounded-lg px-2.5 py-2">En móvil, abre la app con tu sesión iniciada y pulsa aquí. Si no carga, usa «Quitar prueba» y vuelve a elegir el tema.</p>
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