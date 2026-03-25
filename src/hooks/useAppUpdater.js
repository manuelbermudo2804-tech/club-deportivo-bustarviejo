import { useState, useEffect } from "react";

const BUILD_VERSION = "build_1708714800001";

// Hook que gestiona la detección de actualizaciones del Service Worker
// y nuevas versiones del build. Devuelve estado y acciones.
export default function useAppUpdater() {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(() => {
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

    // 4. Recarga automática si el controlador cambia
    const onCtrlChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', onCtrlChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      navigator.serviceWorker.removeEventListener('controllerchange', onCtrlChange);
    };
  }, []);

  // Build version check (sin dependencia de SW)
  useEffect(() => {
    const savedVersion = localStorage.getItem('app_build_version');
    if (savedVersion && savedVersion !== BUILD_VERSION) {
      setHasNewVersion(true);
      setShowUpdateNotification(true);
    } else {
      localStorage.setItem('app_build_version', BUILD_VERSION);
    }
  }, []);

  const applyUpdate = () => {
    localStorage.setItem('app_build_version', BUILD_VERSION);
    setShowUpdateNotification(false);
    window.location.reload();
  };

  return { showUpdateNotification, hasNewVersion, applyUpdate, BUILD_VERSION };
}