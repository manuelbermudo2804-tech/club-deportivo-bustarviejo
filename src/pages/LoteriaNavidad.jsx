import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import DecimoTicket from "@/components/loteria/DecimoTicket";
import SeccionLoteria from "@/components/loteria/SeccionLoteria";
import TuLoteroAccess from "@/components/loteria/TuLoteroAccess";
import ComercioCard from "@/components/loteria/ComercioCard";
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
      <div className="min-h-screen flex items-center justify-center bg-[#f4efe2]">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
      </div>
    );
  }

  const campana = data?.campana;
  const comercios = data?.comercios || [];

  if (!campana) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4efe2] p-6 text-center">
        <div>
          <p className="text-xl font-bold text-slate-900">La campaña de lotería no está disponible</p>
          <p className="text-slate-600 mt-2">Vuelve a consultarlo más adelante.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe2] pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-5">
        <DecimoTicket
          titulo={campana.titulo}
          numero={campana.numero}
          precio={campana.precio_decimo}
          fechaSorteo={campana.fecha_sorteo_texto}
        />

        {campana.texto_intro && (
          <p className="text-slate-700 text-center leading-relaxed whitespace-pre-line">
            {campana.texto_intro}
          </p>
        )}

        <SeccionLoteria numero="1" titulo="En los comercios del pueblo">
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
          <SeccionLoteria numero="2" titulo="O comprar online en TuLotero">
            <TuLoteroAccess url={campana.tulotero_url} password={campana.tulotero_password} />
          </SeccionLoteria>
        )}

        {campana.texto_como_funciona && (
          <SeccionLoteria numero="3" titulo="Información">
            <p className="text-slate-700 whitespace-pre-line">{campana.texto_como_funciona}</p>
          </SeccionLoteria>
        )}

        <div className="pt-2 space-y-2">
          <p className="text-center text-slate-600 text-sm">
            Comparte esta página y ayuda al club a vender más décimos.
          </p>
          <CompartirLoteriaButton mensaje={campana.mensaje_whatsapp} />
        </div>

        <p className="text-center text-slate-500 text-xs pt-4 uppercase tracking-[0.2em]">
          CD Bustarviejo
        </p>
      </div>
    </div>
  );
}