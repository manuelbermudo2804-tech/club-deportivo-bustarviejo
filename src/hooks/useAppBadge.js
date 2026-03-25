import { useEffect } from "react";

/**
 * Actualiza el badge numérico del icono de la PWA instalada (Android/Desktop).
 * Usa la Badging API del navegador + comunica al Service Worker para que
 * pueda mantener el badge cuando la app está en segundo plano.
 * @param {number} count - Número a mostrar en el badge (0 = limpiar)
 */
export default function useAppBadge(count) {
  useEffect(() => {
    // Update badge from the main window context
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }

    // Also tell the Service Worker so it has the latest count
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_BADGE",
        count
      });
    }
  }, [count]);
}