import { useState, useEffect } from 'react';
import { Bell, X, BellOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const DISMISS_KEY = 'push_banner_dismissed_at';
const DISMISS_DAYS = 1;
// Para denied: solo 12h de dismiss (queremos que lo vean)
const DISMISS_DENIED_KEY = 'push_denied_banner_dismissed_at';
const DISMISS_DENIED_HOURS = 12;

export default function PushPermissionBanner({ user }) {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    if (Notification.permission === 'granted') {
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          const reg = regs.find(r => r.active && r.scope.endsWith('/') && !r.scope.includes('/functions'));
          if (reg?.pushManager) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) return;
          }
          setVisible(true);
        } catch {}
      })();
      return;
    }

    if (Notification.permission === 'denied') {
      const dismissedDenied = localStorage.getItem(DISMISS_DENIED_KEY);
      if (dismissedDenied) {
        const hoursAgo = (Date.now() - Number(dismissedDenied)) / (1000 * 60 * 60);
        if (hoursAgo < DISMISS_DENIED_HOURS) return;
      }
      setDenied(true);
      setVisible(true);
      return;
    }

    // default
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const daysAgo = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysAgo < DISMISS_DAYS) return;
    }
    setVisible(true);
  }, [user?.email]);

  const subscribeAfterGrant = async () => {
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
  };

  const handleActivate = async () => {
    setRequesting(true);
    try {
      // Intentar pedir permiso — en Android PWA muchas veces funciona incluso si estaba denied
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setDenied(false);
        setShowInstructions(false);
        setVisible(false);
        localStorage.removeItem(DISMISS_DENIED_KEY);
        await subscribeAfterGrant();
      } else if (permission === 'denied') {
        // El navegador no muestra el diálogo → mostrar instrucciones manuales
        setDenied(true);
        setShowInstructions(true);
      } else {
        // dismissed
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
      }
    } catch {
      setDenied(true);
      setShowInstructions(true);
    }
    setRequesting(false);
  };

  const handleDismiss = () => {
    if (denied) {
      localStorage.setItem(DISMISS_DENIED_KEY, String(Date.now()));
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setVisible(false);
  };

  if (!visible) return null;

  // Estado DENIED con instrucciones
  if (denied) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

    return (
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg animate-fade-in">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <BellOff className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">⚠️ Notificaciones desactivadas</p>
            <p className="text-xs opacity-90 leading-tight mt-0.5">
              No recibirás avisos de convocatorias, anuncios ni mensajes
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleActivate}
            disabled={requesting}
            className="bg-white text-red-600 hover:bg-red-50 font-bold text-xs px-3 py-1.5 h-auto whitespace-nowrap shadow"
          >
            {requesting ? '...' : '🔔 Activar'}
          </Button>
          <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {showInstructions && (
          <div className="bg-white/10 backdrop-blur-sm px-4 py-3 border-t border-white/20">
            <p className="text-xs font-bold mb-2 text-yellow-200">📱 Actívalas manualmente en 3 pasos:</p>
            {isPWA && isAndroid ? (
              <ol className="text-xs space-y-1.5 list-decimal list-inside opacity-95">
                <li>Toca los <strong>3 puntos ⋮</strong> de arriba a la derecha</li>
                <li>Selecciona <strong>"Información de la app"</strong> o <strong>"Configuración"</strong></li>
                <li>Activa <strong>"Notificaciones"</strong></li>
              </ol>
            ) : isAndroid ? (
              <ol className="text-xs space-y-1.5 list-decimal list-inside opacity-95">
                <li>Toca el icono <strong>🔒 candado</strong> en la barra de dirección</li>
                <li>Toca <strong>"Permisos"</strong> o <strong>"Configuración del sitio"</strong></li>
                <li>Cambia <strong>Notificaciones</strong> a <strong>"Permitir"</strong></li>
              </ol>
            ) : isIOS ? (
              <ol className="text-xs space-y-1.5 list-decimal list-inside opacity-95">
                <li>Ve a <strong>Ajustes del iPhone</strong> → <strong>Safari</strong> → <strong>Notificaciones</strong></li>
                <li>Busca esta web y activa las notificaciones</li>
                <li>Vuelve aquí y recarga la página</li>
              </ol>
            ) : (
              <ol className="text-xs space-y-1.5 list-decimal list-inside opacity-95">
                <li>Haz clic en el <strong>🔒 candado</strong> de la barra de dirección</li>
                <li>Busca <strong>"Notificaciones"</strong> en los permisos</li>
                <li>Cámbialo a <strong>"Permitir"</strong> y recarga</li>
              </ol>
            )}
            <p className="text-[10px] opacity-70 mt-2">Después de activarlas, vuelve a esta pantalla y se configurarán automáticamente.</p>
          </div>
        )}
      </div>
    );
  }

  // Estado DEFAULT o GRANTED sin suscripción — botón de activar directo
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center gap-3 shadow-md animate-fade-in">
      <Bell className="w-5 h-5 flex-shrink-0 animate-bounce" />
      <p className="text-sm font-medium flex-1 leading-tight">
        🔔 Activa las notificaciones para no perderte convocatorias ni mensajes
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