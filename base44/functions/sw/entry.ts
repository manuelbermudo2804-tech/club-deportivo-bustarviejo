Deno.serve((_req) => {
  const swCode = `
self.addEventListener('install', (event) => {
  // No skipWaiting automatically to allow "Update Available" prompt
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Allow the app to set the badge count directly
  if (event.data && event.data.type === 'SET_BADGE') {
    const count = event.data.count || 0;
    if (navigator.setAppBadge) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Push notification handler — also updates icon badge
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const options = {
      body: data.body || 'Tienes una nueva notificación',
      icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
      badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {}
    };

    // Update the app icon badge count
    const badgePromise = (async () => {
      if (!navigator.setAppBadge) return;
      try {
        // If the push payload includes a badge count, use it
        if (typeof data.badgeCount === 'number') {
          await navigator.setAppBadge(data.badgeCount);
        } else {
          // Otherwise, count visible notifications + 1
          const notifications = await self.registration.getNotifications();
          await navigator.setAppBadge(notifications.length + 1);
        }
      } catch {}
    })();

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(data.title || '\uD83D\uDD14 CD Bustarviejo', options),
        badgePromise
      ])
    );
  } catch (e) {
    console.error('Error in push handler:', e);
  }
});

// Click handler para notificaciones — clears badge
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/';

  // Update badge: count remaining notifications
  const updateBadge = (async () => {
    if (!navigator.setAppBadge) return;
    try {
      const remaining = await self.registration.getNotifications();
      if (remaining.length > 0) {
        await navigator.setAppBadge(remaining.length);
      } else {
        await navigator.clearAppBadge();
      }
    } catch {}
  })();

  event.waitUntil(
    Promise.all([
      updateBadge,
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (let i = 0; i < clientList.length; i++) {
          if ('focus' in clientList[i]) {
            clientList[i].navigate(url);
            return clientList[i].focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    ])
  );
});

// Keep SW alive minimal fetch pass-through
self.addEventListener('fetch', () => {});
  `.trim();

  return new Response(swCode, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "public, max-age=0", // Don't cache SW
      "X-Content-Type-Options": "nosniff"
    }
  });
});