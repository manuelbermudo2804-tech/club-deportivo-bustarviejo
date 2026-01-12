import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Check } from "lucide-react";

export default function MandatoryPWAInstall({ onInstalled }) {
  const [step, setStep] = useState(1);
  const [installed, setInstalled] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  const checkInstallation = () => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || 
                        window.navigator.standalone === true;
    if (isStandalone) {
      setInstalled(true);
      localStorage.setItem('pwaInstalled', 'true');
      setTimeout(() => onInstalled(), 200); // Más rápido
    }
  };

  useEffect(() => {
    checkInstallation();
  }, []);

  // Auto-check cada 1s para detección más rápida
  useEffect(() => {
    const interval = setInterval(() => {
      if (!installed) checkInstallation();
    }, 1000);
    return () => clearInterval(interval);
  }, [installed]);

  return (
    <Dialog open={!installed} onOpenChange={() => {}} modal={true}>
      <DialogContent hideClose={true} className="max-w-md">
        <div className="text-center space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">📲 Instala la App</h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Para acceder a todas las funciones (convocatorias en tiempo real, pagos, documentos), necesitas instalar la aplicación en tu dispositivo.
            </p>
          </div>

          {/* Instructions por sistema operativo */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 text-left space-y-4">
            {isIOS ? (
              <>
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-5 h-5" />
                  iPhone / iPad
                </h2>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-bold bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span>
                    <span className="text-slate-700">Abre esta web en <strong>Safari</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span>
                    <span className="text-slate-700">Pulsa el botón <strong>Compartir</strong> (↑ abajo a la derecha)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span>
                    <span className="text-slate-700">Pulsa <strong>"Añadir a pantalla de inicio"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">4</span>
                    <span className="text-slate-700">Pulsa <strong>"Añadir"</strong> en la esquina superior derecha</span>
                  </li>
                </ol>
              </>
            ) : isAndroid ? (
              <>
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" className="w-5 h-5" />
                  Android
                </h2>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-bold bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span>
                    <span className="text-slate-700">Abre esta web en <strong>Chrome</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span>
                    <span className="text-slate-700">Pulsa el <strong>menú</strong> (⋮ arriba a la derecha)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span>
                    <span className="text-slate-700">Pulsa <strong>"Instalar app"</strong> o <strong>"Añadir a pantalla de inicio"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">4</span>
                    <span className="text-slate-700">Confirma pulsando <strong>"Instalar"</strong></span>
                  </li>
                </ol>
              </>
            ) : (
              <p className="text-slate-600 text-sm">Usa Safari en iOS o Chrome en Android para instalar la app.</p>
            )}
          </div>

          {/* Info box */}
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-bold text-green-900 text-sm">Con la app instalada tendrás:</p>
                <ul className="text-green-800 text-xs mt-1 space-y-1">
                  <li>✅ Convocatorias y alertas en tiempo real</li>
                  <li>✅ Acceso rápido desde tu pantalla de inicio</li>
                  <li>✅ Mejor experiencia y más rápido</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Button */}
          <Button
            onClick={checkInstallation}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 text-lg rounded-xl shadow-lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Ya la tengo instalada
          </Button>

          <p className="text-xs text-slate-500">
            Después de instalar, abre la app desde tu pantalla de inicio y pulsa el botón anterior.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}