import React from "react";
import { Sparkles } from "lucide-react";

const ESCUDO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Hero navideño: noche estrellada, orla dorada, escudo del club y número en bolas de bombo.
export default function DecimoTicket({ titulo, numero, precio, fechaSorteo }) {
  const digitos = String(numero || "").replace(/\s/g, "").split("");

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/60 shadow-2xl bg-gradient-to-b from-[#3b0a12] via-[#14532d] to-[#0b1f16]">
      {/* luces / estrellas */}
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <div className="absolute top-6 left-8 w-1.5 h-1.5 rounded-full bg-amber-200 shadow-[0_0_12px_4px_rgba(252,211,77,0.6)]" />
        <div className="absolute top-16 right-12 w-1 h-1 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.5)]" />
        <div className="absolute bottom-20 left-16 w-1 h-1 rounded-full bg-amber-100 shadow-[0_0_10px_3px_rgba(253,230,138,0.5)]" />
        <div className="absolute top-1/3 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_14px_5px_rgba(252,211,77,0.5)]" />
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-emerald-400/20 blur-3xl" />
      </div>

      <div className="relative px-6 py-9 text-center space-y-5">
        <img
          src={ESCUDO_URL}
          alt="Escudo CD Bustarviejo"
          className="w-24 h-24 mx-auto object-contain rounded-full border-[3px] border-amber-400 bg-white shadow-[0_0_30px_rgba(252,211,77,0.45)]"
        />

        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300">
            <Sparkles className="w-3 h-3" /> CD Bustarviejo
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white uppercase leading-tight drop-shadow">
            {titulo || "Lotería de Navidad"}
          </h1>
        </div>

        {digitos.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-200/80 mb-2">
              Nuestro número
            </p>
            <div className="flex justify-center gap-1.5 sm:gap-2">
              {digitos.map((d, i) => (
                <span
                  key={i}
                  className="w-11 h-14 sm:w-14 sm:h-16 rounded-xl bg-gradient-to-b from-[#fffdf5] to-[#f2e6c9] border border-amber-300 shadow-lg flex items-center justify-center text-3xl sm:text-4xl font-black text-red-900 tabular-nums"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          {precio ? (
            <span className="px-4 py-1.5 rounded-full bg-amber-400 text-red-900 text-sm font-black shadow">
              {precio} € el décimo
            </span>
          ) : null}
          {fechaSorteo && (
            <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-amber-100 text-sm font-semibold backdrop-blur">
              🎄 Sorteo: {fechaSorteo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}