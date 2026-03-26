import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Componente silencioso que auto-suscribe al usuario a push notifications.
 * Se monta en el Layout y no renderiza nada.
 * Solo actúa una vez por sesión y si el usuario ya aceptó notificaciones.
 */
export default function AutoPushSubscriber({ user }) {
  const attempted = useRef(false);

  useEffect(() => {
    if (!user?.email || attempted.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    attempted.current = true;
    autoSubscribe(user.email);
  }, [user?.email]);

  return null;
}

async function autoSubscribe(email) {
  try {
    // 1. Solo proceder si ya tiene permiso granted (no pedir permiso automáticamente)
    if (Notification.permission !== 'granted') return;

    // 2. Buscar SW activo con scope raíz
    const regs = await navigator.serviceWorker.getRegistrations();
    let reg = regs.find(r => r.active && r.scope.endsWith('/') && !r.scope.includes('/functions'));
    
    // Si no hay SW raíz, intentar registrar uno
    if (!reg) {
      try {
        reg = await navigator.serviceWorker.register('/functions/sw', { scope: '/' });
        // Esperar a que se active
        if (!reg.active) {
          await new Promise((resolve) => {
            const sw = reg.installing || reg.waiting;
            if (!sw) return resolve();
            sw.addEventListener('statechange', function handler() {
              if (this.state === 'activated') {
                this.removeEventListener('statechange', handler);
                resolve();
              }
            });
            setTimeout(resolve, 5000); // timeout de seguridad
          });
        }
      } catch {
        // Intentar sin scope explícito
        reg = regs.find(r => r.active);
        if (!reg) return;
      }
    }

    if (!reg.pushManager) return;

    // 3. Comprobar si ya está suscrito
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Ya suscrito — verificar que está en BD
      await syncSubscriptionToDB(email, existing);
      return;
    }

    // 4. Obtener VAPID key del backend
    const res = await base44.functions.invoke('getVapidPublicKey', {});
    const vapidKey = res.data?.publicKey;
    if (!vapidKey) return;

    // 5. Convertir VAPID key
    const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
    const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const applicationServerKey = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) applicationServerKey[i] = raw.charCodeAt(i);

    // 6. Suscribir
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    await syncSubscriptionToDB(email, sub);

    console.log('✅ Auto-push subscription OK');
  } catch (e) {
    console.warn('Auto-push subscription failed (non-blocking):', e.message);
  }
}

async function syncSubscriptionToDB(email, sub) {
  try {
    const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))));
    const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))));

    // Verificar si ya existe esta suscripción
    const existing = await base44.entities.PushSubscription.filter({
      usuario_email: email,
      endpoint: sub.endpoint
    });

    if (existing.length > 0) {
      // Actualizar keys si cambiaron
      if (existing[0].p256dh_key !== p256dh || existing[0].auth_key !== auth || !existing[0].activa) {
        await base44.entities.PushSubscription.update(existing[0].id, {
          p256dh_key: p256dh,
          auth_key: auth,
          activa: true,
          user_agent: navigator.userAgent.slice(0, 200)
        });
      }
      return;
    }

    // Crear nueva suscripción
    await base44.entities.PushSubscription.create({
      usuario_email: email,
      endpoint: sub.endpoint,
      p256dh_key: p256dh,
      auth_key: auth,
      activa: true,
      user_agent: navigator.userAgent.slice(0, 200)
    });
  } catch (e) {
    console.warn('Error syncing push subscription to DB:', e.message);
  }
}