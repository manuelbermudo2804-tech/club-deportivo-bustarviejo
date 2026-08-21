import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Ticket, ExternalLink, Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-green-950 pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-10 space-y-6">
        {/* Cabecera */}
        <div className="text-center text-white space-y-3">
          <div className="text-5xl">🍀🎄</div>
          <h1 className="text-3xl sm:text-4xl font-black drop-shadow-lg">
            {campana.titulo || "Lotería de Navidad"}
          </h1>
          {campana.numero && (
            <div className="inline-block bg-yellow-400 text-red-900 px-6 py-3 rounded-2xl shadow-xl border-2 border-yellow-500">
              <p className="text-xs font-bold uppercase tracking-wide">Nuestro número</p>
              <p className="text-3xl sm:text-4xl font-black leading-tight">{campana.numero}</p>
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
        {campana.tulotero_url && (
          <a href={campana.tulotero_url} target="_blank" rel="noopener noreferrer" className="block">
            <Button size="lg" className="w-full h-14 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-red-900 font-bold text-base shadow-lg">
              <ExternalLink className="w-5 h-5 mr-2" />
              Comprar online en TuLotero
            </Button>
          </a>
        )}

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