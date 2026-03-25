import { useEffect } from "react";

// Recuperación automática ante errores de carga de chunks (404/ChunkLoadError)
export default function useChunkRecovery() {
  useEffect(() => {
    const chunkErrorHandler = (e) => {
      const msg = (e?.reason?.message || e?.message || '').toString();
      if (/(Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module)/i.test(msg)) {
        try { if (window.caches) { caches.keys().then(keys => keys.forEach(k => caches.delete(k))); } } catch {}
        try { if (navigator.serviceWorker) { navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())); } } catch {}
        window.location.reload();
      }
    };
    window.addEventListener('unhandledrejection', chunkErrorHandler);
    return () => {
      try { window.removeEventListener('unhandledrejection', chunkErrorHandler); } catch {}
    };
  }, []);
}