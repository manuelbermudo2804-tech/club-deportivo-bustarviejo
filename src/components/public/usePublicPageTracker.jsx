import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook que registra una visita a una página pública (una vez por sesión).
 * Uso: usePublicPageTracker("PublicSponsors")
 */
export default function usePublicPageTracker(pagina) {
  useEffect(() => {
    if (!pagina) return;

    // Evitar enviar múltiples veces en la misma sesión del navegador
    const sessionKey = `pv_${pagina}`;
    if (sessionStorage.getItem(sessionKey)) return;

    sessionStorage.setItem(sessionKey, "1");

    let fingerprint = "";
    try {
      fingerprint = localStorage.getItem("device_fingerprint") || "";
    } catch {}

    base44.functions
      .invoke("trackPublicView", {
        pagina,
        device_fingerprint: fingerprint,
        referrer: document.referrer || "",
        user_agent: navigator.userAgent,
      })
      .catch(() => {
        // Silencioso: no mostrar errores al usuario
      });
  }, [pagina]);
}