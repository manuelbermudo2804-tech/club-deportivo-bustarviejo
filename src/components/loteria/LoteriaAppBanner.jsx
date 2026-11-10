import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { ventaCerrada } from "@/lib/loteriaCierre";
import CuentaAtrasLoteria from "./CuentaAtrasLoteria";

export default function LoteriaAppBanner() {
  const { data } = useQuery({
    queryKey: ["loteriaPublic"],
    queryFn: async () => (await base44.functions.invoke("loteriaPublic", {})).data,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const campana = data?.campana;
  if (!campana || ventaCerrada(campana)) return null;
  const restantes = data?.tulotero?.restantes;

  return (
    <a
      href="/loteria"
      className="loteria-pulse-border block overflow-hidden rounded-xl border border-amber-300 shadow-md transition-all hover:brightness-110 active:scale-[0.99] bg-gradient-to-r from-red-950 via-red-900 to-emerald-950"
    >
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white sm:text-base">🍀 {campana.titulo || "Lotería de Navidad"} · {campana.numero}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {typeof restantes === "number" && (
              <p className="text-xl font-black leading-none text-amber-300 sm:text-2xl">
                {restantes} <span className="text-sm font-bold text-amber-200 sm:text-base">décimos quedan</span>
              </p>
            )}
            {campana.fecha_cierre && (
              <CuentaAtrasLoteria fechaCierre={campana.fecha_cierre} className="text-xl font-black leading-none text-white sm:text-2xl" />
            )}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-300 px-3 py-2 text-sm font-black text-red-950 shadow">
          Comprar <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </a>
  );
}