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
    const timeout = setTimeout(() => {
      console.warn('⚠️ checkSubscription timeout - forzando salida de checking');
      setChecking(false);
    }, 3000);

    try {
      if (!('Notification' in window)) {
        clearTimeout(timeout);
        setChecking(false);
        return;
      }

      setPermission(Notification.permission);

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        clearTimeout(timeout);
        setChecking(false);
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      if (!registrations || registrations.length === 0) {
        console.log('No hay service worker registrado');
        clearTimeout(timeout);
        setChecking(false);
        return;
      }

      const registration = registrations[0];
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      console.log('✅ Estado suscripción:', !!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      clearTimeout(timeout);
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
    console.log('🔔 CLICK EN BOTÓN DETECTADO');
    setLoading(true);
    
    const timeout = setTimeout(() => {
      console.error('⚠️ Timeout en subscribeToPush - forzando reset');
      setLoading(false);
      toast.error('Operación tardó demasiado. Intenta de nuevo.');
    }, 15000);

    try {
      console.log('🔔 Iniciando suscripción push...');
      
      if (!('serviceWorker' in navigator)) {
        clearTimeout(timeout);
        toast.error('Tu navegador no soporta notificaciones push');
        setLoading(false);
        return;
      }

      console.log('🔔 Pidiendo permiso...');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      console.log('🔔 Permiso obtenido:', perm);

      if (perm !== 'granted') {
        clearTimeout(timeout);
        toast.error('Permiso denegado. Actívalo en ajustes del navegador.');
        setLoading(false);
        return;
      }

      console.log('🔔 Preparando service worker...');
      let registration;
      const regs = await navigator.serviceWorker.getRegistrations();
      if (!regs || regs.length === 0) {
        console.log('🔔 Registrando service worker...');
        await navigator.serviceWorker.register('/functions/sw', { scope: '/' });
        registration = await navigator.serviceWorker.ready;
      } else {
        registration = await navigator.serviceWorker.ready;
      }
      console.log('🔔 Service Worker listo');

      console.log('🔔 Obteniendo clave VAPID...');
      const keyResponse = await base44.functions.invoke('getVapidPublicKey', {});
      const vapidPublicKey = keyResponse.data.publicKey;
      console.log('🔔 Clave VAPID obtenida');
      
      if (!vapidPublicKey) {
        clearTimeout(timeout);
        console.error('❌ VAPID_PUBLIC_KEY no configurada');
        toast.error('Configuración incompleta');
        setLoading(false);
        return;
      }

      console.log('🔔 Suscribiendo...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      console.log('🔔 Suscripción creada');

      console.log('🔔 Guardando en BD...');
      const response = await base44.functions.invoke('registerPushSubscription', {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent
      });

      clearTimeout(timeout);
      
      if (response.data.success) {
        setIsSubscribed(true);
        toast.success('✅ Notificaciones activadas');
        console.log('✅ Completado');
      } else {
        toast.error('Error al guardar');
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('❌ Error:', error);
      toast.error('Error: ' + (error.message || 'Desconocido'));
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔔 Click desactivar detectado');
            unsubscribeFromPush();
          }}
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔔 Click activar detectado');
            subscribeToPush();
          }}
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