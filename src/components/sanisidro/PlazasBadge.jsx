import React from "react";
import { Lock } from "lucide-react";

// Badge visual que muestra plazas libres / capacidad de una modalidad
export default function PlazasBadge({ ocupadas, capacidad }) {
  const libres = Math.max(0, capacidad - ocupadas);
  const completo = libres === 0;
  const ultimas = libres > 0 && libres <= 2;
  const pocas = libres > 2 && libres <= Math.ceil(capacidad / 3);

  if (completo) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-black shadow">
          <Lock className="w-3 h-3" /> COMPLETO
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">{ocupadas}/{capacidad}</span>
      </div>
    );
  }

  const color = ultimas
    ? "bg-orange-500 text-white"
    : pocas
    ? "bg-amber-400 text-amber-900"
    : "bg-green-500 text-white";

  const pct = Math.min(100, (ocupadas / capacidad) * 100);

  return (
    <div className="flex flex-col items-end gap-1 min-w-[72px]">
      <div className={`px-2.5 py-1 rounded-full text-xs font-black shadow ${color}`}>
        {libres} {libres === 1 ? "plaza" : "plazas"}
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${ultimas ? "bg-orange-500" : pocas ? "bg-amber-400" : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-400 font-semibold">{ocupadas}/{capacidad}</span>
    </div>
  );
}