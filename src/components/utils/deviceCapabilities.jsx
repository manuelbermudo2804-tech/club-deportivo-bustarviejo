/**
 * Detección de capacidades del dispositivo para modo degradado.
 * Permite simplificar el flujo en entornos limitados (Android WebView antiguo, iOS <14, etc.)
 * 
 * Regla: si hay duda → modo degradado. Mejor experiencia simple que crash.
 */

let _cached = null;

export function getDeviceCapabilities() {
  if (_cached) return _cached;

  try {
    const ua = navigator.userAgent || '';

    // --- iOS detection ---
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    let iosVersion = 99;
    if (isIOS) {
      const m = ua.match(/OS (\d+)[_.](\d+)/);
      if (m) iosVersion = parseInt(m[1]);
    }
    const isSafari = isIOS || (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/Android/i.test(ua));

    // --- Android detection ---
    const isAndroid = /Android/.test(ua);
    const isWebView = isAndroid && (/wv\b/i.test(ua) || /Version\/\d/.test(ua));
    let chromeVersion = 999;
    const chromeMatch = ua.match(/Chrome\/(\d+)/);
    if (chromeMatch) chromeVersion = parseInt(chromeMatch[1]);
    const isOldAndroid = isAndroid && chromeVersion < 80;

    // --- PWA / iframe ---
    const isPWA = (window.matchMedia?.('(display-mode: standalone)')?.matches === true) ||
                  (window.navigator?.standalone === true);

    // --- Feature detection ---
    const supportsCreateObjectURL = typeof URL?.createObjectURL === 'function';
    const supportsFileReader = typeof FileReader !== 'undefined';

    // --- iOS <14: WKWebView tenía bugs con File API ---
    const isOldIOS = isIOS && iosVersion < 14;

    // --- RAM detection ---
    const deviceMemoryGB = navigator?.deviceMemory || null; // Chrome/Edge only, null on iOS/Firefox
    const isLowRAM = deviceMemoryGB ? deviceMemoryGB < 3 : (isOldAndroid || isOldIOS);
    const isVeryLowRAM = deviceMemoryGB ? deviceMemoryGB <= 2 : isOldAndroid;

    // Modo degradado: sin preview local, subida directa, sin guardar File en estado
    const degraded = isOldAndroid || isWebView || isOldIOS;

    _cached = {
      isIOS, iosVersion, isSafari, isAndroid, isWebView,
      chromeVersion, isOldAndroid, isPWA,
      supportsCreateObjectURL, supportsFileReader,
      isOldIOS, degraded,
      deviceMemoryGB, isLowRAM, isVeryLowRAM,
    };
  } catch {
    // Si falla la detección, modo degradado por seguridad
    _cached = { degraded: true, error: true, supportsCreateObjectURL: false, supportsFileReader: true, isLowRAM: true, isVeryLowRAM: false };
  }

  return _cached;
}

/**
 * ¿Debemos usar modo degradado (sin preview, subida directa)?
 */
export function isDegradedMode() {
  return getDeviceCapabilities().degraded === true;
}

/**
 * ¿Dispositivo con poca RAM (<3GB)?
 */
export function isLowMemoryDevice() {
  return getDeviceCapabilities().isLowRAM === true;
}

/**
 * ¿Dispositivo con muy poca RAM (<=2GB)?
 */
export function isVeryLowMemoryDevice() {
  return getDeviceCapabilities().isVeryLowRAM === true;
}