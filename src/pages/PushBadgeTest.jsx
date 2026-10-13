import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle, XCircle, Loader2, Send } from 'lucide-react';

const BUILD_TS = '20260326_v3'; // Cambia para verificar que el código se actualizó

export default function PushBadgeTest() {
  const [status, setStatus] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [vapidKey, setVapidKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [badgeCount, setBadgeCount] = useState(5);

  // 1. Obtener VAPID public key desde el backend
  const fetchVapidKey = async () => {
    try {
      const res = await base44.functions.invoke('getVapidPublicKey', {});
      setVapidKey(res.data.publicKey);
      setStatus(s => ({ ...s, vapid: '✅ VAPID key obtenida' }));
    } catch (e) {
      setStatus(s => ({ ...s, vapid: '❌ Error: ' + e.message }));
    }
  };

  // 2. Registrar Service Worker
  const registerSW = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        setStatus(s => ({ ...s, sw: '❌ Service Worker no soportado' }));
        return;
      }
      setStatus(s => ({ ...s, sw: '⏳ Registrando SW...' }));

      // Primero desregistrar SWs antiguos que tengan scope incorrecto
      const existingRegs = await navigator.serviceWorker.getRegistrations();
      for (const r of existingRegs) {
        if (r.scope.includes('/functions')) {
          await r.unregister();
        }
      }

      // Registrar con scope raíz — requiere Service-Worker-Allowed: / en el header del SW
      const reg = await navigator.serviceWorker.register('/functions/sw', { scope: '/' });
      
      // Esperar a que esté activo
      const waitForActive = (registration) => {
        return new Promise((resolve) => {
          const sw = registration.installing || registration.waiting || registration.active;
          if (sw && sw.state === 'activated') { resolve(registration); return; }
          if (!sw) { resolve(registration); return; }
          sw.addEventListener('statechange', function handler() {
            if (this.state === 'activated') {
              this.removeEventListener('statechange', handler);
              resolve(registration);
            }
          });
        });
      };
      await waitForActive(reg);

      setStatus(s => ({ ...s, sw: `✅ SW registrado | scope: ${reg.scope} | active: ${!!reg.active}` }));
      return reg;
    } catch (e) {
      // Si scope '/' falla, intentar sin scope explícito
      try {
        const reg = await navigator.serviceWorker.register('/functions/sw');
        setStatus(s => ({ ...s, sw: `⚠️ SW registrado (scope limitado): ${reg.scope}` }));
        return reg;
      } catch (e2) {
        setStatus(s => ({ ...s, sw: '❌ Error SW: ' + e.message + ' | Fallback: ' + e2.message }));
      }
    }
  };

  // 3. Suscribirse a push
  const subscribePush = async () => {
    try {
      if (!vapidKey) {
        setStatus(s => ({ ...s, push: '❌ Primero obtén la VAPID key' }));
        return;
      }

      setStatus(s => ({ ...s, push: '⏳ Pidiendo permiso de notificaciones...' }));

      // 3a. Pedir permiso de notificaciones PRIMERO
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(s => ({ ...s, push: `❌ Permiso de notificaciones: "${permission}". Debes aceptar.` }));
        return;
      }

      setStatus(s => ({ ...s, push: '⏳ Permiso OK. Buscando SW activo...' }));

      // 3b. Buscar SW activo
      const regs = await navigator.serviceWorker.getRegistrations();
      const regInfo = regs.map(r => `${r.scope}(active:${!!r.active})`);
      setStatus(s => ({ ...s, push_debug: `SWs: ${regs.length} | ${regInfo.join(', ')}` }));

      // Preferir el de scope raíz, luego cualquier activo
      let reg = regs.find(r => r.active && r.scope.endsWith('/') && !r.scope.includes('/functions'));
      if (!reg) reg = regs.find(r => r.active);
      if (!reg) {
        setStatus(s => ({ ...s, push: '❌ No hay SW activo. Ejecuta paso 2 primero.' }));
        return;
      }

      setStatus(s => ({ ...s, push: `⏳ Usando SW scope: ${reg.scope}. Suscribiendo...` }));

      // 3c. Verificar que tiene pushManager
      if (!reg.pushManager) {
        setStatus(s => ({ ...s, push: '❌ Este SW no tiene pushManager. El scope debe cubrir esta página.' }));
        return;
      }

      // 3d. Convertir VAPID key de base64url a Uint8Array
      const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
      const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      // 3e. Suscribir
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      setSubscription(sub);
      setStatus(s => ({ ...s, push: '✅ Suscrito a push: ' + sub.endpoint.slice(0, 50) + '...' }));
    } catch (e) {
      setStatus(s => ({ ...s, push: '❌ Error push: ' + e.message }));
    }
  };

  // 4. Enviar push de prueba desde el backend
  const sendTestPush = async () => {
    if (!subscription) {
      setStatus(s => ({ ...s, send: '❌ Primero suscríbete a push' }));
      return;
    }
    setLoading(true);
    try {
      const keys = {
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh'))))
      };

      const res = await base44.functions.invoke('testPushBadge', {
        endpoint: subscription.endpoint,
        keys,
        badgeCount
      });

      setStatus(s => ({ ...s, send: '✅ ' + res.data.message }));
    } catch (e) {
      setStatus(s => ({ ...s, send: '❌ Error: ' + (e.response?.data?.error || e.message) }));
    } finally {
      setLoading(false);
    }
  };

  // 5. Verificar badge API
  const checkBadgeAPI = () => {
    if ('setAppBadge' in navigator) {
      setStatus(s => ({ ...s, badge: '✅ Badging API soportada en este navegador' }));
    } else {
      setStatus(s => ({ ...s, badge: '❌ Badging API NO soportada (necesitas Chrome + PWA instalada)' }));
    }
  };

  useEffect(() => {
    checkBadgeAPI();
  }, []);

  const Step = ({ num, title, action, actionLabel, result }) => (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-sm font-bold text-white shadow-sm">
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{title}</span>
          <Button size="sm" onClick={action} className="bg-orange-600 hover:bg-orange-700 h-7 text-xs">
            {actionLabel}
          </Button>
        </div>
        {result && (
          <p className={`text-xs mt-1 ${result.startsWith('✅') ? 'text-green-700' : result.startsWith('❌') ? 'text-red-700' : 'text-slate-600'}`}>
            {result}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <Card className="min-w-0 overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white sm:p-7">
          <CardTitle className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20"><Bell className="h-5 w-5 text-orange-300" /></span>
            Test: Push + Badge en PWA
          </CardTitle>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Ejecuta cada paso en orden para comprobar el sistema de notificaciones y el contador de la app.
          </p>
          <p className="mt-3 inline-flex rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-orange-200">Build: {BUILD_TS}</p>
        </CardHeader>
        <CardContent className="min-w-0 space-y-3 bg-slate-50/60 p-4 sm:p-6">
          <Step
            num={1}
            title="Obtener VAPID Key"
            action={fetchVapidKey}
            actionLabel="Obtener"
            result={status.vapid}
          />
          <Step
            num={2}
            title="Registrar Service Worker"
            action={registerSW}
            actionLabel="Registrar"
            result={status.sw}
          />
          <Step
            num={3}
            title="Suscribir a Push"
            action={subscribePush}
            actionLabel="Suscribir"
            result={status.push}
          />
          {status.push_debug && (
            <p className="text-xs text-blue-600 font-mono px-3 -mt-2">{status.push_debug}</p>
          )}
          <Step
            num={4}
            title="Badging API disponible"
            action={checkBadgeAPI}
            actionLabel="Verificar"
            result={status.badge}
          />
          
          <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Badge count:</span>
              <input
                type="number"
                value={badgeCount}
                onChange={e => setBadgeCount(Number(e.target.value))}
                className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                min={0}
                max={99}
              />
            </div>
            <Button 
              onClick={sendTestPush} 
              disabled={loading || !subscription}
              className="h-11 w-full rounded-xl bg-green-600 font-semibold hover:bg-green-700 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar Push + Badge desde Backend
            </Button>
            {status.send && (
              <p className={`text-xs mt-2 ${status.send.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>
                {status.send}
              </p>
            )}
          </div>

          <div className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            <p className="font-semibold">⚠️ Para que funcione al 100%:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Abre esta página desde la <strong>app publicada</strong> (no el preview)</li>
              <li>La app debe estar <strong>instalada como PWA</strong></li>
              <li>Usa <strong>Chrome en Android o Desktop</strong> (iOS no soporta badge)</li>
              <li>Acepta el permiso de notificaciones cuando lo pida</li>
            </ul>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => { caches.keys().then(k => Promise.all(k.map(n => caches.delete(n)))).then(() => window.location.reload()); }}
          >
            🗑️ Limpiar cache y recargar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}