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
      console.log('[Notif] Permiso detectado:', Notification.permission);

      // Verificar si ya tiene permiso O si el usuario ya activó antes en BD
      if (Notification.permission === 'granted') {
        console.log('[Notif] Ya tiene permiso del navegador');
        setIsSubscribed(true);
      } else {
        // Verificar en BD si ya lo activó antes
        try {
          const user = await base44.auth.me();
          if (user?.push_enabled === true) {
            console.log('[Notif] Usuario tiene push_enabled en BD, mostrando botones');
            setIsSubscribed(true);
          }
        } catch (e) {
          console.log('[Notif] Error verificando usuario:', e);
        }
      }
    } catch (error) {
      console.log('[Notif] Error checking support:', error);
    }
  };

  // Convertir VAPID key de base64 a Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    console.log('[Notif] Iniciando suscripción...');
    setIsLoading(true);

    try {
      // Verificar permiso actual
      console.log('[Notif] Permiso actual:', Notification.permission);
      
      let permission = Notification.permission;
      
      // Si no está concedido, solicitarlo
      if (permission !== 'granted') {
        console.log('[Notif] Solicitando permiso...');
        permission = await Notification.requestPermission();
        console.log('[Notif] Resultado permiso:', permission);
      }
      
      if (permission === 'denied') {
        toast.error("❌ Permiso bloqueado. Ve a configuración del navegador → Notificaciones → Permitir este sitio");
        setIsLoading(false);
        return;
      }

      // Registrar Service Worker y obtener suscripción Web Push
      let subscription = null;
      
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        console.log('[Notif] Registrando Service Worker...');
        alert("Paso 1: Obteniendo VAPID key...");
        
        try {
          // Obtener VAPID key del backend
          const vapidResponse = await base44.functions.invoke('getVapidKey', {});
          const vapidPublicKey = vapidResponse.data?.vapidKey;
          
          alert("Paso 2: VAPID key: " + (vapidPublicKey ? "OK" : "FALTA"));
          
          if (vapidPublicKey) {
            console.log('[Notif] VAPID key obtenida');
            
            // Registrar SW
            alert("Paso 3: Registrando Service Worker...");
            const registration = await navigator.serviceWorker.register('/sw.js').catch((e) => {
              alert("Error SW: " + e.message);
              return null;
            });
            
            if (registration) {
              await navigator.serviceWorker.ready;
              console.log('[Notif] SW registrado');
              alert("Paso 4: SW registrado, creando suscripción...");
              
              // Crear suscripción push
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
              });
              
              alert("Paso 5: Suscripción creada: " + subscription.endpoint.substring(0, 50) + "...");
              console.log('[Notif] Suscripción creada:', subscription.endpoint);
            } else {
              alert("Error: No se pudo registrar el SW");
            }
          }
        } catch (swError) {
          alert("Error en suscripción: " + swError.message);
          console.log('[Notif] No se pudo crear suscripción push:', swError.message);
        }
      } else {
        alert("PushManager no soportado en este navegador");
      }

      console.log('[Notif] Guardando en usuario...');
      alert("Paso 6: Guardando. Suscripción: " + (subscription ? "SÍ" : "NO"));
      
      // Guardar en el usuario - con o sin suscripción
      const updateData = {
        push_enabled: true,
        push_subscribed_at: new Date().toISOString()
      };
      
      if (subscription) {
        updateData.fcm_token = JSON.stringify(subscription);
      }
      
      await base44.auth.updateMe(updateData);
      alert("Paso 7: Guardado completado");

      console.log('[Notif] Usuario actualizado, mostrando notificación...');

      setIsSubscribed(true);
      setShowDialog(false);
      toast.success(subscription ? "✅ ¡Notificaciones Push activadas!" : "✅ ¡Notificaciones locales activadas!");

      // Mostrar notificación de prueba
      try {
        new Notification("🎉 CD Bustarviejo", {
          body: subscription 
            ? "Recibirás notificaciones incluso con la app cerrada" 
            : "Recibirás notificaciones cuando la app esté abierta",
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
        });
      } catch (notifError) {
        console.log('[Notif] Error mostrando notificación:', notifError);
      }

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

  const sendTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification("🎉 CD Bustarviejo - Prueba", {
        body: "¡Las notificaciones funcionan correctamente!",
        icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
      });
      toast.success("✅ Notificación local enviada (solo este dispositivo)");
    }
  };

  const sendRemotePushTest = async () => {
    console.log("🚀 [PUSH TEST] Iniciando envío de push...");
    alert("Iniciando envío de push...");
    
    try {
      const user = await base44.auth.me();
      console.log("🚀 [PUSH TEST] Usuario:", user?.email);
      
      if (!user?.email) {
        alert("Error: No se pudo obtener el usuario");
        return;
      }
      
      alert("Llamando a sendWebPush...");
      
      const result = await base44.functions.invoke('sendWebPush', {
        title: "🧪 Prueba de Push - CD Bustarviejo",
        body: "¡Esta notificación llegó correctamente a tu dispositivo!",
        recipientEmails: [user.email],
        url: null,
        data: { tipo: "test" }
      });
      
      console.log("🚀 [PUSH TEST] Resultado:", result);
      alert("Resultado: " + JSON.stringify(result.data));
      
      if (result.data?.success || result.data?.sent > 0) {
        toast.success(`✅ Push enviado - revisa tu móvil`);
      } else {
        toast.error("No se pudo enviar el push: " + (result.data?.error || "sin suscripción"));
      }
    } catch (error) {
      console.error("🚀 [PUSH TEST] Error:", error);
      alert("Error: " + error.message);
    }
  };

  return (
    <>
      {isSubscribed ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-300 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium text-sm">Notificaciones Activadas</span>
            </div>
          </div>
          <Button
            onClick={sendRemotePushTest}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Bell className="w-4 h-4 mr-2" />
            📲 Enviar Push a mi móvil
          </Button>
          <Button
            onClick={sendTestNotification}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notificación local (este dispositivo)
          </Button>
          <Button
            onClick={async () => {
              await base44.auth.updateMe({ push_enabled: false, fcm_token: null });
              setIsSubscribed(false);
              alert("Estado reseteado. Ahora pulsa 'Activar Notificaciones Push'");
            }}
            variant="outline"
            className="w-full text-red-600 border-red-300"
            size="sm"
          >
            🔄 Resetear y volver a activar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={subscribeToPush}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 font-bold shadow-lg"
            size="default"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span>Activando...</span>
              </>
            ) : (
              <>
                <Bell className="w-5 h-5 mr-2" />
                <span>🔔 Activar Notificaciones Push</span>
              </>
            )}
          </Button>
          {Notification.permission === 'denied' && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800">
              ⚠️ <strong>Notificaciones bloqueadas:</strong> Ve a la configuración del navegador → Permisos → Notificaciones → Permitir para este sitio
            </div>
          )}
          {Notification.permission === 'granted' && !isSubscribed && (
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
              ⚠️ Tienes permiso pero no estás suscrito. Pulsa el botón de arriba.
            </div>
          )}
        </div>
      )}

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