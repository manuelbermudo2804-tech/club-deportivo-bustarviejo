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

// Firebase config - CD Bustarviejo
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDummy", // No se necesita para FCM web
  authDomain: "cd-bustarviejo.firebaseapp.com",
  projectId: "cd-bustarviejo",
  storageBucket: "cd-bustarviejo.appspot.com",
  messagingSenderId: "110115697542413361994",
  appId: "1:110115697542413361994:web:dummy"
};

const VAPID_KEY = "BJOK4moFRVcr5yeCDD10k-bB2YGifV2HAxy50YsXWlpxdW-ww3kPQJgPBsn34pTRkDtt7hY0vQYQLWy1t6h22Ow";

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      // Verificar si ya tiene permiso y token guardado
      if (Notification.permission === 'granted') {
        try {
          const user = await base44.auth.me();
          if (user?.fcm_token) {
            setIsSubscribed(true);
          }
        } catch (e) {
          console.log('Error checking subscription:', e);
        }
      }
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
      throw error;
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error("Tu navegador no soporta notificaciones push");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Solicitar permiso
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error("Permiso denegado para notificaciones");
        setIsLoading(false);
        return;
      }

      // 2. Registrar Service Worker
      const swRegistration = await registerServiceWorker();
      
      // 3. Suscribirse a push
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
      });

      // 4. Obtener el endpoint y guardarlo como "fcm_token" (en realidad es el endpoint completo)
      const subscriptionData = subscription.toJSON();
      
      // 5. Guardar en el usuario
      await base44.auth.updateMe({
        fcm_token: JSON.stringify(subscriptionData),
        push_enabled: true,
        push_subscribed_at: new Date().toISOString()
      });

      setIsSubscribed(true);
      setShowDialog(false);
      
      toast.success("✅ ¡Notificaciones push activadas!");
      
      // Notificación de prueba
      new Notification("🎉 CD Bustarviejo", {
        body: "Recibirás notificaciones de convocatorias, pagos y mensajes importantes",
        icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
        badge: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
      });

    } catch (error) {
      console.error("Error activating push:", error);
      toast.error("Error al activar notificaciones: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Convertir VAPID key a Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
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
  };

  if (!isSupported) return null;

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
              onClick={requestPermission}
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