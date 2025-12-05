import React, { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setIsSupported(true);
    
    if (Notification.permission === 'granted') {
      const user = await base44.auth.me().catch(() => null);
      if (user?.push_enabled) setIsSubscribed(true);
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        toast.error("❌ Permiso bloqueado en el navegador");
        return;
      }

      await base44.auth.updateMe({ push_enabled: true });
      setIsSubscribed(true);
      toast.success("✅ Notificaciones activadas");
      
      new Notification("🎉 CD Bustarviejo", {
        body: "Recibirás notificaciones mientras uses la app",
        icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
      });
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-slate-500 p-3 bg-slate-100 rounded-lg">
        ⚠️ Notificaciones no soportadas en este navegador
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isSubscribed ? (
        <>
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-300 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium text-sm">Notificaciones Activadas</span>
          </div>
          <p className="text-xs text-slate-600 p-2 bg-slate-50 rounded">
            ℹ️ Recibirás notificaciones mientras tengas la app abierta.
          </p>
          <Button
            onClick={() => {
              new Notification("🎉 CD Bustarviejo - Prueba", {
                body: "¡Las notificaciones funcionan!",
                icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
              });
            }}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Bell className="w-4 h-4 mr-2" />
            Probar notificación
          </Button>
          <Button
            onClick={async () => {
              await base44.auth.updateMe({ push_enabled: false });
              setIsSubscribed(false);
              toast.success("Notificaciones desactivadas");
            }}
            variant="outline"
            className="w-full text-red-600 border-red-300"
            size="sm"
          >
            Desactivar
          </Button>
        </>
      ) : (
        <Button
          onClick={subscribeToPush}
          className="w-full bg-orange-600 hover:bg-orange-700"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
          Activar Notificaciones
        </Button>
      )}
    </div>
  );
}