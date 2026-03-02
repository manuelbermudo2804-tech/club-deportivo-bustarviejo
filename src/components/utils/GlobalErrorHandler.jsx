/**
 * GlobalErrorHandler — captura global de errores JS y promesas no gestionadas.
 * 
 * Principios:
 * - Nunca permite pantalla blanca: ante cualquier excepción no capturada, muestra banner visible.
 * - Compatible con Android WebView antiguo y Safari iOS.
 * - Registra en uploadLogger para diagnóstico.
 * - Se monta UNA SOLA VEZ en el árbol React (en Layout.js o en el componente raíz).
 */

import { useEffect } from "react";
import { toast } from "sonner";

// Evitar duplicar el banner si ya existe
let _globalHandlerInstalled = false;
let _errorOverlayShown = false;

function showErrorBanner(msg) {
  // Siempre mostrar en consola
  console.error('[GlobalErrorHandler] Error no capturado:', msg);

  // Intentar toast (si sonner está montado)
  try {
    toast.error('Ha ocurrido un error inesperado. Pulsa en "Reintentar" o recarga la página.', {
      duration: 12000,
      id: 'global_error_toast',
      action: {
        label: 'Recargar',
        onClick: () => window.location.reload(),
      }
    });
  } catch { /* sonner puede no estar montado en el crash */ }

  // Fallback: inyectar div de aviso directo en el DOM (a prueba de React crash)
  if (_errorOverlayShown) return;
  _errorOverlayShown = true;
  try {
    let el = document.getElementById('__global_error_banner__');
    if (!el) {
      el = document.createElement('div');
      el.id = '__global_error_banner__';
      el.setAttribute('style', [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
        'background:#fff3cd', 'border-bottom:3px solid #f97316',
        'padding:14px 18px', 'font-family:system-ui,-apple-system,sans-serif',
        'display:flex', 'align-items:center', 'gap:10px',
        'box-shadow:0 4px 12px rgba(0,0,0,0.15)', 'flex-wrap:wrap'
      ].join(';'));
    }
    const safeMsg = (msg || '').toString().substring(0, 120);
    el.innerHTML = [
      '<span style="font-size:20px">⚠️</span>',
      '<div style="flex:1;min-width:0">',
      '<strong style="color:#92400e;font-size:14px">Ha ocurrido un error inesperado</strong><br>',
      '<span style="color:#78350f;font-size:12px">Pulsa "Reintentar" o recarga la página si el problema persiste.</span>',
      '</div>',
      '<button onclick="location.reload()" style="padding:8px 14px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;flex-shrink:0">Reintentar</button>',
      '<button onclick="document.getElementById(\'__global_error_banner__\').remove()" style="padding:8px 12px;background:transparent;color:#92400e;border:1px solid #f97316;border-radius:8px;font-size:13px;cursor:pointer;flex-shrink:0">✕</button>'
    ].join('');
    if (document.body) {
      document.body.insertBefore(el, document.body.firstChild);
    }
  } catch { /* incluso el DOM puede fallar — no propagamos */ }
}

function logToStorage(event, msg) {
  try {
    const raw = localStorage.getItem('upload_log');
    const logs = raw ? JSON.parse(raw) : [];
    logs.push({ ts: new Date().toISOString(), event, error: msg.substring(0, 200) });
    if (logs.length > 50) logs.splice(0, logs.length - 50);
    localStorage.setItem('upload_log', JSON.stringify(logs));
  } catch { /* localStorage bloqueado o lleno — ignorar */ }

  // Intentar enviar al servidor para diagnóstico remoto
  try {
    const { base44 } = require("@/api/base44Client");
    base44.entities.UploadDiagnostic.create({
      user_email: 'unknown',
      event_type: 'diagnostic_report',
      context: 'GlobalErrorHandler',
      error_message: `[${event}] ${msg}`.substring(0, 500),
      device: navigator.userAgent?.substring(0, 200) || 'unknown',
      memory_mb: navigator.deviceMemory || null,
      is_pwa: window.matchMedia?.('(display-mode: standalone)')?.matches || false,
      extra_data: { event, url: window.location.href?.substring(0, 200) }
    }).catch(() => {});
  } catch {}
}

export default function GlobalErrorHandler() {
  useEffect(() => {
    if (_globalHandlerInstalled) return;
    _globalHandlerInstalled = true;

    // 1. Errores JS síncronos
    const onError = (e) => {
      try {
        const msg = (e && e.message) || '';
        if (!msg) return; // errores de recursos (imágenes, fuentes) — no tienen mensaje
        if (/ChunkLoad|Loading chunk|Failed to fetch dynamically|ResizeObserver/i.test(msg)) return; // se manejan aparte
        logToStorage('global_js_error', msg);
        // Solo mostrar banner para errores que no sean de recursos externos
        const isScriptError = !e.filename || /\.(js|jsx|ts|tsx)/.test(e.filename) || e.filename === '';
        if (isScriptError) showErrorBanner(msg);
      } catch {}
    };

    // 2. Promesas rechazadas sin catch
    const onUnhandledRejection = (e) => {
      try {
        const reason = e && e.reason;
        const msg = (reason && (reason.message || String(reason))) || 'Promise rejected';
        // Ignorar errores conocidos y manejados por otros sistemas
        if (/ChunkLoad|Loading chunk|rate.?limit|429|Network request failed|ResizeObserver|Non-Error promise rejection/i.test(msg)) return;
        logToStorage('unhandled_rejection', msg);
        // Solo mostrar banner si parece error de subida o fatal de app
        if (/upload|processImage|UploadFile|TypeError|ReferenceError|unexpected|null.*property/i.test(msg)) {
          showErrorBanner(msg);
        }
      } catch {}
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      _globalHandlerInstalled = false;
    };
  }, []);

  return null; // sin UI propia — la UI se inyecta en el DOM si hace falta
}