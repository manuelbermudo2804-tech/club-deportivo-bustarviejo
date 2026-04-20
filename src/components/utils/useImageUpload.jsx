/**
 * useImageUpload — hook centralizado para subida de imágenes.
 * 
 * SISTEMA DE CASCADA AGRESIVA:
 * Intenta TODOS los métodos posibles hasta que uno funcione.
 * El usuario SIEMPRE ve su foto subida, cueste lo que cueste.
 * 
 * Cascada de estrategias (en orden):
 * 1. Comprimir en frontend (canvas 800px) + subir comprimido
 * 2. Subida directa sin procesar
 * 3. processImage (backend resize/compress)
 * 4. Comprimir a miniatura (400px) + subir
 * 5. Convertir a ArrayBuffer blob + subir
 * 6. EMERGENCIA: Miniatura 300px q30 o subida cruda con timeout extendido
 * 
 * Cada estrategia tiene reintentos automáticos (backoff exponencial) y timeouts.
 * 
 * Nunca lanza excepciones al árbol React.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { isDegradedMode, getDeviceCapabilities } from "./deviceCapabilities";
import { logUploadStart, logUploadError, logUploadSuccess, logFileValidationReject, generateDiagnosticCode } from "./uploadLogger";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB — subimos el límite, el sistema se encarga de reducir

/**
 * Espera a que iOS entregue el archivo completo.
 * En Chrome iOS, el File puede llegar con size=0 momentáneamente.
 * En cámaras de alta resolución (108MP+) puede tardar >1s.
 * Reintenta hasta 6 veces con delays crecientes (total ~6.3s).
 */
async function waitForFileReady(file, maxRetries = 6) {
  for (let i = 0; i < maxRetries; i++) {
    if (file && typeof file.size === 'number' && file.size > 0) return file;
    await new Promise(r => setTimeout(r, 200 * Math.pow(1.5, i)));
    if (file && typeof file.size === 'number' && file.size > 0) return file;
  }
  // Último intento: leer un slice para forzar materialización del File
  try {
    if (file && typeof file.slice === 'function') {
      const slice = file.slice(0, 1);
      await slice.arrayBuffer();
      if (file.size > 0) return file;
    }
  } catch {}
  return file;
}

/**
 * Ejecuta una función con timeout. Si se pasa del tiempo, rechaza.
 */
