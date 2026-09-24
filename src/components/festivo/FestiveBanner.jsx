import React, { useState } from "react";
import { X } from "lucide-react";
import FestiveDecor from "./FestiveDecor";

// Banner principal festivo: gran tarjeta con degradado, brillos, decoración y emoji animado.
export default function FestiveBanner({ clave, tema, mensaje }) {
  const key = `festivo_cerrado_${clave}_${new Date().toDateString()}`;
  const [cerrado, setCerrado] = useState(() => sessionStorage.getItem(key) === "1");
  if (cerrado) return null;

  return (
    <div className="px-3 lg:px-6 pt-3 lg:pt-5">
      <div className={`festive-enter relative overflow-hidden rounded-3xl bg-gradient-to-br ${tema.fondo} shadow-2xl ring-1 ring-white/10`}>
        <div className={`absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl ${tema.glow1}`} />
        <div className={`absolute -bottom-24 right-10 w-80 h-80 rounded-full blur-3xl ${tema.glow2}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:22px_22px]" />
        <FestiveDecor clave={clave} />

        <div className="relative flex items-center gap-4 lg:gap-8 px-5 py-6 lg:px-10 lg:py-9">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-white/90 ring-1 ring-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-white festive-twinkle" />
              CD Bustarviejo · {tema.badge}
            </span>
            <h2 className={`mt-3 text-3xl lg:text-5xl font-black tracking-tight bg-gradient-to-r ${tema.tituloGradiente} bg-clip-text text-transparent drop-shadow`}>
              {tema.titulo}
            </h2>
            <p className="mt-2 text-sm lg:text-lg text-white/85 max-w-2xl leading-relaxed">{mensaje}</p>
          </div>

          <div className="relative shrink-0 hidden sm:flex items-center justify-center w-28 h-28 lg:w-40 lg:h-40">
            <div className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/20 festive-pulse-ring" />
            <div className="absolute inset-4 rounded-full bg-white/5 ring-1 ring-white/10" />
            <span className="festive-float text-6xl lg:text-8xl drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]">{tema.emoji}</span>
          </div>
        </div>

        <button
          onClick={() => { sessionStorage.setItem(key, "1"); setCerrado(true); }}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/25 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur min-h-0 min-w-0"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}