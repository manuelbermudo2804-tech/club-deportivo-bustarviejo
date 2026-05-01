import React, { useEffect, useRef, useState } from "react";
import { Smartphone, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_URL = "app.cdbustarviejo.com";
const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isSafari() {
  const ua = navigator.userAgent;
  // Safari real: tiene "Safari" pero NO tiene "CriOS" (Chrome), "FxiOS" (Firefox), "EdgiOS" (Edge)
  // Y no está en un WebView (no tiene "FBAN" Facebook, "FBAV", "Instagram", "Line/", "GSA/" Google app)
  const isSafariBrowser = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const isWebView = /FBAN|FBAV|Instagram|Line\/|GSA\/|DuckDuckGo/.test(ua);
  return isSafariBrowser && !isWebView;
}

function isIOSWebView() {
  // En iOS, si NO es Safari y NO es standalone, probablemente es un WebView
  return isIOS() && !isSafari() && !isStandalone();
}

export default function PwaEntry() {
  const deferredPromptRef = useRef(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [showFinalStep, setShowFinalStep] = useState(false);
  const [copied, setCopied] = useState(false);

  // PROTECCIÓN 1: Si ya está instalada (standalone), redirigir a la app inmediatamente
  useEffect(() => {
    if (isStandalone()) {
      // Limpiar cualquier caché que pueda interferir
      try {
        if ('caches' in window) {
          caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
        }
      } catch {}
      window.location.replace('/');
    }
  }, []);


  
  const iosWebView = isIOS() && !isSafari() && !isStandalone();
  const iosSafari = isIOS() && isSafari() && !isStandalone();
  const isAndroid = /android/i.test(navigator.userAgent);

  // Inject manifest and theme-color
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/functions/manifest';
      document.head.appendChild(link);
    }
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#1e1e1e');
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/functions/sw', { scope: '/' }).catch(() => {});
    }
  }, []);

  // Handle Android install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

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

  // If already installed, redirect to root
  useEffect(() => {
    if (installed) {
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${APP_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = `https://${APP_URL}`;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // ===== iOS WebView: usuario viene del email y cayó en navegador interno =====
  if (iosWebView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 text-center space-y-5">
          <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-20 h-20 rounded-2xl mx-auto shadow-lg object-cover" />
          
          <div>
            <h1 className="text-2xl font-black text-slate-900">¡Casi lo tienes! 👋</h1>
            <p className="text-slate-600 mt-2 text-sm leading-relaxed">
              Para instalar la app del club necesitas abrir esta dirección en <strong className="text-blue-700">Safari</strong>.
            </p>
          </div>

          {/* Paso 1: Copiar */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">1</span>
              <p className="font-bold text-blue-900">Copia esta dirección:</p>
            </div>
            
            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                copied 
                  ? 'bg-green-100 border-green-400 text-green-800' 
                  : 'bg-white border-blue-300 text-slate-900 active:bg-blue-100'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <span className="font-bold text-lg">¡Copiado! ✅</span>
                </>
              ) : (
                <>
                  <Copy className="w-6 h-6 text-blue-600" />
                  <span className="font-bold text-lg">{APP_URL}</span>
                </>
              )}
            </button>
            
            {copied && (
              <p className="text-green-700 text-sm font-medium animate-pulse">
                ✅ Dirección copiada al portapapeles
              </p>
            )}
          </div>

          {/* Paso 2: Abrir Safari */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <span className="bg-slate-700 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">2</span>
              <p className="font-bold text-slate-900">Abre Safari y pega la dirección</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/52/Safari_browser_logo.svg" alt="Safari" className="w-10 h-10" />
              <p className="text-slate-600 text-sm text-left">
                Busca el icono de Safari en tu iPhone, ábrelo, pulsa en la barra de arriba y <strong>pega</strong> la dirección.
              </p>
            </div>
          </div>

          {/* Paso 3: Instalar */}
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">3</span>
              <p className="font-bold text-green-900">Desde Safari, instala la app</p>
            </div>
            <p className="text-green-800 text-xs leading-relaxed">
              Pulsa <strong>Compartir</strong> (↑) → <strong>"Añadir a pantalla de inicio"</strong> → <strong>"Añadir"</strong>
            </p>
          </div>

          <p className="text-xs text-slate-400">
            Esto solo es necesario la primera vez. Después abrirás la app desde su icono.
          </p>
        </div>
      </div>
    );
  }

  // ===== iOS Safari: puede instalar directamente =====
  if (iosSafari) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 text-center space-y-5">
          <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-20 h-20 rounded-2xl mx-auto shadow-lg object-cover" />
          
          <div>
            <h1 className="text-2xl font-black text-slate-900">📲 Instala la App</h1>
            <p className="text-slate-600 mt-2 text-sm">
              ¡Estás en Safari! Solo tienes que seguir estos 3 pasos:
            </p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">1</span>
              <p className="text-sm text-slate-700">Pulsa el botón <strong>Compartir</strong> (el cuadrado con flecha ↑ que está abajo en la pantalla)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">2</span>
              <p className="text-sm text-slate-700">Desliza hacia abajo y pulsa <strong>"Añadir a pantalla de inicio"</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">3</span>
              <p className="text-sm text-slate-700">Pulsa <strong>"Añadir"</strong> arriba a la derecha. <strong>¡Listo!</strong> 🎉</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-green-800 text-xs">
              ✅ Después abre la app desde el nuevo icono "CD Bustarviejo" en tu pantalla de inicio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== Android / Desktop: flujo normal con beforeinstallprompt =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 text-center space-y-5">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-20 h-20 rounded-2xl mx-auto shadow-lg object-cover" />

        {!installed && !showFinalStep && (
          <>
            <h1 className="text-2xl font-black text-slate-900">📲 Instala la App del Club</h1>
            <p className="text-slate-600 text-sm">
              Pulsa el botón para instalar la aplicación del CD Bustarviejo en tu móvil.
            </p>
            
            {showInstall ? (
              <Button
                onClick={onInstallClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg rounded-xl shadow-lg"
              >
                <Smartphone className="w-6 h-6 mr-2" />
                Instalar Aplicación
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 space-y-4 text-left">
                  <p className="text-sm text-slate-700 text-center font-medium">
                    Si no aparece el botón de instalar automáticamente:
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">1</span>
                    <p className="text-sm text-slate-700">Pulsa el <strong>menú</strong> (⋮ tres puntos arriba a la derecha)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">2</span>
                    <p className="text-sm text-slate-700">Pulsa <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong></p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 animate-pulse">Cargando instalador…</p>
              </div>
            )}
          </>
        )}

        {showFinalStep && (
          <div className="space-y-4">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-black text-slate-900">¡App instalada!</h2>
            <p className="text-slate-700">
              Cierra esta ventana y abre la app desde el icono <strong>"CD Bustarviejo"</strong> en tu pantalla de inicio.
            </p>
            <button
              onClick={() => { try { window.open('', '_self'); window.close(); } catch {} }}
              className="px-6 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-900 font-bold"
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