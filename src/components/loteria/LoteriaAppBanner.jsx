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
      <div className="relative flex items-center gap-2.5 p-3 sm:p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-300 shadow">
          <Clover className="h-5 w-5 text-red-950" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-amber-300">¡Últimos décimos en comercios!</p>
          <p className="text-sm font-black leading-tight text-white sm:text-base">🍀 {campana.titulo || "Lotería de Navidad"}</p>
          <p className="mt-1 text-xs font-medium leading-snug text-white/90 sm:text-sm">Casi agotada en el pueblo · Todavía disponible online</p>
          {campana.precio_decimo && <p className="mt-1 text-xs font-semibold text-amber-200">{campana.precio_decimo}€ el décimo</p>}
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-300 px-2.5 py-2 text-xs font-black text-red-950 shadow sm:text-sm">
          Comprar <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}