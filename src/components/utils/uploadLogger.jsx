/**
 * Upload Logger — diagnóstico de fallos de subida en móviles.
 * 
 * - Guarda en localStorage (para debug local)
 * - Envía ERRORES al servidor (SystemAlert) para que el admin los vea
 * - Console logs para diagnóstico en tiempo real
 */

import { base44 } from "@/api/base44Client";

const LOG_KEY = 'upload_log';
const MAX_LOGS = 50;

function getEnvInfo() {
  try {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
    const isChrome = /Chrome\/(\d+)/.test(ua);
    const chromeVersion = isChrome ? parseInt(ua.match(/Chrome\/(\d+)/)?.[1] || '0') : null;
    const isPWA = window.matchMedia?.('(display-mode: standalone)')?.matches ||
                  window.navigator?.standalone === true;
    const isIframe = window !== window.top;

    // iOS version
    let iosVersion = null;
    if (isIOS) {
      const match = ua.match(/OS (\d+)_(\d+)/);
      if (match) iosVersion = parseInt(match[1]);
    }

    // Android WebView detection
    const isWebView = isAndroid && /wv/.test(ua.toLowerCase());

    // Memory info (Chrome only)
    let memoryMB = null;
    try {
      if (performance?.memory) {
        memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      }
    } catch {}

    // Connection info
    let connection = null;
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        connection = { type: conn.effectiveType || conn.type, downlink: conn.downlink, rtt: conn.rtt };
      }
    } catch {}

    return { isIOS, isAndroid, isSafari, chromeVersion, isPWA, isIframe, iosVersion, isWebView, memoryMB, connection, ua: ua.substring(0, 150) };
  } catch {
    return { error: 'env_detection_failed' };
  }
}

/**
 * Envía un error de subida al servidor como SystemAlert para que el admin lo vea.
 * Fire-and-forget, nunca rompe.
 */
async function _reportToServer(entry) {
  try {
    const env = entry.env || getEnvInfo();
    const device = env.isIOS ? `iOS${env.iosVersion || ''}` 
      : env.isAndroid ? `Android Chrome${env.chromeVersion || ''}${env.isWebView ? ' WebView' : ''}`
      : 'Desktop';
    const pwa = env.isPWA ? ' PWA' : ' Browser';
    const conn = env.connection ? ` ${env.connection.type}/${env.connection.downlink}Mbps` : '';
    const mem = env.memoryMB ? ` ${env.memoryMB}MB` : '';

    // Obtener email del usuario si es posible
    let userEmail = 'desconocido';
    try { const me = await base44.auth.me(); userEmail = me?.email || 'anon'; } catch {}

    const titulo = `📸 Error subida: ${entry.error || entry.reason || 'desconocido'}`;
    const descripcion = [
      `👤 Usuario: ${userEmail}`,
      `📱 Dispositivo: ${device}${pwa}${conn}${mem}`,
      `📄 Archivo: ${entry.name || '?'} (${entry.size ? Math.round(entry.size/1024) + 'KB' : '?'}, ${entry.type || 'sin tipo'})`,
      `⚠️ Error: ${entry.error || entry.reason || 'sin detalle'}`,
      `🔧 Contexto: ${entry.context || entry.event || '?'}`,
      `🕐 Hora: ${entry.ts}`,
      `🌐 UA: ${env.ua || '?'}`,
    ].join('\n');

    await base44.entities.SystemAlert.create({
      titulo: titulo.substring(0, 200),
      descripcion,
      categoria: 'error',
      severidad: 'medium',
      estado: 'activo',
      primera_ocurrencia: entry.ts,
      ultima_ocurrencia: entry.ts,
      ocurrencias: 1,
      solucion_sugerida: 'Revisar logs del usuario y tipo de dispositivo',
      evidencia: { 
        file_name: entry.name, 
        file_size: entry.size, 
        file_type: entry.type, 
        error: entry.error || entry.reason,
        context: entry.context,
        device, 
        user_agent: env.ua,
        connection: env.connection,
        memory_mb: env.memoryMB,
        is_pwa: env.isPWA,
        user_email: userEmail,
      },
    });
  } catch { /* nunca romper la app por un log */ }
}

export function logUploadStart(file) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      event: 'upload_start',
      name: file?.name || 'unknown',
      size: file?.size ?? 'unknown',
      type: file?.type || 'empty',
      env: getEnvInfo(),
    };
    _appendLog(entry);
    console.info('[Upload] Inicio:', entry.name, entry.size, 'bytes', entry.type);
  } catch { /* nunca romper */ }
}

export function logUploadSuccess(file, url) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      event: 'upload_success',
      name: file?.name || 'unknown',
      size: file?.size ?? 'unknown',
      url: url ? url.substring(0, 60) : null,
    };
    _appendLog(entry);
    console.info('[Upload] Éxito:', entry.name);
  } catch { /* nunca romper */ }
}

export function logUploadError(file, error, context = '') {
  try {
    const entry = {
      ts: new Date().toISOString(),
      event: 'upload_error',
      context,
      name: file?.name || 'unknown',
      size: file?.size ?? 'unknown',
      type: file?.type || 'empty',
      error: error?.message || String(error),
      env: getEnvInfo(),
    };
    _appendLog(entry);
    console.warn('[Upload] Error:', context, entry.error, entry.name, entry.size, 'bytes');
  } catch { /* nunca romper */ }
}

export function logFileValidationReject(file, reason) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      event: 'validation_reject',
      reason,
      name: file?.name || 'unknown',
      size: file?.size ?? 'unknown',
      type: file?.type || 'empty',
      env: getEnvInfo(),
    };
    _appendLog(entry);
    console.warn('[Upload] Validación rechazada:', reason, entry.name, entry.size, 'bytes');
  } catch { /* nunca romper */ }
}

function _appendLog(entry) {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    // Mantener solo los últimos MAX_LOGS
    if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch { /* localStorage lleno o bloqueado — ignorar */ }
}

export function getUploadLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearUploadLogs() {
  try { localStorage.removeItem(LOG_KEY); } catch { /* ignorar */ }
}