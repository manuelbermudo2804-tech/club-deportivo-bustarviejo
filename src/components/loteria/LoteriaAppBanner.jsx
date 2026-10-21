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
      className="loteria-pulse-border block relative overflow-hidden rounded-xl border border-amber-300 shadow-md transition-all hover:brightness-110 active:scale-[0.99] bg-gradient-to-r from-red-950 via-red-900 to-emerald-950"
    >
      <div className="relative flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-300 shadow">
          <Clover className="h-5 w-5 text-red-950" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-amber-300 sm:mb-1 sm:text-xs">¡Últimos décimos en comercios!</p>
          <p className="text-[13px] font-black leading-tight text-white sm:text-base">🍀 {campana.titulo || "Lotería de Navidad"}</p>
          <p className="mt-0.5 text-[11px] font-medium leading-snug text-white/90 sm:mt-1 sm:text-sm">Casi agotada en el pueblo · Todavía disponible online</p>
          {campana.precio_decimo && <p className="mt-0.5 text-[11px] font-semibold text-amber-200 sm:mt-1 sm:text-xs">{campana.precio_decimo}€ el décimo</p>}
          <p className="mt-0.5 text-[10px] font-semibold leading-snug text-amber-200 sm:mt-1 sm:text-xs">🧡 2 € de cada décimo ayudan a financiar al CD Bustarviejo.</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-300 px-2 py-1.5 text-[11px] font-black text-red-950 shadow sm:px-2.5 sm:py-2 sm:text-sm">
          Comprar <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}