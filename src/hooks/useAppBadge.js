import { useEffect } from "react";

/**
 * Actualiza el badge numérico del icono de la PWA instalada (Android/Desktop).
 * Usa la Badging API del navegador — solo funciona con la app abierta.
 * @param {number} count - Número a mostrar en el badge (0 = limpiar)
 */
export default function useAppBadge(count) {
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;

    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [count]);
}