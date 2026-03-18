import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingBag } from "lucide-react";
import EquipacionSection from "../components/store/EquipacionSection";
import MerchSection from "../components/store/MerchSection";

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

      <EquipacionSection clothingUrl={clothingUrl} />
      <MerchSection merchUrl={merchUrl} />
    </div>
  );
}