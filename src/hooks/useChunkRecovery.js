import { useEffect } from "react";

// Recuperación automática ante errores de carga de chunks (404/ChunkLoadError)
// tras desplegar una nueva versión (el navegador guarda referencias a chunks viejos).
export default function useChunkRecovery() {
  useEffect(() => {
    const esErrorDeChunk = (msg) =>
      /(Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed)/i.test(msg);

    // Recarga limpiando cachés/SW, pero solo una vez por sesión para no entrar en bucle.
    const recuperar = () => {
      try {
        if (sessionStorage.getItem('chunkRecoveryDone')) return; // ya lo intentamos: no recargar de nuevo
        sessionStorage.setItem('chunkRecoveryDone', '1');
      } catch {}
      try { if (window.caches) { caches.keys().then(keys => keys.forEach(k => caches.delete(k))); } } catch {}
      try { if (navigator.serviceWorker) { navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())); } } catch {}
      window.location.reload();
    };

    // Promesas rechazadas (import dinámico que falla y no se captura)
    const rejectionHandler = (e) => {
      const msg = (e?.reason?.message || e?.reason || e?.message || '').toString();
      if (esErrorDeChunk(msg)) recuperar();
    };
    // Errores globales (incluye fallos de carga de módulos capturados por React.lazy/Suspense)
    const errorHandler = (e) => {
      const msg = (e?.error?.message || e?.message || '').toString();
      if (esErrorDeChunk(msg)) recuperar();
    };

    window.addEventListener('unhandledrejection', rejectionHandler);
    window.addEventListener('error', errorHandler, true);
    return () => {
      try { window.removeEventListener('unhandledrejection', rejectionHandler); } catch {}
      try { window.removeEventListener('error', errorHandler, true); } catch {}
    };
  }, []);
}