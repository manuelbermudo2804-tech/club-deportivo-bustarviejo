import React from "react";
import SantaTrineo from "./SantaTrineo";
import BrujaEscoba from "./BrujaEscoba";

const ESTELA = ["✨", "⭐", "✨", "·"];
const GLOBOS = ["🎈", "🎭", "🎈", "🎉", "🎈", "🪅"];

function Volador({ children, top, duracion, retraso = "0s", estela }) {
  return (
    <div className="festive-fly absolute left-0 flex items-center" style={{ top, animationDuration: duracion, animationDelay: retraso }}>
      {estela && (
        <div className="flex gap-2 mr-1">
          {ESTELA.map((s, i) => <span key={i} className="festive-twinkle text-amber-300 text-sm" style={{ animationDelay: `${i * 0.25}s` }}>{s}</span>)}
        </div>
      )}
      <div className="festive-bob drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]">{children}</div>
    </div>
  );
}

function Arana({ left, retraso }) {
  return (
    <div className="festive-spider absolute top-14 lg:top-0 flex flex-col items-center" style={{ left, animationDelay: retraso }}>
      <div className="w-px flex-1 bg-slate-400/70" />
      <span className="text-2xl lg:text-3xl -mt-1">🕷️</span>
    </div>
  );
}

// Escenas animadas que cruzan la pantalla según el tema festivo activo.
export default function FestiveScenes({ clave }) {
  return (
    <div className="festive-particles fixed inset-0 z-[44] pointer-events-none overflow-hidden" aria-hidden="true">
      {clave === "navidad" && (
        <Volador top="32vh" duracion="24s" estela><SantaTrineo className="w-44 lg:w-64" /></Volador>
      )}
      {clave === "halloween" && (
        <>
          <Volador top="42vh" duracion="19s" retraso="3s"><BrujaEscoba className="w-32 lg:w-44" /></Volador>
          <Arana left="88%" retraso="0s" />
          <Arana left="72%" retraso="1.7s" />
        </>
      )}
      {clave === "reyes" && (
        <div className="festive-comet absolute left-0 top-0 flex items-center">
          <div className="w-32 lg:w-48 h-1 rounded-full bg-gradient-to-r from-transparent via-amber-200/70 to-amber-100" />
          <span className="text-3xl lg:text-4xl drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]">🌟</span>
        </div>
      )}
      {clave === "carnaval" && GLOBOS.map((g, i) => (
        <span key={i} className="festive-rise absolute text-4xl lg:text-5xl" style={{ left: `${8 + i * 16}%`, animationDelay: `${i * 2.3}s`, animationDuration: `${14 + (i % 3) * 3}s` }}>
          <span className="festive-bob inline-block">{g}</span>
        </span>
      ))}
    </div>
  );
}