import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Gestiona el badge del Mercadillo desde localStorage + carga real al visitar
export default function useMarketBadge(pathname) {
  const [marketCount, setMarketCount] = useState(0);
  const [marketNewCount, setMarketNewCount] = useState(0);

  // Leer desde cache al montar
  useEffect(() => {
    const lastSeen = Number(localStorage.getItem('marketLastSeenCount') || 0);
    const cachedCount = Number(localStorage.getItem('marketTotalCount') || 0);
    setMarketCount(cachedCount);
    setMarketNewCount(cachedCount > lastSeen ? cachedCount - lastSeen : 0);
  }, []);

  // Actualizar al entrar en Mercadillo
  useEffect(() => {
    const p = (pathname || '').toLowerCase();
    if (p.includes('mercadillo')) {
      (async () => {
        try {
          const data = await base44.entities.MarketListing.filter({ estado: 'activo' });
          const count = (data || []).length;
          localStorage.setItem('marketTotalCount', String(count));
          localStorage.setItem('marketLastSeenCount', String(count));
          setMarketCount(count);
          setMarketNewCount(0);
        } catch {}
      })();
    }
  }, [pathname]);

  return { marketCount, marketNewCount };
}