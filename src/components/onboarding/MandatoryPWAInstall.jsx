import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Check } from "lucide-react";

export default function MandatoryPWAInstall({ onInstalled }) {
  const [isChecking, setIsChecking] = useState(false);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  const checkInstallation = useCallback(() => {
    setIsChecking(true);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    
    if (isStandalone) {
      setTimeout(() => {
        localStorage.setItem('pwaInstalled', 'true');
        onInstalled();
      }, 500);
    } else {
      setTimeout(() => setIsChecking(false), 1000);
    }
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
                Es un paso obligatorio para recibir notificaciones y tener la mejor experiencia.
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
                    <li className="flex gap-3 items-center"><span className="font-bold bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span><span className="text-slate-700">Pulsa el botón <strong>Compartir</strong> (↑)</span></li>
                    <li className="flex gap-3 items-center"><span className="font-bold bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span><span className="text-slate-700">Busca y pulsa <strong>"Añadir a pantalla de inicio"</strong></span></li>
                    <li className="flex gap-3 items-center"><span className="font-bold bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span><span className="text-slate-700">Confirma pulsando <strong>"Añadir"</strong></span></li>
                    </ol>
                </>
                ) : isAndroid ? (
                <>
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" className="w-5 h-5" />
                    Android (en Chrome)
                    </h2>
                    <ol className="space-y-2 text-sm">
                    <li className="flex gap-3 items-center"><span className="font-bold bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span><span className="text-slate-700">Pulsa el <strong>menú</strong> (⋮) arriba a la derecha</span></li>
                    <li className="flex gap-3 items-center"><span className="font-bold bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span><span className="text-slate-700">Pulsa <strong>"Instalar aplicación"</strong></span></li>
                    <li className="flex gap-3 items-center"><span className="font-bold bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span><span className="text-slate-700">Confirma pulsando <strong>"Instalar"</strong></span></li>
                    </ol>
                </>
                ) : (
                <p className="text-slate-600 text-sm">Usa Safari en iOS o Chrome en Android para instalar la app.</p>
                )}
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 text-xs text-blue-800 text-center">
                Tras instalar, <strong>cierra esta ventana del navegador</strong>, abre la app desde tu pantalla de inicio y se continuará automáticamente.
            </div>

            {/* Button */}
            <Button
                onClick={checkInstallation}
                disabled={isChecking}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 text-base rounded-xl shadow-lg"
            >
                {isChecking ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Comprobando...
                </>
                ) : (
                <>
                    <Check className="w-5 h-5 mr-2" />
                    Comprobar si ya está instalada
                </>
                )}
            </Button>
            </div>
        </DialogContent>
        </Dialog>
    </div>
  );
}