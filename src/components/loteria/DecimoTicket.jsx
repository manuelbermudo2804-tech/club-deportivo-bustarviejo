import React from "react";

const ESCUDO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Décimo de lotería clásico: papel crema, orla dorada, escudo del club y número grande.
export default function DecimoTicket({ titulo, numero, precio, fechaSorteo }) {
  return (
    <div className="rounded-3xl p-[3px] bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-2xl">
      <div className="rounded-[22px] bg-[#fdf8ec] border border-amber-200 px-6 py-7 text-center relative overflow-hidden">
        <div className="absolute inset-3 rounded-2xl border border-dashed border-amber-300/70 pointer-events-none" />

        <div className="relative space-y-4">
          <img
            src={ESCUDO_URL}
            alt="Escudo CD Bustarviejo"
            className="w-20 h-20 mx-auto object-contain rounded-full border-2 border-amber-400 bg-white shadow-md"
          />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-800">
              Club Deportivo Bustarviejo
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-red-900 uppercase tracking-wide mt-1">
              {titulo || "Lotería de Navidad"}
            </h1>
          </div>

          <div className="h-px bg-amber-300/80 mx-auto w-2/3" />

          {numero && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">
                Número
              </p>
              <p className="text-5xl sm:text-6xl font-black text-slate-900 tracking-[0.15em] tabular-nums">
                {numero}
              </p>
            </div>
          )}

          <div className="flex items-center justify-center divide-x divide-amber-300 text-sm">
            {precio ? (
              <div className="px-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Precio</p>
                <p className="font-bold text-slate-900">{precio} €</p>
              </div>
            ) : null}
            {fechaSorteo && (
              <div className="px-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Sorteo</p>
                <p className="font-bold text-slate-900">{fechaSorteo}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}