import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Tarjeta que muestra el estado de las notificaciones push
 * y permite activarlas/reactivarlas si están desactivadas.
 */
export default function PushStatusCard({ user }) {
  const [status, setStatus] = useState('checking'); // checking, active, denied, not_subscribed, not_supported, os_blocked
  const [activating, setActivating] = useState(false);
  const [dbCount, setDbCount] = useState(0);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'sent', 'failed'

  useEffect(() => {
    if (!user?.email) return;
    checkStatus();
  }, [user?.email]);

  const checkStatus = async () => {
    setStatus('checking');

    // 1. Soporte del navegador
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('not_supported');
      return;
    }

    // 2. Permiso del navegador
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    if (Notification.permission !== 'granted') {
      setStatus('not_subscribed');
      return;
    }

    // 3. Verificar suscripción push real en el navegador
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const reg = regs.find(r => r.active && r.scope.endsWith('/') && !r.scope.includes('/functions'));
      const browserSub = reg?.pushManager ? await reg.pushManager.getSubscription() : null;

      // 4. Verificar que hay suscripción activa en BD
      const subs = await base44.entities.PushSubscription.filter({
        usuario_email: user.email,
        activa: true
      });
      setDbCount(subs.length);

      if (!browserSub) {
        // Permiso granted pero sin suscripción en el navegador
        setStatus('not_subscribed');
      } else if (subs.length > 0) {
        setStatus('active');
      } else {
        setStatus('not_subscribed');
      }
    } catch {
      setStatus('not_subscribed');
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      // Pedir permiso si no lo tiene
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setStatus(perm === 'denied' ? 'denied' : 'not_subscribed');
          setActivating(false);
          return;
        }
      }

      // Registrar SW y suscribir
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
        toast.error('No se pudo inicializar el servicio de notificaciones');
        setActivating(false);
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const res = await base44.functions.invoke('getVapidPublicKey', {});
        const vapidKey = res.data?.publicKey;
        if (!vapidKey) { toast.error('Error de configuración'); setActivating(false); return; }

        const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
        const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(b64);
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      }

      // Guardar en BD
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))));
      const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))));

      const existing = await base44.entities.PushSubscription.filter({
        usuario_email: user.email,
        endpoint: sub.endpoint
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

      toast.success('🔔 ¡Notificaciones activadas!');
      await checkStatus();
    } catch (e) {
      console.error('Error activating push:', e);
      toast.error('Error al activar notificaciones');
    }
    setActivating(false);
  };

  const configs = {
    checking: {
      icon: RefreshCw, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200',
      title: 'Comprobando...', desc: 'Verificando el estado de tus notificaciones'
    },
    active: {
      icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200',
      title: '🟢 Notificaciones activas', desc: 'Recibirás avisos de convocatorias, mensajes, anuncios y más. Si no te llegan, envía una de prueba para verificar.'
    },
    denied: {
      icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200',
      title: '🔴 Notificaciones bloqueadas', desc: 'Has bloqueado las notificaciones en tu navegador. Para reactivarlas, ve a Ajustes de tu móvil → Apps → Chrome → Notificaciones → Activar'
    },
    not_subscribed: {
      icon: BellOff, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200',
      title: '🟡 Notificaciones desactivadas', desc: 'No recibirás avisos de convocatorias ni mensajes. Actívalas para estar informado.'
    },
    not_supported: {
      icon: AlertTriangle, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200',
      title: 'No disponible', desc: 'Tu navegador no soporta notificaciones push. Usa Chrome o Safari actualizado.'
    }
  };

  const cfg = configs[status];
  const Icon = cfg.icon;

  return (
    <Card className={`border-2 ${cfg.bg}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${status === 'active' ? 'bg-green-100' : status === 'denied' ? 'bg-red-100' : status === 'not_subscribed' ? 'bg-amber-100' : 'bg-slate-100'}`}>
            <Icon className={`w-6 h-6 ${cfg.color} ${status === 'checking' ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg">{cfg.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{cfg.desc}</p>

            {(status === 'not_subscribed' || status === 'denied') && (
              <Button
                onClick={handleActivate}
                disabled={activating}
                className="mt-3 bg-orange-600 hover:bg-orange-700 font-bold"
              >
                <Bell className="w-4 h-4 mr-2" />
                {activating ? 'Activando...' : '🔔 Activar notificaciones'}
              </Button>
            )}

            {status === 'active' && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={async () => {
                    setSendingTest(true);
                    setTestResult(null);
                    try {
                      await base44.functions.invoke('sendPushNotification', {
                        usuario_email: user.email,
                        titulo: '🔔 Prueba de notificación',
                        cuerpo: '¡Las notificaciones funcionan correctamente!',
                        url: '/NotificationPreferences',
                        tag: 'test-push-' + Date.now()
                      });
                      setTestResult('sent');
                      toast.success('🔔 Notificación enviada. Si no la recibes en 10 segundos, comprueba los ajustes de tu móvil.');
                    } catch (e) {
                      setTestResult('failed');
                      toast.error('Error al enviar: ' + e.message);
                    }
                    setSendingTest(false);
                  }}
                  disabled={sendingTest}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Send className="w-3 h-3 mr-1" />
                  {sendingTest ? 'Enviando...' : 'Enviar prueba'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkStatus}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Verificar
                </Button>
              </div>
            )}

            {testResult === 'sent' && (
              <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-800">
                  ℹ️ Notificación enviada. Si <strong>no te llega en 10 segundos</strong>, tus notificaciones están bloqueadas a nivel de sistema.
                  Ve a <strong>Ajustes del móvil → Apps → Chrome/tu navegador → Notificaciones</strong> y actívalas.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}