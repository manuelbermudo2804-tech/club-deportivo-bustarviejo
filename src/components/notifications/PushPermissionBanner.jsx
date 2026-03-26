import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const DISMISS_KEY = 'push_banner_dismissed_at';
const DISMISS_DAYS = 1;

export default function PushPermissionBanner({ user }) {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    // Si ya tiene permiso granted, verificar que tenga suscripción activa
    if (Notification.permission === 'granted') {
      // Comprobar asíncronamente si hay suscripción real
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          const reg = regs.find(r => r.active && r.scope.endsWith('/') && !r.scope.includes('/functions'));
          if (reg?.pushManager) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) return; // Tiene suscripción activa, todo OK
          }
          // Permiso granted pero sin suscripción — mostrar banner para re-suscribir
          setVisible(true);
        } catch {
          // En caso de error, no mostrar
        }
      })();
      return;
    }
    // Si bloqueó, no podemos hacer nada
    if (Notification.permission === 'denied') return;
    // Permiso default — solo ocultar si descartó recientemente
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const daysAgo = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysAgo < DISMISS_DAYS) return;
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
              const existing = await base44.entities.PushSubscription.filter({
                usuario_email: user.email, endpoint: sub.endpoint
              });
              if (existing.length > 0) {
                await base44.entities.PushSubscription.update(existing[0].id, {
                  p256dh_key: p256dh, auth_key: auth, activa: true, user_agent: navigator.userAgent.slice(0, 200)
                });
              } else {
                await base44.entities.PushSubscription.create({
                  usuario_email: user.email, endpoint: sub.endpoint,
                  p256dh_key: p256dh, auth_key: auth, activa: true, user_agent: navigator.userAgent.slice(0, 200)
                });
              }
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

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center gap-3 shadow-md animate-fade-in">
      <Bell className="w-5 h-5 flex-shrink-0 animate-bounce" />
      <p className="text-sm font-medium flex-1 leading-tight">
        Activa las notificaciones para recibir avisos de convocatorias, anuncios y mensajes del chat
      </p>
      <Button
        size="sm"
        onClick={handleActivate}
        disabled={requesting}
        className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-xs px-3 py-1 h-auto whitespace-nowrap"
      >
        {requesting ? '...' : 'Activar'}
      </Button>
      <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}