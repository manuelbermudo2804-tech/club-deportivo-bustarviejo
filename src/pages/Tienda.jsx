import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, Store } from "lucide-react";
import EquipacionSection from "../components/store/EquipacionSection";
import MerchSection from "../components/store/MerchSection";
import MyDorsalsBanner from "../components/store/MyDorsalsBanner";

export default function Tienda() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SeasonConfig.filter({ activa: true })
      .then(configs => setConfig(configs[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clothingUrl = config?.tienda_ropa_url;
  const merchUrl = config?.tienda_merch_url;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
            <ShoppingBag className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Equipación y merchandising · CD Bustarviejo</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Tienda y Equipación</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Ropa oficial, equipación deportiva y artículos del club en un solo lugar.</p>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
              <Store className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900">Equipación oficial</h2>
              <p className="text-sm text-slate-500">Ropa deportiva y dorsal asignado</p>
            </div>
          </div>
          <MyDorsalsBanner />
          <EquipacionSection clothingUrl={clothingUrl} />
        </section>
        <section className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
              <ShoppingBag className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900">Merchandising del club</h2>
              <p className="text-sm text-slate-500">Camisetas, regalos y artículos del CD Bustarviejo</p>
            </div>
          </div>
          <MerchSection merchUrl={merchUrl} />
        </section>
      </div>
    </div>
  );
}