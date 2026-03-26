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
  const data = (() => { try { return event.data ? event.data.json() : {}; } catch { return {}; } })();
  const options = {
    body: data.body || 'Tienes notificaciones pendientes',
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
    badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  };

  // Badge numerico en el icono de la PWA
  const badgeCount = typeof data.badgeCount === 'number' ? data.badgeCount : 1;
  const badgePromise = (async () => {
    try {
      if (self.navigator && self.navigator.setAppBadge) {
        if (badgeCount > 0) {
          await self.navigator.setAppBadge(badgeCount);
        } else {
          await self.navigator.clearAppBadge();
        }
      } else if (typeof navigator !== 'undefined' && navigator.setAppBadge) {
        if (badgeCount > 0) {
          await navigator.setAppBadge(badgeCount);
        } else {
          await navigator.clearAppBadge();
        }
      }
    } catch (e) {
      // Silently fail
    }
  })();

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'CD Bustarviejo', options),
      badgePromise
    ])
  );
});

// Al hacer click en la notificacion, abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Ruta deseada (ej: /FamilyChatsHub)
  const targetPath = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      // Buscar ventanas abiertas de la app
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Si hay una ventana abierta, navegar y enfocar
      if (allClients.length > 0) {
        const client = allClients[0];
        try {
          // Intentar navegar a la ruta deseada
          await client.navigate(new URL(targetPath, self.registration.scope).href);
          return client.focus();
        } catch {
          // Si navigate falla, al menos enfocar
          return client.focus();
        }
      }

      // Si no hay ventana abierta, abrir una nueva
      // Usar URL absoluta basada en el scope del SW
      const url = new URL(targetPath, self.registration.scope).href;
      return clients.openWindow(url);
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