import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function PushNotificationManager({ user }) {
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Tu navegador no soporta notificaciones');
      return;
    }

    setLoading(true);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await subscribeUser();
        toast.success('✅ Notificaciones activadas');
      } else {
        toast.error('❌ Permisos denegados');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Error al activar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const subscribeUser = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push no soportado en este navegador');
      return;
    }

    try {
      // Registrar service worker si no existe
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }
      
      // Obtener la VAPID key desde el backend
      const vapidResponse = await base44.functions.invoke('getVapidKey', {});
      const vapidPublicKey = vapidResponse.data?.vapidKey;
      
      if (!vapidPublicKey) {
        toast.error('No se pudo obtener la clave de notificaciones');
        return;
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Guardar suscripción en el backend
      await saveSubscription(subscription);
      setSubscribed(true);
      
      // Enviar notificación de prueba
      sendTestNotification();
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Error al suscribirse: ' + error.message);
    }
  };

  const unsubscribeUser = async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await removeSubscription(subscription);
        setSubscribed(false);
        toast.success('Notificaciones desactivadas');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Error al desactivar');
    } finally {
      setLoading(false);
    }
  };

  const saveSubscription = async (subscription) => {
    // Guardar en User entity
    try {
      await base44.auth.updateMe({
        push_subscription: JSON.stringify(subscription),
        push_enabled: true
      });
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  };

  const removeSubscription = async (subscription) => {
    try {
      await base44.auth.updateMe({
        push_subscription: null,
        push_enabled: false
      });
    } catch (error) {
      console.error('Error removing subscription:', error);
    }
  };

  const sendTestNotification = () => {
    if (permission !== 'granted') {
      toast.error('Primero activa las notificaciones');
      return;
    }

    new Notification('CD Bustarviejo', {
      body: '🔔 ¡Las notificaciones push están funcionando!',
      icon: '/logo.png',
      badge: '/badge.png',
      tag: 'test',
      requireInteraction: false
    });
  };

  // Función helper para convertir VAPID key
  function urlBase64ToUint8Array(base64String) {
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
  }

  if (!('Notification' in window)) {
    return (
      <Card className="border-2 border-yellow-300 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              Tu navegador no soporta notificaciones push. 
              Prueba con Chrome, Firefox o Safari en iOS 16.4+
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-600" />
          Notificaciones Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            {subscribed ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <p className="font-medium text-slate-900">
                {subscribed ? '✅ Activadas' : 'Desactivadas'}
              </p>
              <p className="text-xs text-slate-600">
                {permission === 'denied' 
                  ? '⚠️ Bloqueadas en ajustes del navegador'
                  : subscribed 
                    ? 'Recibirás notificaciones instantáneas' 
                    : 'Activa para recibir avisos inmediatos'}
              </p>
            </div>
          </div>
          
          {permission === 'default' && (
            <Button 
              onClick={requestPermission}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? '...' : '🔔 Activar'}
            </Button>
          )}
          
          {permission === 'granted' && !subscribed && (
            <Button 
              onClick={subscribeUser}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? '...' : '🔔 Suscribir'}
            </Button>
          )}
          
          {permission === 'granted' && subscribed && (
            <Button 
              onClick={unsubscribeUser}
              disabled={loading}
              variant="outline"
            >
              {loading ? '...' : 'Desactivar'}
            </Button>
          )}
          
          {permission === 'denied' && (
            <div className="text-right">
              <p className="text-xs text-red-600 font-medium">Bloqueadas</p>
              <p className="text-[10px] text-slate-500">Revisa ajustes del navegador</p>
            </div>
          )}
        </div>

        {subscribed && (
          <Button 
            onClick={sendTestNotification}
            variant="outline"
            className="w-full"
          >
            🧪 Enviar notificación de prueba
          </Button>
        )}

        {permission === 'denied' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
            <p className="text-xs text-red-900">
              ⚠️ <strong>Permisos bloqueados:</strong> Ve a Ajustes → Sitios web → {window.location.hostname} → Notificaciones → Permitir
            </p>
          </div>
        )}

        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
          <p className="text-xs text-blue-900">
            💡 <strong>Importante:</strong> Para recibir notificaciones, 
            mantén el permiso activado en los ajustes de tu navegador/dispositivo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}