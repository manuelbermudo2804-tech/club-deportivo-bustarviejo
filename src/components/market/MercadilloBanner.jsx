import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingBag, X } from "lucide-react";

const SEEN_KEY = "mercadillo_banner_last_seen";

// Banner compacto y descartable que solo aparece cuando hay anuncios nuevos
// en el mercadillo desde la última vez que el usuario lo vio/descartó.
export default function MercadilloBanner() {
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await base44.entities.MarketListing.filter(
          { estado: "activo" },
          "-created_date",
          12
        );
        if (cancelled) return;
        const lastSeen = Number(localStorage.getItem(SEEN_KEY) || 0);
        const nuevos = (data || []).filter((l) => {
          const t = l.created_date ? new Date(l.created_date).getTime() : 0;
          return t > lastSeen;
        });
        setItems(nuevos);
      } catch {
        if (!cancelled) setItems([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
    setDismissed(true);
  };

  if (dismissed || items.length === 0) return null;

  const fotos = items
    .map((l) => (Array.isArray(l.imagenes) ? l.imagenes[0] : null))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Link to={createPageUrl("Mercadillo")} className="block">
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-3 shadow-lg border border-orange-400 transition-all hover:scale-[1.02] active:scale-95">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-white flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">
              🛍️ {items.length} {items.length === 1 ? "anuncio nuevo" : "anuncios nuevos"} en el Mercadillo
            </p>
            <p className="text-orange-100 text-xs">Echa un vistazo al material deportivo</p>
          </div>
          <div className="hidden sm:flex items-center -space-x-2 flex-shrink-0">
            {fotos.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="w-9 h-9 rounded-lg object-cover border-2 border-white shadow"
              />
            ))}
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Descartar"
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </Link>
  );
}