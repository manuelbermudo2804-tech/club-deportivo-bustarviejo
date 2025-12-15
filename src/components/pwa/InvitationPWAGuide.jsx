import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function InvitationPWAGuide() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detectar sistema operativo
    const ua = navigator?.userAgent || '';
    const iosDevice = /iPad|iPhone|iPod/.test(ua);
    const androidDevice = /android/i.test(ua);
    
    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);

    // Verificar si el usuario ya marcó como instalada
    const userMarkedInstalled = localStorage.getItem('pwaInstalled') === 'true';

    // Mostrar SIEMPRE en móvil (iOS o Android) si no está marcada como instalada
    if ((iosDevice || androidDevice) && !userMarkedInstalled) {
      // Mostrar después de 2 segundos
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleMarkInstalled = async () => {
    setShow(false);
    localStorage.setItem('pwaInstalled', 'true');
    
    // Guardar en BD si está autenticado
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        await base44.auth.updateMe({
          app_instalada: true,
          fecha_instalacion_app: new Date().toISOString()
        });
      }
    } catch (err) {
      console.log('No se pudo guardar en BD:', err);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-700">📲 Instala la App</h2>
                <p className="text-xs text-slate-600">Solo tardarás 1 minuto</p>
              </div>
            </div>
            <button onClick={() => setShow(false)} className="p-1 hover:bg-slate-100 rounded">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 mb-4">
            <p className="text-green-800 text-sm text-center font-medium">
              ✨ <strong>Con la app instalada:</strong>
            </p>
            <ul className="text-green-700 text-xs mt-2 space-y-1">
              <li>✅ Recibirás convocatorias al instante</li>
              <li>✅ Acceso rápido desde tu pantalla</li>
              <li>✅ Funciona como una app nativa</li>
            </ul>
          </div>

          {isIOS && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-6 h-6" />
                <p className="font-bold text-slate-900">iPhone / iPad</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">1</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">Abre esta web en <strong>Safari</strong></p>
                    <p className="text-xs text-slate-500">(No funciona en Chrome)</p>
                  </div>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/52/Safari_browser_logo.svg" alt="Safari" className="w-10 h-10 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">2</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">Pulsa el botón <strong>Compartir</strong></p>
                    <p className="text-xs text-slate-500">Abajo en la barra de Safari</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">3</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">Busca <strong>"Añadir a pantalla de inicio"</strong></p>
                    <p className="text-xs text-slate-500">Desliza hacia abajo</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">4</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">Pulsa <strong>"Añadir"</strong> arriba a la derecha</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">Añadir</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-green-100 p-3 rounded-xl border-2 border-green-300">
                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0">✓</span>
                  <p className="text-sm text-green-800 font-medium">¡Listo! Ya tienes el icono del club 🎉</p>
                </div>
              </div>
            </div>
          )}

          {isAndroid && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" className="w-6 h-6" />
                <p className="font-bold text-slate-900">Android</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">1</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">Abre esta web en <strong>Chrome</strong></p>
                    <p className="text-xs text-slate-500">(También funciona en otros navegadores)</p>
                  </div>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" alt="Chrome" className="w-10 h-10 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">2</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">Pulsa el <strong>menú</strong> (3 puntos)</p>
                    <p className="text-xs text-slate-500">Arriba a la derecha</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">3</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">Pulsa <strong>"Instalar aplicación"</strong></p>
                    <p className="text-xs text-slate-500">O "Añadir a pantalla de inicio"</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">4</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">Confirma pulsando <strong>"Instalar"</strong></p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">Instalar</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-green-100 p-3 rounded-xl border-2 border-green-300">
                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0">✓</span>
                  <p className="text-sm text-green-800 font-medium">¡Listo! Ya tienes el icono del club 🎉</p>
                </div>
              </div>
            </div>
          )}

          {!isIOS && !isAndroid && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="font-bold text-slate-900 mb-2">📱 iPhone / iPad</p>
                <p className="text-sm text-slate-700">Safari → Compartir (↑) → "Añadir a pantalla de inicio"</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4">
                <p className="font-bold text-slate-900 mb-2">📱 Android</p>
                <p className="text-sm text-slate-700">Chrome → Menú (⋮) → "Instalar app"</p>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Button 
              onClick={handleMarkInstalled}
              className="w-full bg-green-600 hover:bg-green-700 py-4 text-lg font-bold"
            >
              ✅ Ya la tengo instalada
            </Button>
            <Button 
              onClick={() => setShow(false)}
              variant="outline"
              className="w-full py-3"
            >
              Lo haré más tarde
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}