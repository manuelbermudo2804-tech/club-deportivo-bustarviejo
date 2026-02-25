/**
 * Upload Logger — diagnóstico COMPLETO de subidas (éxitos + fallos).
 * 
 * - Guarda en localStorage (para debug local)
 * - Envía TODOS los eventos al servidor (UploadDiagnostic) para visibilidad admin
 * - Console logs para diagnóstico en tiempo real
 */

import { base44 } from "@/api/base44Client";

const LOG_KEY = 'upload_log';
const MAX_LOGS = 50;

// Session ID único por carga de página para agrupar eventos
const SESSION_ID = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Cache del email del usuario para no llamar a auth.me() en cada evento
let _cachedEmail = null;
async function _getUserEmail() {
  if (_cachedEmail) return _cachedEmail;
  try { const me = await base44.auth.me(); _cachedEmail = me?.email || 'anon'; } catch { _cachedEmail = 'anon'; }
  return _cachedEmail;
}

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
    let iosVersion = null;
    if (isIOS) { const match = ua.match(/OS (\d+)_(\d+)/); if (match) iosVersion = parseInt(match[1]); }
    const isWebView = isAndroid && /wv/.test(ua.toLowerCase());
    let memoryMB = null;
    try { if (performance?.memory) { memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); } } catch {}
    let connection = null;
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) { connection = { type: conn.effectiveType || conn.type, downlink: conn.downlink, rtt: conn.rtt }; }
    } catch {}
    return { isIOS, isAndroid, isSafari, chromeVersion, isPWA, isIframe, iosVersion, isWebView, memoryMB, connection, ua: ua.substring(0, 150) };
  } catch { return { error: 'env_detection_failed' }; }
}

function _getDeviceString(env) {
  const device = env.isIOS ? `iOS${env.iosVersion || ''}` 
    : env.isAndroid ? `Android Chrome${env.chromeVersion || ''}${env.isWebView ? ' WebView' : ''}`
    : 'Desktop';
  const pwa = env.isPWA ? ' PWA' : ' Browser';
  return `${device}${pwa}`;
}

function _getConnectionString(env) {
  if (!env.connection) return '';
  return `${env.connection.type || '?'}/${env.connection.downlink || '?'}Mbps`;
}

/**
 * Envía un evento al servidor como UploadDiagnostic. Fire-and-forget.
 */
async function _reportEvent(eventType, data = {}) {
  try {
    const env = data.env || getEnvInfo();
    const userEmail = await _getUserEmail();
    await base44.entities.UploadDiagnostic.create({
      user_email: userEmail,
      event_type: eventType,
      context: data.context || '',
      file_name: data.name || '',
      file_size: typeof data.size === 'number' ? data.size : null,
      file_type: data.type || '',
      result_url: data.url || '',
      error_message: data.error || data.reason || '',
      diagnostic_code: data.diagnosticCode || '',
      device: _getDeviceString(env),
      connection: _getConnectionString(env),
      memory_mb: env.memoryMB || null,
      is_pwa: env.isPWA || false,
      user_agent: env.ua || '',
      extra_data: data.extra || null,
      session_id: SESSION_ID,
    });
  } catch { /* nunca romper la app por un log */ }
}

function _appendLog(entry) {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch { /* localStorage lleno o bloqueado — ignorar */ }
}

export function logUploadStart(file, context = '') {
  try {
    const entry = {
      ts: new Date().toISOString(), event: 'upload_start', context,
      name: file?.name || 'unknown', size: file?.size ?? 'unknown', type: file?.type || 'empty',
      env: getEnvInfo(),
    };
    _appendLog(entry);
    console.info('[Upload] Inicio:', context, entry.name, entry.size, 'bytes', entry.type);
    _reportEvent('upload_start', { ...entry });
  } catch { /* nunca romper */ }
}

