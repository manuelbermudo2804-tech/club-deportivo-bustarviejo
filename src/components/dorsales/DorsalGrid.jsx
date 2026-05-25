import React from "react";
import { cn } from "@/lib/utils";

// Cuadrícula visual de dorsales 1..N para una categoría/temporada.
// Verde = libre, Naranja = asignado, Gris = reservado.
// Puntito en la esquina del asignado: verde = familia avisada (email o WhatsApp), naranja = sin avisar.
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
    const avisado = asign && (asign.email_enviado || asign.whatsapp_enviado);

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
        title={asign ? (avisado ? "Familia avisada" : "Pendiente de avisar a la familia") : undefined}
      >
        {asign && (
          <span
            className={cn(
              "absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-white shadow",
              avisado ? "bg-green-500" : "bg-orange-500 animate-pulse"
            )}
            aria-label={avisado ? "Avisado" : "Sin avisar"}
          />
        )}
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
    <div className="space-y-3">
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {cells}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
          Familia avisada
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow" />
          Pendiente de avisar
        </div>
      </div>
    </div>
  );
}