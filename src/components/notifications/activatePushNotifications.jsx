import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Shared push notification activation logic.
 * Shows toasts for user feedback. Returns true if successful.
 */
export default async function activatePushNotifications(userEmail) {
  if (!userEmail) {
    toast.error('Debes iniciar sesión primero');
    return false;
  }

  if (!('Notification' in window)) {
    toast.error('Tu navegador no soporta notificaciones. Prueba a abrir la app desde Chrome.');
    return false;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast.error('Las notificaciones push no están disponibles en este modo. Instala la app o usa Chrome/Safari.');
    return false;
  }

  if (Notification.permission === 'denied') {
    toast.error('Las notificaciones están bloqueadas. Ve a los ajustes de tu navegador para desbloquearlas.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.info('Permiso de notificaciones no concedido.');
      return false;
    }

    toast.loading('Configurando notificaciones...', { id: 'push-setup' });

    let reg = (await navigator.serviceWorker.getRegistrations())
      .find(r => r.active && r.scope.endsWith('/') && !r.scope.includes('/functions'));
    if (!reg) {
      reg = await navigator.serviceWorker.register('/functions/sw', { scope: '/' });
      await new Promise(resolve => {
        const sw = reg.installing || reg.waiting;
        if (!sw || reg.active) return resolve();
        sw.addEventListener('statechange', function h() {
          if (this.state === 'activated') { this.removeEventListener('statechange', h); resolve(); }
        });
        setTimeout(resolve, 5000);
      });
    }

    if (!reg?.pushManager) {
      toast.dismiss('push-setup');
      toast.error('No se pudo acceder al gestor de notificaciones push.');
      return false;
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await base44.functions.invoke('getVapidPublicKey', {});
      const vapidKey = res.data?.publicKey;
      if (!vapidKey) {
        toast.dismiss('push-setup');
        toast.error('Error al obtener la clave del servidor.');
        return false;
      }
      const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
      const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const raw = atob(b64);
      const key = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    }

    if (sub) {
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))));
      const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))));
      const allSubs = await base44.entities.PushSubscription.filter({ usuario_email: userEmail });
      for (const oldSub of allSubs || []) {
        try { await base44.entities.PushSubscription.delete(oldSub.id); } catch {}
      }
      await base44.entities.PushSubscription.create({
        usuario_email: userEmail, endpoint: sub.endpoint,
        p256dh_key: p256dh, auth_key: auth, activa: true, user_agent: navigator.userAgent.slice(0, 200)
      });
      toast.dismiss('push-setup');
      toast.success('✅ Notificaciones activadas correctamente');
      return true;
    }

    toast.dismiss('push-setup');
    toast.error('No se pudo crear la suscripción push.');
    return false;
  } catch (e) {
    toast.dismiss('push-setup');
    toast.error('Error: ' + (e.message || 'No se pudieron activar las notificaciones'));
    return false;
  }
}