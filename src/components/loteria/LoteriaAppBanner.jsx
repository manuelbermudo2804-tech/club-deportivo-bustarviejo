import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Clover, ChevronRight } from "lucide-react";

export default function LoteriaAppBanner() {
  const [oculto, setOculto] = useState(() => sessionStorage.getItem("loteriaBannerOculto") === "1");

  const { data: campana } = useQuery({
    queryKey: ["loteriaCampanaBanner"],
    queryFn: async () => {
      const rows = await base44.entities.LoteriaCampana.filter({ activa: true });
      return rows[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!campana || oculto) return null;

  return (
    <div className="mx-3 lg:mx-6 mt-3 relative">
      <a href="/loteria" className="block overflow-hidden rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-green-800 shadow-xl border border-yellow-400/40">
        <div className="flex items-center gap-3 p-4 pr-10">
          <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0">
            <Clover className="w-6 h-6 text-red-900" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-black leading-tight truncate">
              {campana.titulo || "Lotería de Navidad"}
              {campana.numero ? ` · Nº ${campana.numero}` : ""}
            </p>
            <p className="text-yellow-100 text-xs truncate">
              {campana.precio_decimo ? `${campana.precio_decimo}€ el décimo · ` : ""}Mira dónde comprarlo y compártelo
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-yellow-200 ml-auto shrink-0" />
        </div>
      </a>
      <button
        onClick={() => { sessionStorage.setItem("loteriaBannerOculto", "1"); setOculto(true); }}
        className="absolute right-3 top-3 text-white/70 hover:text-white"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}