export function logUploadSuccess(file, url, context = '') {
  try {
    const entry = {
      ts: new Date().toISOString(), event: 'upload_success', context,
      name: file?.name || 'unknown', size: file?.size ?? 'unknown', url: url ? url.substring(0, 80) : null,
    };
    _appendLog(entry);
    console.info('[Upload] Éxito:', context, entry.name);
    _reportEvent('upload_success', { ...entry, env: getEnvInfo() });
  } catch { /* nunca romper */ }
}

export function logUploadButtonClick(buttonId, context = '') {
  try {
    const entry = {
      ts: new Date().toISOString(), event: 'button_click', context, buttonId, env: getEnvInfo(),
    };
    _appendLog(entry);
    console.info('[Upload] Botón pulsado:', buttonId, context);
    _reportEvent('button_click', { ...entry, extra: { buttonId } });
  } catch { /* nunca romper */ }
}

export function logInputChange(inputId, files, context = '') {
  try {
    const fileList = files ? Array.from(files) : [];
    const entry = {
      ts: new Date().toISOString(), event: 'input_change', context, inputId,
      fileCount: fileList.length,
      files: fileList.map(f => ({ name: f.name, size: f.size, type: f.type || 'sin-tipo' })),
      env: getEnvInfo(),
    };
    _appendLog(entry);
    console.info('[Upload] Input change:', inputId, fileList.length, 'archivos', context);
    const firstFile = fileList[0];
    _reportEvent('input_change', {
      ...entry,
      name: firstFile?.name || '',
      size: firstFile?.size || 0,
      type: firstFile?.type || '',
      error: fileList.length === 0 ? 'Input sin archivos (cancelado o fallo)' : '',
      extra: { inputId, fileCount: fileList.length },
    });
  } catch { /* nunca romper */ }
}

export function generateDiagnosticCode() {
  try {
    const ts = Date.now().toString(36).slice(-3);
    const rnd = Math.random().toString(36).slice(-3);
    return `DV-${(ts + rnd).toUpperCase().slice(0, 6)}`;
  } catch { return 'DV-????'; }
}

export function logUploadError(file, error, context = '') {
  try {
    const entry = {
      ts: new Date().toISOString(), event: 'upload_error', context,
      name: file?.name || 'unknown', size: file?.size ?? 'unknown', type: file?.type || 'empty',
      error: error?.message || String(error), env: getEnvInfo(),
    };
    _appendLog(entry);
    console.warn('[Upload] Error:', context, entry.error, entry.name, entry.size, 'bytes');
    _reportEvent('upload_error', { ...entry, diagnosticCode: generateDiagnosticCode() });
  } catch { /* nunca romper */ }
}

export function logFileValidationReject(file, reason) {
  try {
    const entry = {
      ts: new Date().toISOString(), event: 'validation_reject', reason,
      name: file?.name || 'unknown', size: file?.size ?? 'unknown', type: file?.type || 'empty',
      env: getEnvInfo(),
    };
    _appendLog(entry);
    console.warn('[Upload] Validación rechazada:', reason, entry.name, entry.size, 'bytes');
    _reportEvent('validation_reject', { ...entry, error: reason });
  } catch { /* nunca romper */ }
}

/**
 * Envía TODO el historial local al servidor como un reporte diagnóstico.
 * Útil cuando el usuario pulsa "Enviar diagnóstico" manualmente.
 */
export async function sendDiagnosticReport() {
  try {
    const logs = getUploadLogs();
    const env = getEnvInfo();
    const userEmail = await _getUserEmail();
    const code = generateDiagnosticCode();
    
    await base44.entities.UploadDiagnostic.create({
      user_email: userEmail,
      event_type: 'diagnostic_report',
      context: `Reporte manual - ${logs.length} eventos`,
      diagnostic_code: code,
      device: _getDeviceString(env),
      connection: _getConnectionString(env),
      memory_mb: env.memoryMB || null,
      is_pwa: env.isPWA || false,
      user_agent: env.ua || '',
      extra_data: { logs, session_id: SESSION_ID },
      session_id: SESSION_ID,
    });
    
    return { success: true, code, eventCount: logs.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
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