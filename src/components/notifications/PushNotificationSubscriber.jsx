import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function PushNotificationSubscriber({ user }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swError, setSwError] = useState(null);

  useEffect(() => {
    // Verificar soporte de Web Push
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported && user?.email) {
      registerServiceWorker();
    }
  }, [user?.email]);

  const registerServiceWorker = async () => {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        registration = await navigator.serviceWorker.register('/functions/sw');
        console.log('✅ Service Worker registrado');
      }
      
      setSwError(null);
      checkSubscription();
    } catch (err) {
      console.error('❌ Error:', err);
      setSwError('Service Worker no disponible');
    }
  };

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
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY || 
                             (window.__VAPID_PUBLIC_KEY ? 
                              Uint8Array.from(atob(window.__VAPID_PUBLIC_KEY), c => c.charCodeAt(0)) : null)
      });

      if (!subscription) throw new Error('No se pudo crear suscripción');

      await base44.entities.PushSubscription.create({
        usuario_email: user.email,
        endpoint: subscription.endpoint,
        auth_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        p256dh_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        activa: true
      });

      setIsSubscribed(true);
      setSwError(null);
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

  if (!isSupported) return null;

  return (
    <div className="space-y-2">
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
      
      {swError && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
          ⚠️ {swError}
        </p>
      )}
    </div>
  );
}