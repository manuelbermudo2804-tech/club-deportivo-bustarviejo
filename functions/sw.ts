Deno.serve((_req) => {
  const swCode = `
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Simple pass-through fetch to satisfy installability criteria
self.addEventListener('fetch', (event) => {
  // You can add caching logic here if needed
});
`;

  return new Response(swCode, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Allow root scope even if served from /functions/sw
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache"
    }
  });
});