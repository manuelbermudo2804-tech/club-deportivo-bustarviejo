import React from "react";

const BOMBILLAS = ["bg-red-400", "bg-amber-300", "bg-emerald-400", "bg-sky-300", "bg-pink-400"];
const CARAVANA = ["🐫", "🐪", "🐫"];

function Guirnalda({ items, total }) {
  return (
    <div className="absolute top-0 inset-x-0 flex justify-around items-start pointer-events-none">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`flex flex-col items-center ${i > 7 ? "hidden md:flex" : ""}`}>
          <div className="w-px bg-white/30" style={{ height: 8 + (i % 3) * 8 }} />
          <span className="festive-float text-lg lg:text-2xl" style={{ animationDelay: `${(i % 4) * 0.4}s` }}>{items[i % items.length]}</span>
        </div>
      ))}
    </div>
  );
}

// Detalle decorativo propio de cada tema dentro del banner.
export default function FestiveDecor({ clave }) {
  if (clave === "navidad") {
    return (
      <div className="absolute top-0 inset-x-0 h-6 flex justify-around items-start pointer-events-none">
        <svg className="absolute top-0 w-full h-4 text-white/20" preserveAspectRatio="none" viewBox="0 0 100 10">
          <path d="M0 0 Q 5 8 10 0 T 20 0 T 30 0 T 40 0 T 50 0 T 60 0 T 70 0 T 80 0 T 90 0 T 100 0" fill="none" stroke="currentColor" strokeWidth="0.6" />
        </svg>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`festive-bulb mt-2 w-2.5 h-3.5 rounded-full ${BOMBILLAS[i % BOMBILLAS.length]}`} style={{ animationDelay: `${(i % 5) * 0.3}s` }} />
        ))}
      </div>
    );
  }
  if (clave === "halloween") {
    return (
      <>
        <div className="absolute -top-10 right-40 w-40 h-40 rounded-full bg-amber-100/15 shadow-[0_0_80px_20px_rgba(251,191,36,0.15)] pointer-events-none hidden md:block" />
        <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-24 lg:w-32 text-white/25 pointer-events-none">
          <path d="M0 0 L100 30 M0 0 L70 70 M0 0 L30 100 M20 6 Q18 18 6 20 M45 13 Q38 38 13 45 M72 21 Q58 58 21 72" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
        <Guirnalda items={["🎃", "💀", "🦇"]} total={14} />
      </>
    );
  }
  if (clave === "reyes") {
    return (
      <>
        <div className="absolute top-4 right-44 text-5xl festive-twinkle pointer-events-none hidden md:block">⭐</div>
        <div className="festive-walk absolute bottom-1 flex gap-4 pointer-events-none">
          {CARAVANA.map((c, i) => (
            <div key={i} className="festive-bob flex flex-col items-center" style={{ animationDelay: `${i * 0.3}s`, animationDuration: "1.2s" }}>
              <span className="text-sm -mb-2">👑</span>
              <span className="text-3xl lg:text-4xl">{c}</span>
            </div>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-pink-400 via-yellow-300 via-cyan-300 to-violet-400 pointer-events-none" />
      <Guirnalda items={["🎭", "🎊", "🎉", "🪅"]} total={12} />
    </>
  );
}