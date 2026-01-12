import React, { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Smartphone } from "lucide-react";

export default function MandatoryPWAInstall({ onInstalled }) {
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  // Auto-detección cada 500ms cuando se abre desde la app instalada
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
      if (isStandalone) {
        localStorage.setItem('pwaInstalled', 'true');
        clearInterval(checkInterval);
        setTimeout(() => onInstalled(), 300);
      }
    }, 500);
    return () => clearInterval(checkInterval);
  }, [onInstalled]);

  return (
    <div className="w-screen h-screen bg-slate-100">
      <Dialog open={true} onOpenChange={() => {}} modal={true}>
        <DialogContent hideClose={true} className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <div className="text-center space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="space-y-3">
              <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Smartphone className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">📲 Instala la App del Club</h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                Es rápido y obligatorio para recibir notificaciones.
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 text-left space-y-4">
              {isIOS ? (
                <>
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-5 h-5" />
                    iPhone / iPad (en Safari)
                  </h2>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-3 items-center"><span className="font-bold bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span><span className="text-slate-700">Pulsa <strong>Compartir ↑</strong></span></li>
                    <li className="flex gap-3 items-center"><span className="font-bold bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span><span className="text-slate-700">Pulsa <strong>"Añadir a pantalla de inicio"</strong></span></li>
                    <li className="flex gap-3 items-center"><span className="font-bold bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span><span className="text-slate-700">Pulsa <strong>"Añadir"</strong></span></li>
                  </ol>
                </>
              ) : isAndroid ? (
                <>
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" className="w-5 h-5" />
                    Android (en Chrome)
                  </h2>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-3 items-center"><span className="font-bold bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span><span className="text-slate-700">Pulsa <strong>menú ⋮</strong></span></li>
                    <li className="flex gap-3 items-center"><span className="font-bold bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span><span className="text-slate-700">Pulsa <strong>"Instalar"</strong></span></li>
                    <li className="flex gap-3 items-center"><span className="font-bold bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span><span className="text-slate-700">Confirma en el popup</span></li>
                  </ol>
                </>
              ) : (
                <p className="text-slate-600 text-sm">Usa Safari en iOS o Chrome en Android.</p>
              )}
            </div>

            {/* Key instruction */}
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-sm text-green-800 text-center font-semibold">
              ✅ <strong>Luego abre la app desde tu pantalla de inicio</strong> (no desde el navegador)
            </div>

            <p className="text-xs text-slate-500 text-center">
              Una vez abras la app, continuará automáticamente...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}