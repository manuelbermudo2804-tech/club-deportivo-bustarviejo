import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { withPushSyncLock } from './pushSyncLock';

/**
 * Componente silencioso que auto-suscribe al usuario a push notifications.
 * Se monta en el Layout y no renderiza nada.
 * 
 * Mejoras v2:
 * - NO usa attempted.current — comprueba CADA vez que la app se enfoca
 * - Detecta si el endpoint cambió (permisos revocados/reactivados) y actualiza la BD
 * - Limpia suscripciones inactivas viejas del mismo usuario
 */
export default function AutoPushSubscriber({ user }) {
  const lastEndpoint = useRef(null);

  // Ejecutar al montar y cuando la app vuelve al foco
  useEffect(() => {
    if (!user?.email) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Ejecutar inmediatamente
    autoSubscribe(user.email, lastEndpoint);

    // También al volver a la app (tab/app focus)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') autoSubscribe(user.email, lastEndpoint);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.email]);

  return null;
}

async function autoSubscribe(email, lastEndpointRef) {
  try {
    // Solo proceder si ya tiene permiso granted
    if (Notification.permission !== 'granted') return;

    // Buscar SW activo con scope raíz
    const regs = await navigator.serviceWorker.getRegistrations();
    let reg = regs.find(r => r.active && r.scope.endsWith('/') && !r.scope.includes('/functions'));

    if (!reg) {
      try {
        reg = await navigator.serviceWorker.register('/functions/sw', { scope: '/' });
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
            setTimeout(resolve, 5000);
          });
        }
      } catch {
        reg = regs.find(r => r.active);
        if (!reg) return;
      }
    }

    if (!reg.pushManager) return;

    // Comprobar suscripción actual del navegador
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      // No hay suscripción activa en el navegador — crear una nueva
      const res = await base44.functions.invoke('getVapidPublicKey', {});
      const vapidKey = res.data?.publicKey;
      if (!vapidKey) return;

      const applicationServerKey = vapidKeyToUint8Array(vapidKey);
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }

    // Si el endpoint no cambió desde la última comprobación, no hacer nada
    if (lastEndpointRef.current === sub.endpoint) return;
    lastEndpointRef.current = sub.endpoint;

    // Sincronizar con BD (con lock para evitar race condition con PushPermissionBanner)
    await withPushSyncLock(() => syncSubscriptionToDB(email, sub));
    console.log('✅ Auto-push subscription synced');
  } catch (e) {
    console.warn('Auto-push subscription failed (non-blocking):', e.message);
  }
}

function vapidKeyToUint8Array(vapidKey) {
  const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
  const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function syncSubscriptionToDB(email, sub) {
  try {
    const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))));
    const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))));

    // Buscar todas las suscripciones del usuario
    const allSubs = await base44.entities.PushSubscription.filter({ usuario_email: email });

    // Buscar si ya existe este endpoint
    const existing = allSubs.find(s => s.endpoint === sub.endpoint);

    if (existing) {
      // Actualizar si keys cambiaron o estaba inactiva
      if (existing.p256dh_key !== p256dh || existing.auth_key !== auth || !existing.activa) {
        await base44.entities.PushSubscription.update(existing.id, {
          p256dh_key: p256dh,
          auth_key: auth,
          activa: true,
          user_agent: navigator.userAgent.slice(0, 200)
        });
      }
    } else {
      // Crear nueva suscripción
      await base44.entities.PushSubscription.create({
        usuario_email: email,
        endpoint: sub.endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        activa: true,
        user_agent: navigator.userAgent.slice(0, 200)
      });
    }

    // Eliminar suscripciones viejas con endpoints distintos (ya no sirven, evitar acumulación)
    const stale = allSubs.filter(s => s.endpoint !== sub.endpoint);
    for (const s of stale) {
      try {
        await base44.entities.PushSubscription.delete(s.id);
      } catch {}
    }
  } catch (e) {
    console.warn('Error syncing push subscription to DB:', e.message);
  }
}