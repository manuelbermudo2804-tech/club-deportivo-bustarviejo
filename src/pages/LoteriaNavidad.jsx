import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Loader2 } from "lucide-react";
import TuLoteroAccess from "@/components/loteria/TuLoteroAccess";
import ComercioCard from "@/components/loteria/ComercioCard";
import LoteriaComoFunciona from "@/components/loteria/LoteriaComoFunciona";
import CompartirLoteriaButton from "@/components/loteria/CompartirLoteriaButton";

export default function LoteriaNavidad() {
  const { data, isLoading } = useQuery({
    queryKey: ["loteriaPublic"],
    queryFn: async () => {
      const res = await base44.functions.invoke("loteriaPublic", {});
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const campana = data?.campana;
  const comercios = data?.comercios || [];

  if (!campana) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-center">
        <div className="text-white">
          <div className="text-6xl mb-4">🎄</div>
          <p className="text-xl font-bold">La campaña de lotería no está disponible</p>
          <p className="text-slate-300 mt-2">Vuelve a consultarlo más adelante.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-green-950 pb-12 relative overflow-hidden">
      {/* Halo dorado de fondo */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[38rem] h-[38rem] rounded-full bg-yellow-400/20 blur-3xl" />
      <div className="max-w-2xl mx-auto px-4 pt-10 space-y-6 relative">
        {/* Cabecera */}
        <div className="text-center text-white space-y-3">
          <div className="text-6xl drop-shadow-[0_4px_20px_rgba(250,204,21,0.5)]">🍀🎄</div>
          <p className="text-yellow-300 text-xs font-black uppercase tracking-[0.3em]">CD Bustarviejo</p>
          <h1 className="text-4xl sm:text-6xl font-black leading-none bg-gradient-to-b from-yellow-100 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-lg">
            {campana.titulo || "Lotería de Navidad"}
          </h1>
          {campana.numero && (
            <div className="inline-block bg-gradient-to-b from-yellow-300 to-amber-500 text-red-900 px-10 py-5 rounded-3xl shadow-[0_10px_40px_rgba(250,204,21,0.45)] border-4 border-yellow-200">
              <p className="text-[11px] font-black uppercase tracking-[0.25em]">Nuestro número</p>
              <p className="text-5xl sm:text-6xl font-black leading-tight tracking-wider">{campana.numero}</p>
            </div>
          )}
          <div className="flex items-center justify-center gap-4 text-sm text-yellow-100 pt-1">
            {campana.precio_decimo ? (
              <span className="flex items-center gap-1 font-semibold">
                <Ticket className="w-4 h-4" /> {campana.precio_decimo}€ el décimo
              </span>
            ) : null}
            {campana.fecha_sorteo_texto && <span>🗓️ Sorteo: {campana.fecha_sorteo_texto}</span>}
          </div>
          {campana.texto_intro && (
            <p className="text-slate-100 max-w-lg mx-auto pt-2">{campana.texto_intro}</p>
          )}
        </div>

        {/* Cómo funciona */}
        <LoteriaComoFunciona textoPersonalizado={campana.texto_como_funciona} />

        {/* TuLotero */}
        <TuLoteroAccess url={campana.tulotero_url} password={campana.tulotero_password} />

        {/* Comercios */}
        <div className="space-y-3">
          <h2 className="text-white font-bold text-lg">🏪 Dónde comprar en el pueblo</h2>
          {comercios.length === 0 ? (
            <div className="bg-white/95 rounded-2xl p-5 text-center text-slate-600">
              Pronto publicaremos los comercios colaboradores.
            </div>
          ) : (
            comercios.map((c) => <ComercioCard key={c.id} comercio={c} />)
          )}
        </div>

        {/* Compartir */}
        <div className="pt-2 space-y-2">
          <p className="text-center text-slate-200 text-sm">
            ¡Ayúdanos a difundirlo! Comparte esta página con tus amigos y familia.
          </p>
          <CompartirLoteriaButton mensaje={campana.mensaje_whatsapp} />
        </div>

        <p className="text-center text-slate-400 text-xs pt-4">CD Bustarviejo</p>
      </div>
    </div>
  );
}