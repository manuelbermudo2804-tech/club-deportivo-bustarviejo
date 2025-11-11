import React from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MatchAppLink({ className = "" }) {
  const [showDesktopDialog, setShowDesktopDialog] = React.useState(false);

  const handleMatchAppClick = (e) => {
    e.preventDefault();
    
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS: Ir directamente a App Store
      window.location.href = "https://apps.apple.com/es/app/matchapp/id907431871";
      
    } else if (isAndroid) {
      // Android: Ir directamente a Google Play
      window.location.href = "https://play.google.com/store/apps/details?id=com.justteamup.matchapp";
      
    } else {
      // Desktop: Mostrar diálogo con opciones
      setShowDesktopDialog(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleMatchAppClick}
        className={`bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xl ${className}`}
      >
        <Smartphone className="w-5 h-5 mr-2" />
        Descargar MatchApp
      </Button>

      <Dialog open={showDesktopDialog} onOpenChange={setShowDesktopDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Smartphone className="w-6 h-6 text-orange-600" />
              MatchApp - Solo Móvil
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p className="text-base">
                MatchApp es una aplicación <strong>exclusiva para móviles</strong> donde puedes ver horarios, resultados y clasificaciones del <strong>CD Bustarviejo</strong>.
              </p>
              
              <div className="space-y-3 pt-2">
                <p className="font-semibold text-slate-900">Descarga la app desde tu móvil:</p>
                
                <a
                  href="https://apps.apple.com/es/app/matchapp/id907431871"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🍎</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400">Disponible en</p>
                    <p className="text-white font-semibold">App Store</p>
                  </div>
                </a>

                <a
                  href="https://play.google.com/store/apps/details?id=com.justteamup.matchapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-2xl">▶️</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-green-100">Disponible en</p>
                    <p className="text-white font-semibold">Google Play</p>
                  </div>
                </a>
              </div>

              <div className="bg-orange-50 rounded-lg p-3 mt-4">
                <p className="text-sm text-orange-900">
                  💡 <strong>Consejo:</strong> Una vez instalada, busca <strong>"CD Bustarviejo"</strong> dentro de la app
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}