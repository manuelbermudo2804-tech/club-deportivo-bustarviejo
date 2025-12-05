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

      // Verificar en BD si ya está suscrito
      try {
        const user = await base44.auth.me();
        if (user?.push_enabled === true && user?.fcm_token) {
          setIsSubscribed(true);
        }
      } catch (e) {
        console.log('[Notif] Error verificando usuario:', e);
      }
    } catch (error) {
      console.log('[Notif] Error checking support:', error);
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);

    try {
      // Solicitar permiso
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }
      
      if (permission === 'denied') {
        toast.error("❌ Permiso bloqueado. Ve a configuración del navegador → Notificaciones → Permitir este sitio");
        setIsLoading(false);
        return;
      }

      // Guardar que quiere notificaciones (las recibirá cuando la app esté abierta)
      // Para push real con app cerrada, necesitaríamos una app nativa
      const updateData = {
        push_enabled: true,
        push_subscribed_at: new Date().toISOString(),
        device_id: 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        // Marcamos que es web para diferenciar de futuras apps nativas
        notification_type: 'web_local'
      };
      
      await base44.auth.updateMe(updateData);

      setIsSubscribed(true);
      setShowDialog(false);
      toast.success("✅ ¡Notificaciones activadas!");

      // Mostrar notificación de prueba
      new Notification("🎉 CD Bustarviejo", {
        body: "Recibirás notificaciones mientras uses la app",
        icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
      });

    } catch (error) {
      console.error("[Notif] Error:", error);
      toast.error("Error: " + error.message);
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