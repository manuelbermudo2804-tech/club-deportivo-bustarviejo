Deno.serve((_req) => {
  const swCode = `
self.addEventListener('install', (event) => {
  // Forzar activacion inmediata del nuevo SW
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = (() => { try { return event.data ? event.data.json() : {}; } catch { return {}; } })();
  const options = {
    body: data.body || 'Tienes notificaciones pendientes',
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
    badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
    tag: data.tag || 'notification',
    renotify: data.renotify !== false,
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  };

  // Badge numerico en el icono de la PWA
  const badgeCount = typeof data.badgeCount === 'number' ? data.badgeCount : 1;
  const badgePromise = (async () => {
    try {
      if (self.navigator && self.navigator.setAppBadge) {
        if (badgeCount > 0) await self.navigator.setAppBadge(badgeCount);
        else await self.navigator.clearAppBadge();
      }
    } catch {}
  })();

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'CD Bustarviejo', options),
      badgePromise
    ])
  );
});

// Click en notificacion -> abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      
      // Si hay ventana abierta, navegar y enfocar
      for (const client of allClients) {
        try {
          await client.navigate(new URL(targetPath, self.registration.scope).href);
          return client.focus();
        } catch {
          try { return client.focus(); } catch {}
        }
      }
      
      // No hay ventana -> abrir nueva
      return clients.openWindow(new URL(targetPath, self.registration.scope).href);
    })()
  );
});

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