import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const DISMISS_KEY = 'push_banner_dismissed_at';
const DISMISS_HOURS = 2;

export default function PushPermissionBanner({ user }) {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [noSupport, setNoSupport] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    // Sin soporte real: no hay API de notificaciones
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNoSupport(true);
      setVisible(true);
      return;
    }
    // Ya tiene permiso
    if (Notification.permission === 'granted') return;
    // Bloqueó notificaciones — marcar pero MOSTRAR botón igualmente (algunos navegadores re-preguntan)
    if (Notification.permission === 'denied') {
      // No mostrar si descartó hace menos de 2 horas
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const hoursAgo = (Date.now() - Number(dismissed)) / (1000 * 60 * 60);
        if (hoursAgo < DISMISS_HOURS) return;
      }
      setVisible(true);
      return;
    }
    // Permiso 'default' — no mostrar si descartó hace poco
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const hoursAgo = (Date.now() - Number(dismissed)) / (1000 * 60 * 60);
      if (hoursAgo < DISMISS_HOURS) return;
    }
    setVisible(true);
  }, [user?.email]);

  const handleActivate = async () => {
    setRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setVisible(false);
        // AutoPushSubscriber se encarga de suscribir, pero forzamos aquí también
        // para que no dependa de un re-render
        try {
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
          if (reg?.pushManager) {
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
              const res = await base44.functions.invoke('getVapidPublicKey', {});
              const vapidKey = res.data?.publicKey;
              if (vapidKey) {
                const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
                const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
                const raw = atob(b64);
                const key = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
                sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
              }
            }
            if (sub) {
              const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))));
              const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))));
              // Eliminar suscripciones viejas (mismo email o mismo endpoint) para evitar endpoints caducados
              const allSubs = await base44.entities.PushSubscription.filter({ usuario_email: user.email });
              for (const oldSub of allSubs || []) {
                try { await base44.entities.PushSubscription.delete(oldSub.id); } catch {}
              }
              // Crear nueva suscripción limpia
              await base44.entities.PushSubscription.create({
                usuario_email: user.email, endpoint: sub.endpoint,
                p256dh_key: p256dh, auth_key: auth, activa: true, user_agent: navigator.userAgent.slice(0, 200)
              });
              console.log('✅ Push subscription creada:', sub.endpoint);
            }
          }
        } catch (e) {
          console.warn('Push subscription after permission grant failed:', e.message);
        }
      } else {
        // Denied or dismissed — hide banner
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
      }
    } catch {
      setVisible(false);
    }
    setRequesting(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  const isDenied = 'Notification' in window && Notification.permission === 'denied';
  const canAskPermission = 'Notification' in window && !noSupport;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center gap-3 shadow-md animate-fade-in">
      <Bell className="w-5 h-5 flex-shrink-0 animate-bounce" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">
          {noSupport
            ? 'Instala la app o abre desde Chrome/Safari para activar notificaciones'
            : isDenied
              ? 'Las notificaciones están bloqueadas. Pulsa "Activar" para intentar reactivarlas o ve a Ajustes del navegador.'
              : 'Activa las notificaciones para recibir avisos de convocatorias, anuncios y mensajes'
          }
        </p>
      </div>
      {canAskPermission && (
        <Button
          size="sm"
          onClick={handleActivate}
          disabled={requesting}
          className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-xs px-4 py-1.5 h-auto whitespace-nowrap shadow-lg"
        >
          {requesting ? '...' : '🔔 Activar'}
        </Button>
      )}
      <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}