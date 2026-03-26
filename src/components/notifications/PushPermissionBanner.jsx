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
  const [permState, setPermState] = useState('default');

  useEffect(() => {
    if (!user?.email) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNoSupport(true);
      setVisible(true);
      return;
    }
    const perm = Notification.permission;
    setPermState(perm);
    if (perm === 'granted') return;
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
      setPermState(permission);
      if (permission === 'granted') {
        setVisible(false);
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
              const allSubs = await base44.entities.PushSubscription.filter({ usuario_email: user.email });
              for (const oldSub of allSubs || []) {
                try { await base44.entities.PushSubscription.delete(oldSub.id); } catch {}
              }
              await base44.entities.PushSubscription.create({
                usuario_email: user.email, endpoint: sub.endpoint,
                p256dh_key: p256dh, auth_key: auth, activa: true, user_agent: navigator.userAgent.slice(0, 200)
              });
            }
          }
        } catch (e) {
          console.warn('Push subscription after permission grant failed:', e.message);
        }
      } else {
        setPermState('denied');
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

  const isDenied = permState === 'denied';

  if (noSupport) {
    return (
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center gap-3 shadow-md animate-fade-in">
        <Bell className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium flex-1 leading-tight">
          Instala la app o abre desde Chrome/Safari para activar notificaciones
        </p>
        <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (isDenied) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);

    return (
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 shadow-md animate-fade-in">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight mb-1">⚠️ Notificaciones bloqueadas</p>
            <p className="text-xs leading-snug opacity-90">
              {isIOS
                ? 'Ve a Ajustes de iPhone → Safari → Sitios web → Notificaciones → busca esta web y actívalas'
                : isAndroid
                  ? 'Pulsa el candado 🔒 en la barra de dirección de Chrome → Notificaciones → Permitir'
                  : 'Pulsa el candado 🔒 en la barra de dirección → Permisos → Notificaciones → Permitir'
              }
            </p>
          </div>
          <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center gap-3 shadow-md animate-fade-in">
      <Bell className="w-5 h-5 flex-shrink-0 animate-bounce" />
      <p className="text-sm font-medium flex-1 leading-tight">
        Activa las notificaciones para recibir avisos de convocatorias, anuncios y mensajes
      </p>
      <Button
        size="sm"
        onClick={handleActivate}
        disabled={requesting}
        className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-xs px-4 py-1.5 h-auto whitespace-nowrap shadow-lg"
      >
        {requesting ? '...' : '🔔 Activar'}
      </Button>
      <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}