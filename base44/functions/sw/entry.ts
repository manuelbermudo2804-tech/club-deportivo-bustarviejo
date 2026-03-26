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
  const tag = data.tag || 'notification';

  const options = {
    body: data.body || 'Tienes notificaciones pendientes',
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
    badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
    tag: tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    silent: false,
    data: data.data || {}
  };

  // Badge numerico en el icono de la PWA
  const badgeCount = typeof data.badgeCount === 'number' ? data.badgeCount : 1;

  event.waitUntil(
    (async () => {
      // 1. Cerrar notificacion anterior con mismo tag para forzar heads-up
      const existing = await self.registration.getNotifications({ tag: tag });
      for (const n of existing) { n.close(); }

      // 2. Pequeña pausa para que el SO registre el cierre
      await new Promise(r => setTimeout(r, 100));

      // 3. Mostrar nueva notificacion (aparecera como heads-up)
      await self.registration.showNotification(data.title || 'CD Bustarviejo', options);

      // 4. Actualizar badge
      try {
        if (self.navigator && self.navigator.setAppBadge) {
          if (badgeCount > 0) await self.navigator.setAppBadge(badgeCount);
          else await self.navigator.clearAppBadge();
        }
      } catch {}
    })()
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