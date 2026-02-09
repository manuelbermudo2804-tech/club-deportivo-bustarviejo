import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function PushNotificationSubscriber({ user }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verificar soporte de Web Push
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported && user?.email) {
      checkSubscription();
    }
  }, [user?.email]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.log('Error checking subscription:', err);
    }
  };

  const handleSubscribe = async () => {
    if (!user?.email) {
      alert('Debes estar logueado para activar notificaciones');
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('Service Worker no disponible');

      // Solicitar suscripción al push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY || 
                             (window.__VAPID_PUBLIC_KEY ? 
                              Uint8Array.from(atob(window.__VAPID_PUBLIC_KEY), c => c.charCodeAt(0)) : null)
      });

      if (!subscription) throw new Error('No se pudo crear suscripción');

      // Guardar suscripción en base de datos
      await base44.entities.PushSubscription.create({
        usuario_email: user.email,
        endpoint: subscription.endpoint,
        auth_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        p256dh_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        activa: true
      });

      setIsSubscribed(true);
      alert('✅ Notificaciones push activadas. Recibirás alertas como en WhatsApp.');
    } catch (err) {
      console.error('Error subscribing to push:', err);
      alert('❌ Error al activar notificaciones: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // Marcar como inactiva en BD
        const subs = await base44.entities.PushSubscription.filter({
          usuario_email: user?.email,
          endpoint: subscription.endpoint
        });
        if (subs.length > 0) {
          await base44.entities.PushSubscription.update(subs[0].id, {
            activa: false
          });
        }
      }

      setIsSubscribed(false);
      alert('Notificaciones push desactivadas.');
    } catch (err) {
      console.error('Error unsubscribing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
        <p className="text-sm text-slate-600">
          ⚠️ Push Notifications no disponibles en tu navegador. 
          <br/>
          <strong>Usa Chrome/Firefox en Android o Safari en iOS</strong> para activar notificaciones.
        </p>
      </div>
    );
  }

  return (
    <Button
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      disabled={isLoading}
      className={`gap-2 ${
        isSubscribed
          ? 'bg-green-600 hover:bg-green-700'
          : 'bg-orange-600 hover:bg-orange-700'
      }`}
      size="sm"
    >
      <Bell className="w-4 h-4" />
      {isLoading ? 'Procesando...' : isSubscribed ? '🔔 Push Activado' : '📲 Activar Push'}
    </Button>
  );
}