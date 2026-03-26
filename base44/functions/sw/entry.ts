Deno.serve((_req) => {
  const swCode = `
self.addEventListener('install', (event) => {
  // No skipWaiting automatically to allow "Update Available" prompt
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Push notification handler — actualiza badge del icono
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const options = {
      body: data.body || 'Tienes notificaciones pendientes',
      icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
      badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {}
    };

    // Actualizar el badge numérico del icono de la PWA
    const badgePromise = (async () => {
      if (!navigator.setAppBadge) return;
      try {
        const count = typeof data.badgeCount === 'number' ? data.badgeCount : 1;
        if (count > 0) {
          await navigator.setAppBadge(count);
        } else {
          await navigator.clearAppBadge();
        }
      } catch (e) {
        // Silently fail — no all browsers support this
      }
    })();

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(data.title || 'CD Bustarviejo', options),
        badgePromise
      ])
    );
  } catch (e) {
    console.error('Push handler error:', e);
  }
});

// Al hacer click en la notificación, abrir la app y limpiar badge
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      // Limpiar badge al interactuar
      if (navigator.clearAppBadge) {
        try { await navigator.clearAppBadge(); } catch {}
      }
      
      const clientList = await clients.matchAll({ type: 'window' });
      for (const client of clientList) {
        if ('focus' in client) {
          await client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })()
  );
});

// Keep SW alive minimal fetch pass-through
self.addEventListener('fetch', () => {});
  `.trim();

  return new Response(swCode, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "public, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
});