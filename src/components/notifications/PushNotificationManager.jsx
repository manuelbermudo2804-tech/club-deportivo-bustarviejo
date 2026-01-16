import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PushNotificationManager() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      if (!('Notification' in window)) {
        setChecking(false);
        return;
      }

      setPermission(Notification.permission);

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setChecking(false);
        return;
      }

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        timeoutPromise
      ]);
      
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setChecking(false);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      console.log('🔔 Iniciando suscripción push...');
      
      // Verificar soporte básico
      if (!('serviceWorker' in navigator)) {
        toast.error('Tu navegador no soporta notificaciones push');
        setLoading(false);
        return;
      }

      // Pedir permiso
      console.log('🔔 Pidiendo permiso al navegador...');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      console.log('🔔 Permiso:', perm);

      if (perm !== 'granted') {
        toast.error('Permiso denegado. Actívalo en ajustes del navegador.');
        setLoading(false);
        return;
      }

      // Verificar service worker - timeout de 10s
      console.log('🔔 Verificando service worker...');
      const registrationPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service Worker timeout')), 10000)
      );
      
      const registration = await Promise.race([registrationPromise, timeoutPromise]);
      console.log('🔔 Service Worker listo');

      // Obtener clave pública VAPID desde variable de entorno del backend
      console.log('🔔 Obteniendo clave VAPID...');
      let vapidPublicKey;
      try {
        const keyResponse = await base44.functions.invoke('getVapidPublicKey', {});
        vapidPublicKey = keyResponse.data.publicKey;
        console.log('🔔 Clave VAPID obtenida');
        
        if (!vapidPublicKey) {
          console.error('❌ VAPID_PUBLIC_KEY no configurada');
          toast.error('VAPID_PUBLIC_KEY no configurada en el servidor');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('❌ Error obteniendo VAPID key:', error);
        toast.error('Error de configuración. Contacta con el administrador.');
        setLoading(false);
        return;
      }

      // Suscribirse a push
      console.log('🔔 Suscribiendo al push manager...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      console.log('🔔 Suscripción creada');

      // Guardar en BD
      console.log('🔔 Guardando en BD...');
      const response = await base44.functions.invoke('registerPushSubscription', {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent
      });
      console.log('🔔 Respuesta BD:', response.data);

      if (response.data.success) {
        setIsSubscribed(true);
        toast.success('✅ Notificaciones activadas correctamente');
        console.log('✅ Suscripción completada');
      } else {
        console.error('❌ Error al registrar:', response.data);
        toast.error('Error al registrar suscripción');
      }
    } catch (error) {
      console.error('❌ Error completo subscribing to push:', error);
      const errorMsg = error.message || 'Error desconocido';
      toast.error('No se pudo activar: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.success('Notificaciones desactivadas');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Error al desactivar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  if (checking) {
    return (
      <div className="inline-block">
        <Button variant="outline" size="sm" disabled className="gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
        </Button>
      </div>
    );
  }

  return (
    <div className="inline-block">
      {isSubscribed ? (
        <Button
          variant="outline"
          size="sm"
          onClick={unsubscribeFromPush}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4 text-green-600" />
          )}
          <span className="hidden sm:inline">Avisos activos</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={subscribeToPush}
          disabled={loading}
          className="gap-2 animate-pulse"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BellOff className="w-4 h-4 text-orange-600" />
          )}
          <span className="hidden sm:inline">Activar avisos</span>
        </Button>
      )}
    </div>
  );
}