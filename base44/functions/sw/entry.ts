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

// Push notification handler
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
    
    event.waitUntil(
      self.registration.showNotification(data.title || '🔔 CD Bustarviejo', options)
    );
  } catch (e) {
    console.error('Error in push handler:', e);
  }
});

// Click handler para notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Si hay una ventana abierta, enfócala
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === url && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      // Si no, abre una nueva
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
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