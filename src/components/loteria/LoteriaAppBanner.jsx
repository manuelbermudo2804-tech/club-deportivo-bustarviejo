import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clover, ArrowUpRight } from "lucide-react";

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
      className="block relative overflow-hidden rounded-2xl border-2 border-amber-300 shadow-xl transition-all hover:brightness-110 active:scale-[0.99] bg-gradient-to-r from-red-950 via-red-900 to-emerald-950"
    >
      <div className="relative flex items-center gap-3 p-4 sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-300 shadow-lg">
          <Clover className="h-6 w-6 text-red-950" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-amber-300">¡Últimos décimos en comercios!</p>
          <p className="text-base font-black leading-tight text-white sm:text-lg">🍀 {campana.titulo || "Lotería de Navidad"}</p>
          <p className="mt-1 text-sm font-medium leading-snug text-white/90">Casi agotada en el pueblo · Todavía disponible online</p>
          {campana.precio_decimo && <p className="mt-1 text-xs font-semibold text-amber-200">{campana.precio_decimo}€ el décimo</p>}
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-300 px-3 py-3 text-xs font-black text-red-950 shadow-lg sm:text-sm">
          Comprar <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </a>
  );
}