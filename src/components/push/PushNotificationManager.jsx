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

// VAPID public key - debe coincidir con la del backend
const VAPID_PUBLIC_KEY = "BLBz-xyz123"; // Se leerá del servidor

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    try {
      // Verificar soporte de Service Worker y Push
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator)) {
        console.log('[Push] Service Worker no soportado');
        return;
      }
      if (!('PushManager' in window)) {
        console.log('[Push] Push API no soportada');
        return;
      }

      setIsSupported(true);

      // Registrar Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      setRegistration(reg);
      console.log('[Push] Service Worker registrado');

      // Verificar si ya hay suscripción
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        console.log('[Push] Ya suscrito');
        setIsSubscribed(true);
      }
    } catch (error) {
      console.log('[Push] Error checking support:', error);
    }
  };

  const subscribeToPush = async () => {
    if (!registration) {
      toast.error("Service Worker no disponible");
      return;
    }

    setIsLoading(true);

    try {
      // Solicitar permiso
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error("Permiso de notificaciones denegado");
        setIsLoading(false);
        return;
      }

      // Obtener VAPID key del entorno o usar una por defecto
      // En producción, esto debería venir del servidor
      const vapidKey = urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
      );

      // Suscribirse a push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });

      console.log('[Push] Suscripción creada:', subscription);

      // Guardar la suscripción en el usuario
      const subscriptionJSON = JSON.stringify(subscription.toJSON());
      await base44.auth.updateMe({
        fcm_token: subscriptionJSON,
        push_enabled: true,
        push_subscribed_at: new Date().toISOString()
      });

      setIsSubscribed(true);
      setShowDialog(false);
      toast.success("✅ ¡Notificaciones push activadas!");

      // Mostrar notificación de prueba
      new Notification("🎉 CD Bustarviejo", {
        body: "Recibirás notificaciones de convocatorias, pagos y mensajes importantes",
        icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
      });

    } catch (error) {
      console.error("[Push] Error subscribing:", error);
      toast.error("Error al activar notificaciones: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Convertir VAPID key de base64 a Uint8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!isSupported) {
    return (
      <div className="text-sm text-slate-500 p-3 bg-slate-100 rounded-lg">
        ⚠️ Las notificaciones push no están soportadas en este navegador
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