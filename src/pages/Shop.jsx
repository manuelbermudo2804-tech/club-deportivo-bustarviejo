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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-white text-3xl lg:text-4xl font-bold">Tienda</h1>
          <p className="text-slate-300 mt-1">Elige dónde quieres comprar</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tienda Oficial Equipación */}
            <Card className="bg-slate-800 border-2 border-slate-700 rounded-3xl overflow-hidden hover:border-orange-500 transition-all card-hover-glow">
              <CardContent className="p-6 flex flex-col md:flex-row items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-2xl">
                  <Store className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-white text-xl font-semibold">Tienda de equipación oficial</h2>
                  <p className="text-slate-400 text-sm mt-1">Compra la ropa oficial del club</p>
                </div>
                <div>
                  {equipacionUrl ? (
                    <a href={equipacionUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-teal-600 hover:bg-teal-700">Entrar</Button>
                    </a>
                  ) : (
                    <Button variant="outline" disabled title="Próximamente">Próximamente</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tienda Merchandising */}
            <Card className="bg-slate-800 border-2 border-slate-700 rounded-3xl overflow-hidden hover:border-orange-500 transition-all card-hover-glow">
              <CardContent className="p-6 flex flex-col md:flex-row items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-700 flex items-center justify-center shadow-2xl">
                  <ShoppingBag className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-white text-xl font-semibold">Tienda de merchandising</h2>
                  <p className="text-slate-400 text-sm mt-1">Camisetas casual, tazas, regalos y más</p>
                </div>
                <div>
                  <a href={merchUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-pink-600 hover:bg-pink-700">Entrar</Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}