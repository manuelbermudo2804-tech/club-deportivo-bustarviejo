import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar si es iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Detectar si ya está instalada
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Capturar evento de instalación (Chrome/Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar prompt solo si no lo han rechazado antes
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Mostrar instrucciones iOS si aplica
    if (isIOSDevice && !isInStandaloneMode) {
      const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
      if (!dismissed) {
        setShowInstallPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('¡App instalada correctamente!');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem(isIOS ? 'pwa-install-dismissed-ios' : 'pwa-install-dismissed', 'true');
  };

  if (isStandalone || !showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
      <Card className="border-2 border-orange-500 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-orange-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 mb-1">
                Instalar CD Bustarviejo
              </h3>
              
              {isIOS ? (
                <div className="text-sm text-slate-700 space-y-2">
                  <p>Para instalar en iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Toca el botón <strong>Compartir</strong> (cuadrado con flecha)</li>
                    <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong></li>
                    <li>Pulsa <strong>Añadir</strong></li>
                  </ol>
                </div>
              ) : (
                <p className="text-sm text-slate-700 mb-3">
                  Accede más rápido y recibe notificaciones push instalando la app
                </p>
              )}
              
              <div className="flex gap-2 mt-3">
                {!isIOS && deferredPrompt && (
                  <Button 
                    onClick={handleInstall}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Instalar
                  </Button>
                )}
                <Button 
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                >
                  Ahora no
                </Button>
              </div>
            </div>
            
            <button 
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}