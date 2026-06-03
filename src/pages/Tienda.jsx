import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, ExternalLink, UserCircle2 } from "lucide-react";
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
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-orange-600" />
          Tienda y Equipación
        </h1>
        <p className="text-slate-500 text-sm mt-1">Equipación oficial y merchandising del CD Bustarviejo</p>
      </div>

      <MyDorsalsBanner />

      {/* Aviso: la tienda es externa y requiere su propio registro */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-5 h-5 text-amber-800" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 text-sm">⚠️ La tienda es una web externa</p>
            <p className="text-amber-800 text-xs mt-1 leading-relaxed">
              Al pulsar el botón se abrirá la tienda oficial en una nueva ventana. <strong>Tendrás que crear una cuenta o iniciar sesión en esa tienda</strong> (es distinta a la app del club) para poder hacer el pedido.
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-amber-900 text-xs font-semibold">
              <UserCircle2 className="w-4 h-4" />
              <span>Tu usuario de la app NO sirve para la tienda.</span>
            </div>
          </div>
        </div>
      </div>

      <EquipacionSection clothingUrl={clothingUrl} />
      <MerchSection merchUrl={merchUrl} />
    </div>
  );
}