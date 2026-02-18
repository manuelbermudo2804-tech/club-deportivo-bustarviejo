import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ExternalLink, Star, Gift } from "lucide-react";

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
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-orange-600" />
          Tienda del Club
        </h1>
        <p className="text-slate-500 text-sm mt-1">Equipación oficial y merchandising del CD Bustarviejo</p>
      </div>

      <div className="grid gap-4">
        {/* Equipación */}
        <Card className="overflow-hidden border-2 border-orange-100 hover:border-orange-300 transition-colors">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-6">
              <div className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Star className="w-10 h-10 text-orange-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-slate-900">🛍️ Equipación Oficial</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Chaquetas, packs de entrenamiento, chubasqueros, mochilas y más.
                </p>
              </div>
              {clothingUrl ? (
                <a href={clothingUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-orange-600 hover:bg-orange-700 gap-2 whitespace-nowrap">
                    <ExternalLink className="w-4 h-4" />
                    Ir a la tienda
                  </Button>
                </a>
              ) : (
                <Button disabled className="gap-2 whitespace-nowrap">
                  Próximamente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Merchandising */}
        <Card className="overflow-hidden border-2 border-green-100 hover:border-green-300 transition-colors">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-6">
              <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Gift className="w-10 h-10 text-green-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-slate-900">🛒 Merchandising</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Artículos exclusivos del club: bufandas, gorras, tazas y más.
                </p>
              </div>
              {merchUrl ? (
                <a href={merchUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-green-600 hover:bg-green-700 gap-2 whitespace-nowrap">
                    <ExternalLink className="w-4 h-4" />
                    Ir a la tienda
                  </Button>
                </a>
              ) : (
                <Button disabled className="gap-2 whitespace-nowrap">
                  Próximamente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!clothingUrl && !merchUrl && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-5xl mb-3">🏪</p>
          <p className="font-medium">Las tiendas aún no están configuradas.</p>
          <p className="text-sm mt-1">Estarán disponibles próximamente.</p>
        </div>
      )}
    </div>
  );
}