function withTimeout(promise, ms, label = '') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${label} (${ms}ms)`)), ms))
  ]);
}

/**
 * Reintenta una función async hasta N veces con backoff exponencial.
 * Solo reintenta en errores de red/timeout, no en errores lógicos.
 */
async function withRetry(fn, maxRetries = 2, label = '') {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = (err?.message || '').toLowerCase();
      const isRetryable = /network|fetch|timeout|econnreset|socket|abort|503|502|429/i.test(msg);
      if (!isRetryable || attempt === maxRetries) throw err;
      const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[Upload] ⏳ Reintento ${attempt + 1}/${maxRetries} para ${label} en ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * Validación ultra defensiva del archivo.
 */
function validateFile(file) {
  if (file === null || file === undefined) return { ok: false, message: null };
  if (typeof file !== 'object') return { ok: false, message: null };

  const size = typeof file.size === 'number' ? file.size : NaN;
  if (isNaN(size) || size === 0) {
    return { ok: false, message: 'La imagen está vacía o no se pudo leer. Inténtalo de nuevo.' };
  }
  if (size > MAX_SIZE_BYTES) {
    const mb = (size / 1024 / 1024).toFixed(0);
    return { ok: false, message: `La foto pesa ${mb}MB (máx 15MB). Baja la resolución de la cámara.` };
  }

  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isImageMime = mime.startsWith('image/');
  const isUnknownMime = mime === '' || mime === 'application/octet-stream';
  const isImageExt = /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/.test(name);
  const isPDF = mime === 'application/pdf' || name.endsWith('.pdf');

  if (!isImageMime && !isUnknownMime && !isPDF && !isImageExt) {
    return { ok: false, message: 'Formato no válido. Usa JPG, PNG, HEIC o PDF.' };
  }

  return { ok: true, isPDF };
}

// ===== ESTRATEGIAS DE SUBIDA (cascada) =====

/**
 * Comprime una imagen en frontend usando canvas.
 * Seguro en memoria: usa dimensiones muy conservadoras.
 * @param {File} file
 * @param {number} maxDim — máximo px del lado largo
 * @param {number} quality — 0-1 JPEG quality
 * @returns {Promise<Blob|null>}
 */
function compressInFrontend(file, maxDim = 800, quality = 0.6) {
  return new Promise((resolve) => {
    try {
      // Verificar que tenemos las APIs necesarias
      if (typeof HTMLCanvasElement === 'undefined' || typeof Image === 'undefined') {
        resolve(null);
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      
      // Timeout de 10s — si no carga, devolvemos null
      const timeout = setTimeout(() => { 
        try { URL.revokeObjectURL(url); } catch {}
        resolve(null); 
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          
          // Redimensionar manteniendo proporción
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob((blob) => {
            try { URL.revokeObjectURL(url); } catch {}
            canvas.width = 1; canvas.height = 1; // liberar memoria
            resolve(blob);
          }, 'image/jpeg', quality);
        } catch {
          try { URL.revokeObjectURL(url); } catch {}
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        try { URL.revokeObjectURL(url); } catch {}
        resolve(null);
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Sube un File/Blob al storage y devuelve la URL.
 * Wrapper con reintentos y timeout.
 */
async function uploadToStorage(fileToUpload, label = '') {
  return withRetry(async () => {
    const response = await withTimeout(
      base44.integrations.Core.UploadFile({ file: fileToUpload }),
      30000, label
    );
    const url = response?.file_url || response?.data?.file_url;
    if (!url) throw new Error('no_url_returned');
    return url;
  }, 2, label);
}

/**
 * Estrategia 1: Comprimir en frontend (800px, JPEG 60%) y subir.
 * Consume poca memoria. Ideal para dispositivos limitados.
 */
async function strategy_frontendCompress(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 1: Compresión frontend (800px)...');
    const blob = await withTimeout(compressInFrontend(file, 800, 0.6), 12000, 'compress800');
    if (!blob || blob.size === 0) return { error: 'compress_failed' };
    
    const compressedFile = new File([blob], file.name?.replace(/\.[^.]+$/, '.jpg') || 'photo.jpg', { type: 'image/jpeg' });
    console.info(`[Upload] Comprimido: ${Math.round(file.size/1024)}KB → ${Math.round(compressedFile.size/1024)}KB`);
    
    const url = await uploadToStorage(compressedFile, 'frontend800');
    return { url, strategy: 'frontend_compress_800' };
  } catch (err) {
    return { error: err?.message || 'frontend_compress_error' };
  }
}

/**
 * Estrategia 2: processImage (backend resize + compresión).
 * Mejor calidad pero requiere más memoria en el envío.
 */
async function strategy_processImage(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 2: processImage (backend)...');
    const response = await withRetry(async () => {
      const res = await withTimeout(
        base44.functions.invoke('processImage', { image: file }),
        45000, 'processImage'
      );
      const data = res?.data;
      if (!data || data.error || !data.file_url) throw new Error(data?.error || 'no_url');
      return data;
    }, 1, 'processImage');
    return { url: response.file_url, strategy: 'process_image' };
  } catch (err) {
    return { error: err?.message || 'process_image_error' };
  }
}

/**
 * Estrategia 3: Subida directa sin ningún procesamiento.
 */
async function strategy_directUpload(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 3: Subida directa...');
    const url = await uploadToStorage(file, 'direct');
    return { url, strategy: 'direct' };
  } catch (err) {
    return { error: err?.message || 'direct_error' };
  }
}

/**
 * Estrategia 4: Miniatura agresiva (400px, JPEG 40%) + subir.
 * Último recurso para dispositivos con muy poca memoria.
 */
async function strategy_tinyCompress(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 4: Miniatura agresiva (400px)...');
    const blob = await withTimeout(compressInFrontend(file, 400, 0.4), 8000, 'compress400');
    if (!blob || blob.size === 0) return { error: 'tiny_compress_failed' };
    
    const tinyFile = new File([blob], 'photo_tiny.jpg', { type: 'image/jpeg' });
    console.info(`[Upload] Miniatura: ${Math.round(file.size/1024)}KB → ${Math.round(tinyFile.size/1024)}KB`);
    
    const url = await uploadToStorage(tinyFile, 'tiny400');
    return { url, strategy: 'tiny_400' };
  } catch (err) {
    return { error: err?.message || 'tiny_error' };
  }
}

/**
 * Estrategia 5: Leer como ArrayBuffer, crear blob nuevo y subir.
 * Soluciona Files corruptos que no se envían bien en FormData.
 */
async function strategy_base64Upload(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 5: ArrayBuffer → Blob → Subir...');
    const arrayBuffer = await withTimeout(file.arrayBuffer(), 10000, 'readBuffer');
    const blob = new Blob([arrayBuffer], { type: file.type || 'image/jpeg' });
    const newFile = new File([blob], file.name || 'photo.jpg', { type: file.type || 'image/jpeg' });
    
    const url = await uploadToStorage(newFile, 'base64blob');
    return { url, strategy: 'base64_blob' };
  } catch (err) {
    return { error: err?.message || 'base64_error' };
  }
}

/**
 * Estrategia 6 (EMERGENCIA): Compresión mínima (300px, JPEG 30%) + subir.
 * Solo se usa si TODAS las anteriores fallan. Calidad mínima aceptable.
 */
async function strategy_emergencyUpload(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 6: EMERGENCIA (300px, q=30)...');
    const blob = await withTimeout(compressInFrontend(file, 300, 0.3), 6000, 'emergency300');
    if (!blob || blob.size === 0) {
      // Si ni siquiera podemos comprimir, subir el original sin procesar como último recurso absoluto
      console.info('[Upload] Compresión fallida, subida cruda sin reintentos...');
      const response = await withTimeout(
        base44.integrations.Core.UploadFile({ file }),
        60000, 'emergency_raw'
      );
      const url = response?.file_url || response?.data?.file_url;
      if (!url) return { error: 'emergency_no_url' };
      return { url, strategy: 'emergency_raw' };
    }
    const emergencyFile = new File([blob], 'photo_emergency.jpg', { type: 'image/jpeg' });
    const url = await uploadToStorage(emergencyFile, 'emergency');
    return { url, strategy: 'emergency_300' };
  } catch (err) {
    return { error: err?.message || 'emergency_error' };
  }
}

/**
 * Detecta si el dispositivo tiene memoria limitada.
 */
function isLowMemoryDevice() {
  try {
    if (navigator.deviceMemory && navigator.deviceMemory < 3) return true;
    if (performance?.memory?.jsHeapSizeLimit) {
      const heapLimitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      if (heapLimitMB < 512) return true;
    }
    const ua = navigator.userAgent || '';
    const chromeMatch = ua.match(/Chrome\/(\d+)/);
    if (chromeMatch && parseInt(chromeMatch[1]) < 100 && /Android/.test(ua)) return true;
    return false;
  } catch { return false; }
}

// Memoria de sesión: recordar qué estrategia funcionó para no repetir cascada
let _winningStrategyName = null;

/**
 * CASCADA PRINCIPAL — prueba todas las estrategias hasta que una funcione.
 * Recuerda la estrategia ganadora para subidas posteriores en la misma sesión.
 * Nunca devuelve error si al menos una estrategia funciona.
 */
async function cascadeUpload(file, isPDF = false) {
  // PDFs van siempre directo
  if (isPDF) {
    const result = await strategy_directUpload(file);
    return result;
  }

  const lowMem = isLowMemoryDevice();

  // Mapa de estrategias por nombre
  const strategyMap = {
    'processImage': { name: 'processImage', fn: () => strategy_processImage(file) },
    'Frontend 800px': { name: 'Frontend 800px', fn: () => strategy_frontendCompress(file) },
    'Directa': { name: 'Directa', fn: () => strategy_directUpload(file) },
    'Miniatura 400px': { name: 'Miniatura 400px', fn: () => strategy_tinyCompress(file) },
    'Base64': { name: 'Base64', fn: () => strategy_base64Upload(file) },
    'Emergencia': { name: 'Emergencia', fn: () => strategy_emergencyUpload(file) },
  };

  // Si ya tenemos una estrategia ganadora, intentarla primero
  if (_winningStrategyName && strategyMap[_winningStrategyName]) {
    try {
      const fast = strategyMap[_winningStrategyName];
      console.info(`[Upload] ⚡ Intentando estrategia recordada: ${fast.name}`);
      const result = await fast.fn();
      if (result.url) {
        console.info(`[Upload] ✅ Éxito rápido con estrategia recordada: ${fast.name}`);
        return result;
      }
      console.warn(`[Upload] ⚠️ Estrategia recordada falló, volviendo a cascada completa`);
      _winningStrategyName = null; // Reset — ya no es fiable
    } catch {
      _winningStrategyName = null;
    }
  }

  const errors = [];

  // Siempre priorizar compresión frontend (1 crédito) sobre processImage (2 créditos)
  // processImage solo como fallback si el frontend no puede comprimir
  const strategies = lowMem
    ? [
        strategyMap['Frontend 800px'],
        strategyMap['Miniatura 400px'],
        strategyMap['Directa'],
        strategyMap['Base64'],
        strategyMap['processImage'],
        strategyMap['Emergencia'],
      ]
    : [
        strategyMap['Frontend 800px'],
        strategyMap['Directa'],
        strategyMap['processImage'],
        strategyMap['Miniatura 400px'],
        strategyMap['Base64'],
        strategyMap['Emergencia'],
      ];

  for (const strategy of strategies) {
    try {
      const result = await strategy.fn();
      if (result.url) {
        console.info(`[Upload] ✅ Éxito con estrategia: ${strategy.name} (${result.strategy})`);
        _winningStrategyName = strategy.name;
        return result;
      }
      errors.push(`${strategy.name}: ${result.error}`);
      console.warn(`[Upload] ❌ ${strategy.name} falló: ${result.error}`);
    } catch (err) {
      errors.push(`${strategy.name}: ${err?.message || 'crash'}`);
      console.warn(`[Upload] ❌ ${strategy.name} crash: ${err?.message}`);
    }
  }

  // TODAS las estrategias fallaron — esto NO debería pasar nunca
  return { 
    error: `Se probaron ${strategies.length} métodos y ninguno funcionó.\n${errors.join(' | ')}`,
    allErrors: errors 
  };
}

/**
 * Hook principal.
 * 
 * @returns {[boolean, (file: File) => Promise<string|null>]}
 *   [uploading, uploadFile]
 *   uploadFile devuelve la URL final o null si falló.
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (rawFile) => {
    // iOS Chrome fix: esperar a que el archivo esté listo
    const file = await waitForFileReady(rawFile);
    const validation = validateFile(file);
    if (!validation.ok) {
      if (validation.message) {
        logFileValidationReject(file, validation.message);
        toast.error(validation.message, { duration: 8000 });
      }
      return null;
    }

    logUploadStart(file);
    setUploading(true);

    try {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      toast.info(`Subiendo imagen (${sizeMB}MB)... Un momento`, { duration: 6000 });

      const result = await cascadeUpload(file, validation.isPDF);

      if (result.error) {
        const diagCode = generateDiagnosticCode();
        logUploadError(file, new Error(`[${diagCode}] ${result.error}`), 'cascade_all_failed');
        toast.error(
          `No se ha podido subir la imagen (${diagCode}). Comprueba tu conexión WiFi/datos e inténtalo de nuevo. Si el problema persiste, envía la foto por WhatsApp a ti mismo para reducirla.`,
          { duration: 12000 }
        );
        return null;
      }

      logUploadSuccess(file, result.url);
      if (result.strategy === 'emergency_300' || result.strategy === 'emergency_raw') {
        toast.success('Foto subida (calidad mínima — puedes repetirla después si quieres)');
      } else if (result.strategy === 'tiny_400') {
        toast.success('Foto subida (calidad reducida por limitaciones del dispositivo)');
      } else {
        toast.success('Foto subida correctamente ✅');
      }
      return result.url;
    } catch (unexpectedErr) {
      logUploadError(file, unexpectedErr, 'unexpected');
      toast.error('Error inesperado al subir. Inténtalo de nuevo.');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return [uploading, uploadFile];
}

/**
 * Genera una URL de preview local de forma segura.
 * Nunca lanza.
 */
export function createSafePreviewUrl(file) {
  if (!file || file.size === 0) return null;
  if (isDegradedMode()) return null;

  try {
    const caps = getDeviceCapabilities();
    if (caps.supportsCreateObjectURL) {
      return URL.createObjectURL(file);
    }
  } catch {}
  return null;
}