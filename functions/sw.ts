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

// Optional push handler (safe no-op if unused)
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(self.registration.showNotification(data.title || 'Notificación', {
      body: data.body || '',
      icon: '/icon-192.png'
    }));
  } catch (_e) {
    // ignore
  }
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