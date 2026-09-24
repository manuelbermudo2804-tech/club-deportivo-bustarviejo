import React, { useState } from "react";
import { X } from "lucide-react";
import { EPOCAS, getEpocaActual } from "@/lib/seasonalTheme";

// Franja decorativa según la época (Navidad, Halloween, Carnaval...). Se cierra con la X hasta el año siguiente.
export default function SeasonalStrip() {
  const epoca = getEpocaActual();
  const key = epoca ? `seasonal_strip_${epoca}_${new Date().getFullYear()}` : null;
  const [hidden, setHidden] = useState(() => (key ? localStorage.getItem(key) === "1" : true));

  if (!epoca || hidden) return null;
  const e = EPOCAS[epoca];

  return (
    <div className={`bg-gradient-to-r ${e.clase} text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-semibold shadow-sm`}>
      <span className="text-lg">{e.emojis}</span>
      <span className="text-center">{e.texto}</span>
      <button
        onClick={() => { localStorage.setItem(key, "1"); setHidden(true); }}
        className="ml-2 p-1 rounded-full hover:bg-white/20 min-h-0 min-w-0"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}