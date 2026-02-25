/**
 * useImageUpload — hook centralizado para subida de imágenes.
 * 
 * Principios:
 * - Nunca lanza excepciones al árbol React (todo try/catch interno)
 * - Valida archivo ANTES de cualquier operación
 * - Acepta MIME vacío / genérico (Android WebView, iOS captura)
 * - Soporta HEIC (el backend lo convierte)
 * - En modo degradado: sin preview, subida directa
 * - Logging automático para diagnóstico
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { isDegradedMode, getDeviceCapabilities } from "./deviceCapabilities";
import { logUploadStart, logUploadError, logUploadSuccess, logFileValidationReject } from "./uploadLogger";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validación ultra defensiva del archivo.
 * Devuelve { ok: true } o { ok: false, message: string }
 */
function validateFile(file) {
  // 1. ¿Existe?
  if (file === null || file === undefined) {
    return { ok: false, message: null }; // cancelación silenciosa
  }

  // 2. ¿Es un File real?
  if (typeof file !== 'object') {
    return { ok: false, message: null };
  }

  // 3. Tamaño numérico y > 0
  const size = typeof file.size === 'number' ? file.size : NaN;
  if (isNaN(size) || size === 0) {
    return { ok: false, message: 'La imagen está vacía o no se pudo leer. Inténtalo de nuevo.' };
  }

  // 4. Tamaño máximo
  if (size > MAX_SIZE_BYTES) {
    const mb = (size / 1024 / 1024).toFixed(0);
    return {
      ok: false,
      message: `La foto pesa ${mb}MB y el máximo es 5MB.\n• Baja la resolución en Ajustes de la cámara\n• O envíala por WhatsApp a ti mismo y súbela desde allí`
    };
  }

  // 5. Tipo MIME (aceptar vacío / genérico — Android WebView y cámara iOS devuelven esto)
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isImageMime = mime.startsWith('image/');
  const isUnknownMime = mime === '' || mime === 'application/octet-stream';
  const isImageExt = /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/.test(name);
  const isPDF = mime === 'application/pdf' || name.endsWith('.pdf');

  // Si tiene MIME explícito que NO es imagen ni PDF → rechazar
  if (!isImageMime && !isUnknownMime && !isPDF && !isImageExt) {
    return { ok: false, message: 'Formato no válido. Usa una imagen (JPG, PNG, HEIC) o PDF.' };
  }

  return { ok: true, isPDF };
}

/**
 * Subida segura al backend (processImage para imágenes, UploadFile para PDFs).
 * Nunca lanza — devuelve { url } o { error }.
 */
async function safeUploadToBackend(file, isPDF = false) {
  try {
    if (isPDF) {
      const response = await base44.integrations.Core.UploadFile({ file });
      const url = response?.file_url || response?.data?.file_url;
      if (!url) return { error: 'No se recibió URL del servidor para el PDF.' };
      return { url };
    }

    // Imagen → processImage (resize + JPEG + compresión)
    const response = await base44.functions.invoke('processImage', { image: file });
    const data = response?.data;

    // Respuesta inesperada (null, sin estructura)
    if (!data) return { error: 'Respuesta inesperada del servidor. Inténtalo de nuevo.' };
    if (data.error) return { error: data.userMessage || data.error };
    if (!data.file_url) return { error: 'El servidor no devolvió la URL de la imagen.' };

    return { url: data.file_url };
  } catch (err) {
    const msg = (err?.message || '').toLowerCase();
    const status = err?.response?.status || err?.status;
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('load') || msg.includes('failed to fetch')) {
      return { error: `Error de conexión (${status || 'sin respuesta'}). Comprueba tu internet e inténtalo de nuevo.` };
    }
    if (msg.includes('413') || msg.includes('large') || msg.includes('size') || status === 413) {
      return { error: 'Archivo demasiado grande para el servidor. Baja la resolución de la cámara.' };
    }
    if (msg.includes('timeout') || msg.includes('timed out') || status === 504) {
      return { error: 'La subida tardó demasiado. Comprueba tu conexión WiFi/datos.' };
    }
    if (status === 500) {
      return { error: `Error del servidor (500). ${err?.response?.data?.userMessage || 'Inténtalo de nuevo.'}` };
    }
    return { error: `Error al subir (${status || msg.substring(0,50) || 'desconocido'}). Inténtalo de nuevo.` };
  }
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
    // Validación defensiva
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
      if (file.size > 1 * 1024 * 1024 && !validation.isPDF) {
        toast.info('Subiendo imagen al servidor...', { duration: 4000 });
      }

      const { url, error } = await safeUploadToBackend(file, validation.isPDF);

      if (error) {
        logUploadError(file, new Error(error), 'backend');
        const isMobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
        const sizeTxt = file?.size ? `${Math.round(file.size/1024)}KB` : '?';
        const typeTxt = file?.type || 'sin tipo';
        const errorMsg = isMobile 
          ? `${error}\n\n📋 Info: ${file?.name || '?'} (${sizeTxt}, ${typeTxt})\n💡 Si persiste, prueba desde un ordenador o envía la foto por WhatsApp a ti mismo y súbela desde allí.`
          : `${error}\n\n📋 ${file?.name || '?'} (${sizeTxt}, ${typeTxt})`;
        toast.error(errorMsg, { duration: 12000 });
        return null;
      }

      logUploadSuccess(file, url);
      toast.success('Archivo subido correctamente');
      return url;
    } catch (unexpectedErr) {
      // Captura de último recurso — no debería llegar aquí
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
 * En modo degradado devuelve null (sin preview).
 * Nunca lanza.
 * 
 * @param {File} file
 * @returns {string|null} objectURL o null
 */
export function createSafePreviewUrl(file) {
  if (!file || file.size === 0) return null;
  if (isDegradedMode()) return null; // modo degradado: sin preview

  try {
    const caps = getDeviceCapabilities();
    if (caps.supportsCreateObjectURL) {
      return URL.createObjectURL(file);
    }
  } catch { /* ignorar */ }
  return null;
}