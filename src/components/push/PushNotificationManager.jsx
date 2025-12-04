import React, { useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    try {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) {
        console.log('[Notif] Notificaciones no soportadas');
        return;
      }

      setIsSupported(true);

      // Verificar si ya tiene permiso
      if (Notification.permission === 'granted') {
        console.log('[Notif] Ya tiene permiso');
        setIsSubscribed(true);
      }
    } catch (error) {
      console.log('[Notif] Error checking support:', error);
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);

    try {
      // Solicitar permiso
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error("Permiso de notificaciones denegado");
        setIsLoading(false);
        return;
      }

      // Guardar en el usuario que activó notificaciones
      await base44.auth.updateMe({
        push_enabled: true,
        push_subscribed_at: new Date().toISOString()
      });

      setIsSubscribed(true);
      setShowDialog(false);
      toast.success("✅ ¡Notificaciones activadas!");

      // Mostrar notificación de prueba
      new Notification("🎉 CD Bustarviejo", {
        body: "Recibirás notificaciones cuando la app esté abierta o en segundo plano",
        icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
      });

    } catch (error) {
      console.error("[Notif] Error:", error);
      toast.error("Error al activar notificaciones: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-slate-500 p-3 bg-slate-100 rounded-lg">
        ⚠️ Las notificaciones no están soportadas en este navegador
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => isSubscribed ? null : setShowDialog(true)}
        variant={isSubscribed ? "outline" : "default"}
        className={`w-full ${isSubscribed ? "bg-white text-slate-900 border-green-500" : "bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800"} font-bold shadow-lg`}
        size="default"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            <span>Activando...</span>
          </>
        ) : isSubscribed ? (
          <>
            <Check className="w-5 h-5 mr-2 text-green-600" />
            <span>Notificaciones Activadas</span>
          </>
        ) : (
          <>
            <BellOff className="w-5 h-5 mr-2" />
            <span>Activar Notificaciones Push</span>
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-orange-600" />
              Activar Notificaciones Push
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p className="text-base">
                Recibirás notificaciones instantáneas en tu dispositivo para:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span><strong>Convocatorias de partidos</strong> - Sé el primero en saber</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-2xl">💬</span>
                  <span><strong>Mensajes del chat</strong> - Como WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <span><strong>Recordatorios de pagos</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-2xl">📢</span>
                  <span><strong>Anuncios urgentes</strong></span>
                </li>
              </ul>
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-sm text-green-800">
                  <strong>✅ Funciona incluso con la app cerrada</strong> - Recibirás notificaciones en tiempo real
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Ahora no
            </Button>
            <Button
              onClick={subscribeToPush}
              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Activar Ahora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}