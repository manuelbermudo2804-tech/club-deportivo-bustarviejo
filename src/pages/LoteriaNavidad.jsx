import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShoppingCart, ArrowUpRight } from "lucide-react";
import DecimoTicket from "@/components/loteria/DecimoTicket";
import SeccionLoteria from "@/components/loteria/SeccionLoteria";
import TuLoteroAccess from "@/components/loteria/TuLoteroAccess";
import ComercioCard from "@/components/loteria/ComercioCard";
import CompartirLoteriaButton from "@/components/loteria/CompartirLoteriaButton";
import PremioResultado from "@/components/loteria/PremioResultado";
import TextoLoteria from "@/components/loteria/TextoLoteria";
import BackToWebsiteButton from "@/components/public/BackToWebsiteButton";
import usePublicPageTracker from "@/components/public/usePublicPageTracker";

const FONDO = "min-h-screen bg-gradient-to-b from-[#0b1f16] via-[#12261c] to-[#3b0a12]";
const URL_TULOTERO = "https://web.tulotero.es/empresas/cdb26";

export default function LoteriaNavidad() {
  usePublicPageTracker("LoteriaNavidad");

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
      <BackToWebsiteButton />
      <div className="max-w-2xl mx-auto px-4 pt-16 space-y-5">
        {campana.resultado_publicado === true && <PremioResultado campana={campana} />}

        <section className="overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 p-5 text-center text-red-950 shadow-2xl sm:p-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950 text-amber-300 shadow-lg">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em]">🎟️ Lotería de Navidad · CD Bustarviejo</p>
          <h2 className="text-2xl font-black leading-tight sm:text-3xl">¡Quedan muy pocos décimos en los comercios!</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-relaxed sm:text-base">Si todavía no tienes el tuyo, aún puedes conseguirlo online. ¡Colabora con el club y no te quedes sin lotería!</p>
          <a href={campana.tulotero_url || URL_TULOTERO} target="_blank" rel="noopener noreferrer" className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-950 px-5 py-4 text-base font-black text-white shadow-lg transition hover:bg-red-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white sm:text-lg">
            COMPRAR LOTERÍA ONLINE <ArrowUpRight className="h-5 w-5" />
          </a>
          <p className="mt-3 text-xs font-semibold text-red-950/80">Compra online a través de TuLotero</p>
        </section>

        <DecimoTicket
          titulo={campana.titulo}
          numero={campana.numero}
          precio={campana.precio_decimo}
          fechaSorteo={campana.fecha_sorteo_texto}
        />

        {campana.texto_intro && (
          <div className="rounded-2xl border border-amber-400/30 bg-black/25 backdrop-blur p-5">
            <TextoLoteria texto={campana.texto_intro} />
          </div>
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
            <TextoLoteria texto={campana.texto_como_funciona} oscuro={false} />
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