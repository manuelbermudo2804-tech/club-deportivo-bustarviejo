import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PushNotificationManager() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    setLoading(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setLoading(false);
        return;
      }

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
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
      setLoading(false);
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
      // Verificar soporte básico
      if (!('serviceWorker' in navigator)) {
        toast.error('Tu navegador no soporta notificaciones push');
        setLoading(false);
        return;
      }

      // Pedir permiso
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Permiso denegado. Actívalo en ajustes del navegador.');
        setLoading(false);
        return;
      }

      // Verificar service worker - timeout de 10s
      const registrationPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service Worker timeout')), 10000)
      );
      
      const registration = await Promise.race([registrationPromise, timeoutPromise]);

      // Obtener clave pública VAPID desde variable de entorno del backend
      let vapidPublicKey;
      try {
        const keyResponse = await base44.functions.invoke('getVapidPublicKey', {});
        vapidPublicKey = keyResponse.data.publicKey;
        
        if (!vapidPublicKey) {
          toast.error('VAPID_PUBLIC_KEY no configurada en el servidor');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error obteniendo VAPID key:', error);
        toast.error('Error de configuración. Contacta con el administrador.');
        setLoading(false);
        return;
      }

      // Suscribirse a push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Guardar en BD
      const response = await base44.functions.invoke('registerPushSubscription', {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent
      });

      if (response.data.success) {
        setIsSubscribed(true);
        toast.success('✅ Notificaciones activadas');
      } else {
        toast.error('Error al registrar suscripción');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
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