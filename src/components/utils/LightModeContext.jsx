/**
 * LightModeContext — Modo ligero automático para dispositivos de baja memoria.
 *
 * Activa el modo ligero si:
 * - navigator.deviceMemory < 2 (menos de 2GB de RAM)
 * - prefers-reduced-motion está activo
 * - El dispositivo ya está en modo degradado (Android WebView antiguo, iOS <14)
 *
 * En modo ligero:
 * - Se añade clase CSS `light-mode` al <body> que elimina animaciones
 * - Los componentes pueden leer `useLightMode()` para reducir carga
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { getDeviceCapabilities } from "./deviceCapabilities";

const LightModeContext = createContext(false);

export function LightModeProvider({ children }) {
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    try {
      const caps = getDeviceCapabilities();

      // 1. Memoria baja (API disponible en Chrome/Android)
      const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 2;

      // 2. Usuario prefiere movimiento reducido (accesibilidad / rendimiento)
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

      // 3. Dispositivo ya en modo degradado (Android WebView, iOS antiguo)
      const degraded = caps.degraded === true;

      const shouldUseLightMode = lowMemory || prefersReduced || degraded;

      if (shouldUseLightMode) {
        setIsLightMode(true);
        // Añadir clase al body para que el CSS pueda reaccionar globalmente
        document.body.classList.add('light-mode');
        console.log('[LightMode] Activado', { lowMemory, prefersReduced, degraded, deviceMemory: navigator.deviceMemory });
      }
    } catch {
      // Si falla la detección, no activar (mejor que falsos positivos)
    }
  }, []);

  return (
    <LightModeContext.Provider value={isLightMode}>
      {children}
    </LightModeContext.Provider>
  );
}

/**
 * Hook para consumir el modo ligero en cualquier componente.
 * Ejemplo: const isLight = useLightMode();
 * if (isLight) { // omitir animaciones pesadas }
 */
export function useLightMode() {
  return useContext(LightModeContext);
}