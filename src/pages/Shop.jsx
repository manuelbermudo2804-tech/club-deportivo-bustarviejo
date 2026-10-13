import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Store } from "lucide-react";

export default function Shop() {
  const { data: seasonConfig, isLoading } = useQuery({
    queryKey: ["seasonConfig"],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find((c) => c.activa === true) || null;
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const equipacionUrl = seasonConfig?.tienda_ropa_url || "";
  const merchUrl = seasonConfig?.tienda_merch_url || "https://club-deportivo-bustarviejo.myspreadshop.es/";

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
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Elige dónde quieres comprar ropa oficial o artículos del club.</p>
          </div>
        </div>
      </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent" />
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Tienda Oficial Equipación */}
            <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 sm:h-14 sm:w-14">
                  <Store className="h-6 w-6 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-slate-900">Tienda de equipación oficial</h2>
                  <p className="mt-1 text-sm text-slate-500">Compra la ropa oficial del club</p>
                </div>
                <div>
                  {equipacionUrl ? (
                    <a href={equipacionUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">Entrar</Button>
                    </a>
                  ) : (
                    <Button className="w-full sm:w-auto" variant="outline" disabled title="Próximamente">Próximamente</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tienda Merchandising */}
            <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 sm:h-14 sm:w-14">
                  <ShoppingBag className="h-6 w-6 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-slate-900">Tienda de merchandising</h2>
                  <p className="mt-1 text-sm text-slate-500">Camisetas casual, tazas, regalos y más</p>
                </div>
                <div>
                  <a href={merchUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">Entrar</Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
}