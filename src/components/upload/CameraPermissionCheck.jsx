import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Camera, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Detecta si el navegador/PWA tiene permisos de cámara bloqueados.
 * IMPORTANTE: NO intenta getUserMedia automáticamente (causaba problemas en iOS PWA).
 * Solo usa navigator.permissions.query (no intrusivo).
 */
export default function CameraPermissionCheck() {
  const [status, setStatus] = useState('unknown'); // ok | blocked | unknown
  const [showHelp, setShowHelp] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    try {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isAndroid = /Android/.test(ua);
      const isPWA = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true;
      const browser = /CriOS/.test(ua) ? 'Chrome iOS' : /FxiOS/.test(ua) ? 'Firefox iOS' : /Safari/.test(ua) && !/Chrome/.test(ua) ? 'Safari' : /Chrome/.test(ua) ? 'Chrome' : 'Otro';
      
      setDeviceInfo(`${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'} · ${browser}${isPWA ? ' · PWA' : ''}`);

      // Solo usar navigator.permissions.query — NO getUserMedia
      // getUserMedia abre la cámara real y causa problemas en iOS PWA
      if (navigator.permissions?.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' });
          if (result.state === 'denied') {
            setStatus('blocked');
            return;
          }
          if (result.state === 'granted') {
            setStatus('ok');
            return;
          }
          // 'prompt' = no decidido, es normal
        } catch {
          // permissions.query no soporta 'camera' en este navegador (iOS Safari)
        }
      }

      // No podemos determinar — asumimos ok (no molestar al usuario)
      setStatus('unknown');
    } catch {
      setStatus('unknown');
    }
  }

  if (status === 'checking' || status === 'ok' || status === 'unknown') return null;

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  return (
    <Alert className="border-amber-400 bg-amber-50 mb-4">
      <ShieldAlert className="h-5 w-5 text-amber-600" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-bold text-amber-900">
            ⚠️ La cámara está bloqueada en este dispositivo
          </p>
          <p className="text-sm text-amber-800">
            Esto puede impedir que subas fotos o documentos. Necesitas desbloquear el acceso a la cámara y archivos.
          </p>
          
          <Button variant="ghost" size="sm" className="text-amber-700 p-0 h-auto" onClick={() => setShowHelp(!showHelp)}>
            {showHelp ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showHelp ? 'Ocultar instrucciones' : 'Ver cómo solucionarlo'}
          </Button>

          {showHelp && (
            <div className="bg-white rounded-lg p-3 text-sm space-y-2 border border-amber-200">
              {isIOS ? (
                <>
                  <p className="font-bold">📱 En iPhone/iPad:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Abre <strong>Ajustes</strong> del iPhone</li>
                    <li>Busca el navegador que usas (Safari, Chrome, Firefox...)</li>
                    <li>Toca en <strong>Cámara</strong> → selecciona <strong>Permitir</strong></li>
                    <li>También: <strong>Ajustes → Privacidad → Fotos</strong> → asegúrate de que tu navegador tiene acceso</li>
                    <li>Vuelve a la app y refresca</li>
                  </ol>
                  <div className="bg-blue-50 p-2 rounded text-blue-800 text-xs mt-2">
                    💡 Si usas la app instalada (PWA), los permisos dependen del navegador desde el que la instalaste (normalmente Safari).
                  </div>
                </>
              ) : isAndroid ? (
                <>
                  <p className="font-bold">📱 En Android:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Abre <strong>Ajustes</strong> del teléfono</li>
                    <li>Ve a <strong>Apps</strong> → busca <strong>Chrome</strong> (o tu navegador)</li>
                    <li>Toca <strong>Permisos</strong></li>
                    <li>Activa <strong>Cámara</strong> y <strong>Almacenamiento/Archivos</strong></li>
                    <li>Vuelve a la app y refresca</li>
                  </ol>
                  <div className="bg-blue-50 p-2 rounded text-blue-800 text-xs mt-2">
                    💡 Si la app está instalada, busca "CD Bustarviejo" directamente en la lista de Apps.
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold">💻 En ordenador:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Haz clic en el icono del candado 🔒 junto a la URL</li>
                    <li>Busca <strong>Cámara</strong> y cámbialo a <strong>Permitir</strong></li>
                    <li>Refresca la página</li>
                  </ol>
                </>
              )}
              <p className="text-xs text-slate-500 mt-2">Dispositivo: {deviceInfo}</p>
            </div>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-400 text-amber-800"
            onClick={() => { checkPermissions(); }}
          >
            <Camera className="w-4 h-4 mr-1" /> Comprobar de nuevo
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}