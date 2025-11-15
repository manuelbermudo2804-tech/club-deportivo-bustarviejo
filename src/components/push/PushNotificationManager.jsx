import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setIsSubscribed(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error("Tu navegador no soporta notificaciones");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setIsSubscribed(true);
        toast.success("✅ Notificaciones activadas");
        
        // Test notification
        new Notification("CD Bustarviejo", {
          body: "Recibirás notificaciones de pagos, convocatorias y mensajes importantes",
          icon: "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png"
        });
      } else {
        toast.error("Permiso denegado");
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      toast.error("Error al activar notificaciones");
    }
  };

  if (!isSupported) return null;

  return (
    <Button
      onClick={requestPermission}
      disabled={isSubscribed}
      variant={isSubscribed ? "outline" : "default"}
      className={`${isSubscribed ? "bg-white text-slate-900" : "bg-white text-orange-600 hover:bg-orange-50"} font-bold shadow-lg`}
      size="default"
    >
      {isSubscribed ? (
        <>
          <Bell className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline">Notificaciones ON</span>
          <span className="sm:hidden">ON</span>
        </>
      ) : (
        <>
          <BellOff className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline">Activar Alertas</span>
          <span className="sm:hidden">Activar</span>
        </>
      )}
    </Button>
  );
}