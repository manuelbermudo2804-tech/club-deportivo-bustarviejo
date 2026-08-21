import React from "react";

// Tarjeta de sección navideña sobre fondo oscuro: cabecera roja con número dorado.
export default function SeccionLoteria({ numero, titulo, icono, children }) {
  return (
    <section className="rounded-2xl overflow-hidden border border-amber-400/40 shadow-xl bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-[#7f1d1d] to-[#14532d]">
        <span className="w-7 h-7 rounded-full bg-amber-400 text-red-900 text-sm font-black flex items-center justify-center shrink-0 shadow">
          {numero}
        </span>
        <h2 className="font-black text-white uppercase text-sm tracking-wide">
          {icono ? `${icono} ` : ""}{titulo}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}