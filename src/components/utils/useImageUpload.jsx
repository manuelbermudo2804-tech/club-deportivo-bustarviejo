/**
 * useImageUpload — hook centralizado para subida de imágenes.
 * 
 * SISTEMA DE CASCADA AGRESIVA:
 * Intenta TODOS los métodos posibles hasta que uno funcione.
 * El usuario SIEMPRE ve su foto subida, cueste lo que cueste.
 * 
 * Cascada de estrategias (en orden):
 * 1. Comprimir en frontend (canvas 800px) + subir comprimido
 * 2. processImage (backend resize/compress)
 * 3. Subida directa sin procesar
 * 4. Comprimir a miniatura (400px) + subir
 * 5. Convertir a base64 blob + subir
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
 * Estrategia 1: Comprimir en frontend (800px, JPEG 60%) y subir.
 * Consume poca memoria. Ideal para dispositivos limitados.
 */
async function strategy_frontendCompress(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 1: Compresión frontend (800px)...');
    const blob = await compressInFrontend(file, 800, 0.6);
    if (!blob || blob.size === 0) return { error: 'compress_failed' };
    
    const compressedFile = new File([blob], file.name?.replace(/\.[^.]+$/, '.jpg') || 'photo.jpg', { type: 'image/jpeg' });
    console.info(`[Upload] Comprimido: ${Math.round(file.size/1024)}KB → ${Math.round(compressedFile.size/1024)}KB`);
    
    const response = await base44.integrations.Core.UploadFile({ file: compressedFile });
    const url = response?.file_url || response?.data?.file_url;
    if (!url) return { error: 'no_url' };
    return { url, strategy: 'frontend_compress_800' };
  } catch (err) {
    return { error: err?.message || 'frontend_compress_error' };
  }
}

/**
 * Estrategia 2: processImage (backend resize + compresión con sharp).
 * Mejor calidad pero requiere más memoria en el envío.
 */
async function strategy_processImage(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 2: processImage (backend)...');
    const response = await base44.functions.invoke('processImage', { image: file });
    const data = response?.data;
    if (!data || data.error || !data.file_url) return { error: data?.error || 'no_url' };
    return { url: data.file_url, strategy: 'process_image' };
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
    const response = await base44.integrations.Core.UploadFile({ file });
    const url = response?.file_url || response?.data?.file_url;
    if (!url) return { error: 'no_url' };
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
    const blob = await compressInFrontend(file, 400, 0.4);
    if (!blob || blob.size === 0) return { error: 'tiny_compress_failed' };
    
    const tinyFile = new File([blob], 'photo_tiny.jpg', { type: 'image/jpeg' });
    console.info(`[Upload] Miniatura: ${Math.round(file.size/1024)}KB → ${Math.round(tinyFile.size/1024)}KB`);
    
    const response = await base44.integrations.Core.UploadFile({ file: tinyFile });
    const url = response?.file_url || response?.data?.file_url;
    if (!url) return { error: 'no_url' };
    return { url, strategy: 'tiny_400' };
  } catch (err) {
    return { error: err?.message || 'tiny_error' };
  }
}

/**
 * Estrategia 5: Leer como base64, crear blob y subir.
 * Alternativa por si el File no se envía bien en FormData.
 */
async function strategy_base64Upload(file) {
  try {
    console.info('[Upload] 🔄 Estrategia 5: Base64 → Blob → Subir...');
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type || 'image/jpeg' });
    const newFile = new File([blob], file.name || 'photo.jpg', { type: file.type || 'image/jpeg' });
    
    const response = await base44.integrations.Core.UploadFile({ file: newFile });
    const url = response?.file_url || response?.data?.file_url;
    if (!url) return { error: 'no_url' };
    return { url, strategy: 'base64_blob' };
  } catch (err) {
    return { error: err?.message || 'base64_error' };
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

/**
 * CASCADA PRINCIPAL — prueba todas las estrategias hasta que una funcione.
 * Orden adaptativo según el dispositivo.
 * Nunca devuelve error si al menos una estrategia funciona.
 */
async function cascadeUpload(file, isPDF = false) {
  // PDFs van siempre directo
  if (isPDF) {
    const result = await strategy_directUpload(file);
    return result;
  }

  const lowMem = isLowMemoryDevice();
  const errors = [];

  // Definir orden de estrategias según el dispositivo
  const strategies = lowMem
    ? [
        // Dispositivo con poca RAM: empezar por compresión frontend (no usa backend pesado)
        { name: 'Frontend 800px', fn: () => strategy_frontendCompress(file) },
        { name: 'Miniatura 400px', fn: () => strategy_tinyCompress(file) },
        { name: 'Directa', fn: () => strategy_directUpload(file) },
        { name: 'Base64', fn: () => strategy_base64Upload(file) },
        // processImage al final — en estos dispositivos puede crashear
        { name: 'processImage', fn: () => strategy_processImage(file) },
      ]
    : [
        // Dispositivo normal: processImage primero (mejor calidad)
        { name: 'processImage', fn: () => strategy_processImage(file) },
        { name: 'Frontend 800px', fn: () => strategy_frontendCompress(file) },
        { name: 'Directa', fn: () => strategy_directUpload(file) },
        { name: 'Miniatura 400px', fn: () => strategy_tinyCompress(file) },
        { name: 'Base64', fn: () => strategy_base64Upload(file) },
      ];

  for (const strategy of strategies) {
    try {
      const result = await strategy.fn();
      if (result.url) {
        console.info(`[Upload] ✅ Éxito con estrategia: ${strategy.name} (${result.strategy})`);
        return result;
      }
      errors.push(`${strategy.name}: ${result.error}`);
      console.warn(`[Upload] ❌ ${strategy.name} falló: ${result.error}`);
    } catch (err) {
      errors.push(`${strategy.name}: ${err?.message || 'crash'}`);
      console.warn(`[Upload] ❌ ${strategy.name} crash: ${err?.message}`);
    }
  }

  // TODAS las estrategias fallaron
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

  const uploadFile = useCallback(async (file) => {
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
          `No se ha podido subir la imagen. Usa la opción alternativa que aparecerá debajo del botón.`,
          { duration: 12000 }
        );
        return null;
      }

      logUploadSuccess(file, result.url);
      if (result.strategy === 'tiny_400') {
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