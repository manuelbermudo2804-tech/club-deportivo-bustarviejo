import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// Indicador "EN VIVO" con punto rojo parpadeante y tiempo desde la última actualización
// Props:
//   lastUpdate: Date | number — timestamp de la última carga
//   onRefresh: () => void — callback manual de refresco
//   refreshing: boolean — si está refrescando ahora
export default function LiveIndicator({ lastUpdate, onRefresh, refreshing }) {
  const [tick, setTick] = useState(0);

  // Re-render cada 5s para actualizar el "hace X segundos"
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const segundos = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000) : 0;
  const texto = segundos < 10 ? 'ahora mismo'
    : segundos < 60 ? `hace ${segundos}s`
    : segundos < 3600 ? `hace ${Math.floor(segundos / 60)} min`
    : `hace ${Math.floor(segundos / 3600)} h`;

  return (
    <div className="flex items-center gap-2 text-[11px] font-bold">
      <span className="flex items-center gap-1.5 text-red-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        EN VIVO
      </span>
      <span className="text-white/70 hidden sm:inline">·</span>
      <span className="text-white/70 hidden sm:inline">{texto}</span>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="text-white/80 hover:text-white disabled:opacity-50 transition-colors"
        title="Refrescar ahora"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}