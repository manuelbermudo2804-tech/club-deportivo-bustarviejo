import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, CheckCircle2 } from "lucide-react";

export default function MandatoryPWAInstall({ onInstalled }) {
        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
        const [step, setStep] = useState('instructions'); // 'instructions' -> 'waiting' -> success

        // Auto-detección cuando se abre desde la app instalada
        useEffect(() => {
          if (step !== 'waiting') return;

          const checkInterval = setInterval(() => {
            const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
            if (isStandalone) {
              localStorage.setItem('pwaInstalled', 'true');
              clearInterval(checkInterval);
              setStep('success');
              // Llamar callback después de 1.5s
              setTimeout(() => onInstalled(), 1500);
            }
          }, 300);
          return () => clearInterval(checkInterval);
        }, [step, onInstalled]);

  return (
    <div className="w-screen h-screen bg-slate-100">
      <Dialog open={true} onOpenChange={() => {}} modal={true}>
        <DialogContent hideClose={true} className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          {step === 'instructions' && (
            <div className="text-center space-y-6 p-4 sm:p-6">
              {/* Header */}
              <div className="space-y-3">
                <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">📲 Instala la App del Club</h1>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Pasos rápidos para instalar
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

              {/* CRITICAL WARNING */}
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2">
                <p className="text-red-900 font-bold text-center text-sm">⚠️ MUY IMPORTANTE</p>
                <p className="text-red-800 text-xs text-center leading-relaxed">
                  <strong>Una vez instalada, ya NO abras desde el navegador.</strong> Debes abrir siempre desde el <strong>ICONO en tu pantalla de inicio.</strong>
                </p>
                <p className="text-red-700 text-xs text-center italic">
                  El sistema sólo funciona si lo abres desde la app instalada.
                </p>
              </div>

              <Button
                onClick={() => setStep('waiting')}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-3 text-lg font-bold text-white"
              >
                ✅ Ya la tengo instalada
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Una vez pulses el botón, abre la app desde el icono en tu pantalla de inicio...
              </p>
            </div>
          )}

          {step === 'waiting' && (
            <div className="text-center space-y-6 p-4 sm:p-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <Smartphone className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Esperando...</h2>
                <p className="text-slate-600 text-sm">
                  Abre la app desde el <strong>icono en tu pantalla de inicio</strong>
                </p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                <p className="text-blue-800 text-sm text-center">
                  No desde el navegador, sino desde el <strong>icono instalado</strong> en tu pantalla de inicio.
                </p>
              </div>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6 p-4 sm:p-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-green-700">¡Perfecto!</h2>
                <p className="text-slate-600 text-sm">
                  La app está instalada y funcionando correctamente.
                </p>
              </div>
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                <p className="text-green-800 text-sm text-center font-semibold">
                  Continuando en la app... ⏳
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}