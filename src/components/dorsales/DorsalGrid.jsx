import React from "react";
import { cn } from "@/lib/utils";

// Cuadrícula visual de dorsales 1..N para una categoría/temporada.
// Verde = libre, Naranja = asignado, Gris = reservado.
export default function DorsalGrid({ min = 1, max = 25, reservados = [], assignments = [], onClickFree, onClickAssigned }) {
  const reservadosSet = new Set(reservados.map(Number));
  const asignadosMap = new Map();
  (assignments || []).forEach((a) => {
    if (a.estado === "asignado") asignadosMap.set(Number(a.dorsal), a);
  });

  const cells = [];
  for (let n = min; n <= max; n++) {
    const isReservado = reservadosSet.has(n);
    const asign = asignadosMap.get(n);
    const isFree = !isReservado && !asign;

    cells.push(
      <button
        key={n}
        type="button"
        onClick={() => {
          if (isFree) onClickFree?.(n);
          else if (asign) onClickAssigned?.(asign, n);
        }}
        disabled={isReservado}
        className={cn(
          "relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all text-center p-1",
          isFree && "bg-green-50 border-green-400 hover:bg-green-100 hover:scale-105 cursor-pointer",
          asign && "bg-orange-50 border-orange-400 hover:bg-orange-100 cursor-pointer",
          isReservado && "bg-slate-100 border-slate-300 cursor-not-allowed opacity-60"
        )}
      >
        <span className={cn(
          "text-2xl font-black leading-none",
          isFree && "text-green-700",
          asign && "text-orange-700",
          isReservado && "text-slate-400"
        )}>
          {n}
        </span>
        {asign && (
          <span className="text-[10px] text-orange-800 font-semibold leading-tight mt-1 px-1 line-clamp-2">
            {asign.jugador_nombre?.split(" ").slice(0, 2).join(" ")}
          </span>
        )}
        {isFree && (
          <span className="text-[10px] text-green-700 font-medium mt-1">Libre</span>
        )}
        {isReservado && (
          <span className="text-[10px] text-slate-500 mt-1">Reservado</span>
        )}
      </button>
    );
  }

  return (
    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
      {cells}
    </div>
  );
}