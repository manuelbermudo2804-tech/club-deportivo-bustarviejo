import React, { useEffect, useRef, useState } from "react";

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function PwaEntry() {
  const deferredPromptRef = useRef(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [showFinalStep, setShowFinalStep] = useState(false);

  // Inject manifest and theme-color into <head>
  useEffect(() => {
    // manifest
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }
    // theme-color
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#1e1e1e');
  }, []);

  // Register service worker (root scope)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen installed event
    const installedListener = () => {
      setInstalled(true);
      setShowInstall(false);
      setShowFinalStep(true);
    };
    window.addEventListener('appinstalled', installedListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedListener);
    };
  }, []);

  // If already installed, skip onboarding: bounce to root to continue normal flow
  useEffect(() => {
    if (installed) {
      // Hide any onboarding and let app flow proceed
      // Optionally redirect to root so Layout can route to dashboard/login
      setTimeout(() => {
        if (window.location.pathname.toLowerCase().includes('pwaentry')) {
          window.location.replace('/');
        }
      }, 600);
    }
  }, [installed]);

  const onInstallClick = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setShowFinalStep(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 text-center">
        {!installed && !showFinalStep && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Instala la App</h1>
            <p className="text-slate-600 mb-4">Para continuar, instala la aplicación en tu dispositivo.</p>
            <button
              id="installBtn"
              onClick={onInstallClick}
              style={{ display: showInstall ? 'inline-flex' : 'none' }}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Instalar aplicación
            </button>
            {!showInstall && (
              <p className="text-xs text-slate-500 mt-2">Esperando disponibilidad de instalación…</p>
            )}
          </>
        )}

        {showFinalStep && (
          <div id="finalStep">
            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Ya está instalada!</h2>
            <p className="text-slate-700 mb-4">Cierra esta pestaña y abre la app desde el icono creado.</p>
            <button
              onClick={() => { try { window.open('', '_self'); window.close(); } catch (_) {} }}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900"
            >
              Entendido
            </button>
          </div>
        )}

        {installed && !showFinalStep && (
          <p className="text-slate-700">Abriendo la app…</p>
        )}
      </div>
    </div>
  );
}