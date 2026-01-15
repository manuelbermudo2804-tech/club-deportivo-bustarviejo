import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function PwaEntry() {
  const [canInstall, setCanInstall] = useState(false);
  const [installedStep, setInstalledStep] = useState(false);
  const deferredPromptRef = useRef(null);

  const isStandalone = () => (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );

  useEffect(() => {
    // Bypass de emergencia: /PwaEntry?skip=1 marca flags y entra a la web
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('skip') === '1') {
        localStorage.setItem('disableLegacyOnboarding', 'true');
        localStorage.setItem('hasSeenWelcome', 'true');
        localStorage.setItem('installCompleted', 'true');
        localStorage.setItem('pwaInstalled', 'true');
        window.location.replace('/Home');
        return;
      }
    } catch {}

    // Si ya está instalada, marcar y mandar al login (obligatorio)
    if (isStandalone()) {
      // Marcar flags para desactivar onboarding legacy
      try {
        localStorage.setItem('pwaInstalled', 'true');
        localStorage.setItem('hasSeenWelcome', 'true');
        localStorage.setItem('installCompleted', 'true');
        localStorage.setItem('disableLegacyOnboarding', 'true');
        localStorage.removeItem('installPromptAfterOnboarding');
      } catch {}

      // Ir según tipo_panel guardado
      (async () => {
        try {
          const isAuth = await base44.auth.isAuthenticated();
          if (isAuth) {
            const me = await base44.auth.me();
            const target = me?.tipo_panel === 'jugador_adulto' ? '/PlayerDashboard' : '/ParentDashboard';
            window.location.replace(target);
          } else {
            window.location.replace('/login');
          }
        } catch {
          window.location.replace('/login');
        }
      })();
      return;
    }

    // Inyectar manifest y theme-color en <head>
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/functions/manifest';
    document.head.appendChild(link);

    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#1e1e1e';
    document.head.appendChild(meta);

    // Registrar Service Worker en raíz
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/functions/sw', { scope: '/' }).catch(() => {});
    }

    // Capturar beforeinstallprompt
    const onBip = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const onInstalled = () => {
      try {
        localStorage.setItem('pwaInstalled', 'true');
        localStorage.setItem('hasSeenWelcome', 'true');
        localStorage.setItem('installCompleted', 'true');
        localStorage.setItem('disableLegacyOnboarding', 'true');
        localStorage.removeItem('installPromptAfterOnboarding');
      } catch {}
      setInstalledStep(true);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      try { document.head.removeChild(link); } catch {}
      try { document.head.removeChild(meta); } catch {}
    };
  }, []);

  const handleInstall = async () => {
    const deferred = deferredPromptRef.current;
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice && choice.outcome === 'accepted') {
      // Mostrar paso final y marcar flags
      try {
        localStorage.setItem('pwaInstalled', 'true');
        localStorage.setItem('hasSeenWelcome', 'true');
        localStorage.setItem('installCompleted', 'true');
        localStorage.setItem('disableLegacyOnboarding', 'true');
        localStorage.removeItem('installPromptAfterOnboarding');
      } catch {}
      setInstalledStep(true);
      // Redirigir al login
      try { window.location.href = '/login'; } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 text-center">
        <div className="mb-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
            alt="CD Bustarviejo"
            className="w-20 h-20 mx-auto rounded-xl object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Instalar la App</h1>
        <p className="text-slate-600 mt-1">Para continuar, instala la aplicación en tu dispositivo. Este paso es obligatorio.</p>

        <div className="mt-6">
          <button
            id="installBtn"
            onClick={handleInstall}
            disabled={!canInstall}
            className={`w-full py-3 rounded-xl text-white font-semibold shadow-lg ${canInstall ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            {canInstall ? 'Instalar aplicación' : 'Preparando instalación…'}
          </button>
        </div>

        <div id="finalStep" style={{ display: installedStep ? 'block' : 'none' }} className="mt-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">¡Ya está instalada!</h2>
          <p className="text-slate-700 mb-4">Cierra esta pestaña y abre la app desde el icono creado.</p>
          <button
            onClick={() => { try { window.open('', '_self'); window.close(); } catch {} }}
            className="w-full py-3 rounded-xl bg-slate-800 text-white font-semibold"
          >
            Entendido
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <div className="text-xs text-slate-500">
            <p className="font-semibold text-slate-700">¿No aparece el botón “Instalar aplicación”?</p>
            <p>• iPhone/iPad: abre en Safari → botón Compartir → “Añadir a pantalla de inicio”.</p>
            <p>• Android: abre en Chrome → menú ⋮ → “Instalar app” o “Añadir a pantalla de inicio”.</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => { 
                try { 
                  localStorage.setItem('disableLegacyOnboarding', 'true');
                  localStorage.setItem('hasSeenWelcome', 'true');
                  localStorage.setItem('installCompleted', 'true');
                  window.location.href = '/Home'; 
                } catch {} 
              }}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700"
            >
              Omitir instalación ahora (marcar como instalada)
            </button>
            <button
              onClick={() => { try { window.location.href = '/Home'; } catch {} }}
              className="w-full py-3 rounded-xl bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300"
            >
              Abrir la web sin instalar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}