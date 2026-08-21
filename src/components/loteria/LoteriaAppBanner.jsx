import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clover, Sparkles } from "lucide-react";

export default function LoteriaAppBanner() {
  const { data: campana } = useQuery({
    queryKey: ["loteriaCampanaBanner"],
    queryFn: async () => {
      const rows = await base44.entities.LoteriaCampana.filter({ activa: true });
      return rows[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!campana) return null;

  return (
    <a
      href="/loteria"
      className="block relative overflow-hidden rounded-2xl border-2 border-yellow-400/70 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.99] bg-gradient-to-r from-red-900 via-red-700 to-green-800"
    >
      {/* brillo decorativo */}
      <div className="absolute -top-10 -right-6 w-40 h-40 rounded-full bg-yellow-300/20 blur-2xl" />
      <div className="absolute -bottom-12 left-10 w-40 h-40 rounded-full bg-green-300/10 blur-2xl" />

      <div className="relative flex items-center gap-3 p-4">
        <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center shrink-0 shadow-lg">
          <Clover className="w-7 h-7 text-red-900" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-black text-base leading-tight truncate">
            🍀 {campana.titulo || "Lotería de Navidad"}
            {campana.numero ? ` · Nº ${campana.numero}` : ""}
          </p>
          <p className="text-yellow-100 text-xs truncate">
            {campana.precio_decimo ? `${campana.precio_decimo}€ el décimo · ` : ""}
            Mira dónde comprarlo y compártelo
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-1 bg-yellow-400 text-red-900 font-bold text-xs px-3 py-2 rounded-xl shrink-0">
          <Sparkles className="w-4 h-4" /> Ver más
        </span>
        <span className="sm:hidden text-white text-lg">→</span>
      </div>
    </a>
  );
}