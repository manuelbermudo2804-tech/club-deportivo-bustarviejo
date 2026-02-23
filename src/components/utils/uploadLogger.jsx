/**
 * Upload Logger — logging temporal para diagnóstico de fallos en móviles.
 * Registra nombre, tamaño, tipo MIME, entorno y errores durante subida de imágenes.
 * 
 * Este módulo NO usa ninguna API externa; guarda en localStorage y console.
 * Para ver los logs: localStorage.getItem('upload_log')
 */

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

    return { isIOS, isAndroid, isSafari, chromeVersion, isPWA, isIframe, iosVersion, isWebView, ua: ua.substring(0, 120) };
  } catch {
    return { error: 'env_detection_failed' };
  }
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