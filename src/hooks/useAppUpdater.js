import { useState, useEffect, useRef } from "react";

const BUILD_VERSION = "build_1708714800001";

export default function useAppUpdater() {
  // Anti-bucle: si acabamos de hacer un applyUpdate, no mostrar de nuevo
  const justUpdated = useRef(() => {
    try {
      const ts = sessionStorage.getItem('update_applied_at');
      if (ts && Date.now() - Number(ts) < 30000) return true; // 30s de gracia
    } catch {}
    return false;
  });

  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(() => {
    if (justUpdated.current()) return false;
    try {
      const savedVersion = localStorage.getItem('app_build_version');
      if (savedVersion && savedVersion !== BUILD_VERSION) {
        return true;
      }
      localStorage.setItem('app_build_version', BUILD_VERSION);
      return false;
    } catch { return false; }
  });

  // Service Worker update check (periodic + visibility)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (justUpdated.current()) return; // No chequear justo tras update

    const checkForNewVersion = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        await reg.update();
        if (reg.waiting) { setShowUpdateNotification(true); setHasNewVersion(true); }
      } catch (e) {
        console.error('Error verificando actualizaciones:', e);
      }
    };

    // 1. Chequeo inicial y periódico (5 minutos)
    checkForNewVersion();
    const intervalId = setInterval(checkForNewVersion, 300 * 1000);

    // 2. Chequeo al volver a la app
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [UPDATER] App visible - verificando actualizaciones...');
        checkForNewVersion();
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg?.waiting) {
              setShowUpdateNotification(true);
              setHasNewVersion(true);
            }
          });
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 3. Listener de instalación en segundo plano
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && reg.waiting) {
                  setShowUpdateNotification(true);
                  setHasNewVersion(true);
                }
              });
            }
          });
        }
      } catch {}
    })();

    // 4. Recarga automática si el controlador cambia (con debounce anti-bucle)
    let reloadScheduled = false;
    const onCtrlChange = () => {
      if (reloadScheduled) return;
      reloadScheduled = true;
      // Pequeño delay para evitar recargas múltiples
      setTimeout(() => window.location.reload(), 300);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onCtrlChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      navigator.serviceWorker.removeEventListener('controllerchange', onCtrlChange);
    };
  }, []);

  // Build version check (sin dependencia de SW)
  useEffect(() => {
    if (justUpdated.current()) {
      localStorage.setItem('app_build_version', BUILD_VERSION);
      return;
    }
    const savedVersion = localStorage.getItem('app_build_version');
    if (savedVersion && savedVersion !== BUILD_VERSION) {
      setHasNewVersion(true);
      setShowUpdateNotification(true);
    } else {
      localStorage.setItem('app_build_version', BUILD_VERSION);
    }
  }, []);

  const applyUpdate = async () => {
    localStorage.setItem('app_build_version', BUILD_VERSION);
    setShowUpdateNotification(false);
    setHasNewVersion(false);
    try { sessionStorage.setItem('update_applied_at', String(Date.now())); } catch {}

    // Enviar SKIP_WAITING al SW en espera para que se active
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          // Esperar un momento para que el controllerchange haga el reload
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    } catch {}

    // Si controllerchange no recargó, forzar reload
    window.location.reload();
  };

  return { showUpdateNotification, hasNewVersion, applyUpdate, BUILD_VERSION };
}