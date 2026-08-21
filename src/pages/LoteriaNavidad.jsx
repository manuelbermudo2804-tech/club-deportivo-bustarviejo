import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import DecimoTicket from "@/components/loteria/DecimoTicket";
import SeccionLoteria from "@/components/loteria/SeccionLoteria";
import TuLoteroAccess from "@/components/loteria/TuLoteroAccess";
import ComercioCard from "@/components/loteria/ComercioCard";
import CompartirLoteriaButton from "@/components/loteria/CompartirLoteriaButton";
import PremioResultado from "@/components/loteria/PremioResultado";

const FONDO = "min-h-screen bg-gradient-to-b from-[#0b1f16] via-[#12261c] to-[#3b0a12]";

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
      <div className={`${FONDO} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  const campana = data?.campana;
  const comercios = data?.comercios || [];

  if (!campana) {
    return (
      <div className={`${FONDO} flex items-center justify-center p-6 text-center`}>
        <div>
          <p className="text-4xl mb-3">🎄</p>
          <p className="text-xl font-black text-white">La campaña de lotería no está disponible</p>
          <p className="text-emerald-200/80 mt-2">Vuelve a consultarlo más adelante.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${FONDO} pb-14`}>
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {campana.resultado_publicado === true && <PremioResultado campana={campana} />}

        <DecimoTicket
          titulo={campana.titulo}
          numero={campana.numero}
          precio={campana.precio_decimo}
          fechaSorteo={campana.fecha_sorteo_texto}
        />

        {campana.texto_intro && (
          <p className="text-amber-50 text-center leading-relaxed whitespace-pre-line px-2">
            {campana.texto_intro}
          </p>
        )}

        <SeccionLoteria numero="1" titulo="Dónde comprarlo en el pueblo" icono="🏪">
          {comercios.length === 0 ? (
            <p className="text-slate-600 text-sm">Pronto publicaremos los comercios colaboradores.</p>
          ) : (
            <div className="space-y-3">
              {comercios.map((c) => (
                <ComercioCard key={c.id} comercio={c} />
              ))}
            </div>
          )}
        </SeccionLoteria>

        {(campana.tulotero_url || campana.tulotero_password) && (
          <SeccionLoteria numero="2" titulo="Comprar online en TuLotero" icono="📱">
            <TuLoteroAccess url={campana.tulotero_url} password={campana.tulotero_password} />
          </SeccionLoteria>
        )}

        {campana.texto_como_funciona && (
          <SeccionLoteria numero="3" titulo="Cómo funciona" icono="ℹ️">
            <p className="text-slate-700 whitespace-pre-line">{campana.texto_como_funciona}</p>
          </SeccionLoteria>
        )}

        <div className="rounded-2xl border border-amber-400/40 bg-white/5 backdrop-blur p-5 text-center space-y-3">
          <p className="text-amber-100 font-semibold">
            🍀 Comparte esta página y ayuda al club a vender más décimos
          </p>
          <CompartirLoteriaButton mensaje={campana.mensaje_whatsapp} />
        </div>

        <p className="text-center text-amber-300/60 text-xs pt-2 uppercase tracking-[0.25em]">
          🎄 CD Bustarviejo · Feliz Navidad
        </p>
      </div>
    </div>
  );
}