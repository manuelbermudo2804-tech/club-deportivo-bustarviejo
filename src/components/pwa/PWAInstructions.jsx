import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Code } from 'lucide-react';

export default function PWAInstructions() {
  return (
    <div className="space-y-6 p-6">
      <Card className="border-2 border-orange-500">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardTitle className="flex items-center gap-2">
            <Code className="w-6 h-6 text-orange-600" />
            Configuración PWA - Base44
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <strong>Nota importante:</strong> Los siguientes archivos deben ser configurados 
                por el soporte de Base44 ya que requieren acceso a la carpeta pública raíz.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              1. Crear manifest.json (raíz pública)
            </h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "name": "CD Bustarviejo",
  "short_name": "CD Bustarviejo",
  "description": "Aplicación del Club Deportivo Bustarviejo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ea580c",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/logo-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/logo-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}`}
            </pre>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              2. Crear service-worker.js (raíz pública)
            </h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
{`// Service Worker para PWA
const CACHE_NAME = 'cd-bustarviejo-v1';
const urlsToCache = [
  '/',
  '/offline.html'
];

// Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Activación
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch - Network first, cache fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'CD Bustarviejo';
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/logo-192.png',
    badge: '/badge-96.png',
    tag: data.tag || 'general',
    data: data.url || '/',
    requireInteraction: data.urgent || false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});`}
            </pre>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              3. Agregar meta tags al HTML principal
            </h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
{`<!-- En el <head> del index.html -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#ea580c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="CD Bustarviejo">
<link rel="apple-touch-icon" href="/logo-192.png">`}
            </pre>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              4. Crear iconos necesarios
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg">
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li><code className="bg-slate-200 px-1 rounded">logo-192.png</code> - 192x192px</li>
                <li><code className="bg-slate-200 px-1 rounded">logo-512.png</code> - 512x512px</li>
                <li><code className="bg-slate-200 px-1 rounded">badge-96.png</code> - 96x96px (monocromático para badge)</li>
                <li><code className="bg-slate-200 px-1 rounded">offline.html</code> - Página offline básica</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              5. Firebase Cloud Messaging (Push Notifications)
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <p className="text-sm text-blue-900">
                <strong>Pasos:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Crear proyecto en <a href="https://console.firebase.google.com" target="_blank" className="underline">Firebase Console</a></li>
                <li>Activar Cloud Messaging</li>
                <li>Generar clave VAPID en Settings → Cloud Messaging</li>
                <li>Copiar la clave pública en <code className="bg-blue-200 px-1 rounded">PushNotificationManager.jsx</code></li>
              </ol>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <strong>Ya implementado en la app:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Componente de instalación PWA</li>
                  <li>Manager de notificaciones push</li>
                  <li>Detección de iOS/Android</li>
                  <li>Almacenamiento de suscripciones en User</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}