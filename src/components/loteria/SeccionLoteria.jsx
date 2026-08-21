import React from "react";

// Sección numerada con estilo institucional para la página pública de lotería.
export default function SeccionLoteria({ numero, titulo, children }) {
  return (
    <section className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 bg-[#fdf8ec] border-b border-amber-200">
        <span className="w-7 h-7 rounded-full bg-red-900 text-amber-200 text-sm font-black flex items-center justify-center shrink-0">
          {numero}
        </span>
        <h2 className="font-bold text-slate-900 uppercase text-sm tracking-wide">{titulo}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}