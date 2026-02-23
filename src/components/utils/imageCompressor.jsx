/**
 * Comprime una imagen antes de subirla.
 * DISEÑADO para dispositivos de gama media y navegadores antiguos.
 * 
 * PRINCIPIOS:
 * 1. RECHAZAR TEMPRANO: archivos > MAX_FILE_SIZE ni se intentan procesar (evita OOM)
 * 2. Usar createImageBitmap con resize nativo (GPU, no RAM) como primera opción
 * 3. Fallback a ObjectURL + canvas con dimensiones muy conservadoras
 * 4. NO usar base64 en ningún momento (FileReader.readAsDataURL está prohibido)
 * 5. Liberar memoria agresivamente tras cada operación
 * 6. HEIC: si el navegador no lo soporta, rechazar con mensaje claro (no convertir en cliente)
 */

// === LÍMITES DE SEGURIDAD ===
// Tamaño máximo de archivo aceptado para procesamiento en cliente
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// Canvas conservador para iOS Safari antiguo y Android gama media
const MAX_CANVAS_SIDE = 2048;
const MAX_CANVAS_PIXELS = 2048 * 1536; // ~3MP (seguro para iOS 13+)

// Timeout: si no se procesa en este tiempo, abortar
const TIMEOUT_MS = 15000;

/**
 * Promesa con timeout - devuelve null si tarda demasiado (no bloquea el hilo)
 */
function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((val) => { clearTimeout(timer); resolve(val); })
      .catch(() => { clearTimeout(timer); resolve(null); });
  });
}

/**
 * Calcula dimensiones seguras para el canvas
 */
function getSafeDimensions(origWidth, origHeight, maxWidth, maxHeight) {
  let width = origWidth;
  let height = origHeight;

  // Respetar maxWidth/maxHeight
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Limitar cada lado
  if (width > MAX_CANVAS_SIDE || height > MAX_CANVAS_SIDE) {
    const ratio = Math.min(MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Limitar píxeles totales
  const totalPixels = width * height;
  if (totalPixels > MAX_CANVAS_PIXELS) {
    const ratio = Math.sqrt(MAX_CANVAS_PIXELS / totalPixels);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

/**
 * Método 1: createImageBitmap con resize nativo del navegador (GPU).
 * En Android Chrome hace decodificación+resize sin cargar la imagen completa en RAM.
 */
async function compressViaImageBitmap(file, maxWidth, maxHeight, quality) {
  try {
    if (typeof createImageBitmap !== 'function') return null;

    let bitmap;
    try {
      bitmap = await createImageBitmap(file, {
        resizeWidth: maxWidth,
        resizeHeight: maxHeight,
        resizeQuality: 'medium'
      });
    } catch {
      // Fallback: sin opciones de resize
      bitmap = await createImageBitmap(file);
    }

    const { width, height } = getSafeDimensions(bitmap.width, bitmap.height, maxWidth, maxHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return null; }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          // Limpiar canvas
          try { ctx.clearRect(0, 0, 1, 1); } catch {}
          canvas.width = 1;
          canvas.height = 1;

          if (!blob || blob.size === 0) { resolve(null); return; }
          try {
            resolve(new File([blob], file.name?.replace(/\.[^.]+$/, '.jpg') || 'photo.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
          } catch {
            resolve(blob);
          }
        },
        'image/jpeg',
        quality
      );
    });
  } catch {
    return null;
  }
}

/**
 * Método 2: ObjectURL + Image + canvas (fallback para Safari antiguo)
 */
function compressViaObjectURL(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve) => {
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve(null);
      return;
    }

    const img = new Image();
    const loadTimeout = setTimeout(() => {
      try { if (objectUrl) URL.revokeObjectURL(objectUrl); } catch {}
      img.onload = null;
      img.onerror = null;
      img.src = '';
      resolve(null);
    }, 8000);

    img.onerror = () => {
      clearTimeout(loadTimeout);
      try { URL.revokeObjectURL(objectUrl); } catch {}
      resolve(null);
    };

    img.onload = () => {
      clearTimeout(loadTimeout);
      try {
        const { width, height } = getSafeDimensions(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          try { URL.revokeObjectURL(objectUrl); } catch {}
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try { URL.revokeObjectURL(objectUrl); } catch {}
        objectUrl = null;
        img.src = '';

        canvas.toBlob(
          (blob) => {
            try { ctx.clearRect(0, 0, 1, 1); } catch {}
            canvas.width = 1;
            canvas.height = 1;
            if (!blob || blob.size === 0) { resolve(null); return; }
            try {
              resolve(new File([blob], file.name?.replace(/\.[^.]+$/, '.jpg') || 'photo.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
            } catch {
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      } catch {
        try { if (objectUrl) URL.revokeObjectURL(objectUrl); } catch {}
        resolve(null);
      }
    };
    img.src = objectUrl;
  });
}

/**
 * Detectar si el archivo es HEIC/HEIF
 */
function isHEIC(file) {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(file.name || '');
}

/**
 * Comprobar soporte nativo de HEIC en el navegador
 */
function browserSupportsHEIC() {
  // iOS Safari soporta HEIC nativamente
  if (/iPad|iPhone|iPod/.test(navigator.userAgent || '')) return true;
  // macOS Safari también
  if (/Macintosh.*Safari/i.test(navigator.userAgent || '') && !/Chrome/i.test(navigator.userAgent || '')) return true;
  // Chrome 85+ en algunos sistemas
  // Para estar seguros, devolvemos false en Android/Chrome - si falla createImageBitmap lo manejamos
  return false;
}

/**
 * Comprime una imagen antes de subirla.
 * 
 * @param {File} file - Archivo de imagen
 * @param {Object} options - { maxWidth, maxHeight, quality }
 * @returns {Promise<File>} - Archivo comprimido
 * @throws {Error} con .userMessage si el archivo es demasiado grande o incompatible
 */
export function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = {}) {
  return new Promise(async (resolve, reject) => {
    // === VALIDACIONES TEMPRANAS (sin procesar nada) ===
    if (!file) { resolve(file); return; }

    const isImage = file.type?.startsWith('image/') ||
                    /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name || '');
    if (!isImage) { resolve(file); return; }

    // 🔒 PUNTO 2: LÍMITE DURO DE TAMAÑO — rechazar ANTES de tocar la imagen
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      console.error(`[ImageCompressor] Archivo rechazado: ${sizeMB}MB > límite ${MAX_FILE_SIZE_MB}MB`);
      const error = new Error('ARCHIVO_DEMASIADO_GRANDE');
      error.userMessage = `La foto pesa ${sizeMB}MB y el máximo es ${MAX_FILE_SIZE_MB}MB. Por favor:\n• Baja la resolución de la cámara en Ajustes (ej: de 200MP a 12MP)\n• O envía la foto por WhatsApp a ti mismo y súbela desde ahí (WhatsApp la reduce automáticamente)`;
      reject(error);
      return;
    }

    // 🔒 PUNTO 5: HEIC — si el navegador no lo soporta, rechazar con mensaje claro
    if (isHEIC(file) && !browserSupportsHEIC()) {
      // Intentar con createImageBitmap por si el navegador sí lo decodifica
      let heicSupported = false;
      try {
        if (typeof createImageBitmap === 'function') {
          const testBitmap = await Promise.race([
            createImageBitmap(file.slice(0, Math.min(file.size, 65536))),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
          ]).catch(() => null);
          if (testBitmap) { testBitmap.close(); heicSupported = true; }
        }
      } catch {}

      if (!heicSupported) {
        const error = new Error('FORMATO_NO_COMPATIBLE');
        error.userMessage = 'Tu navegador no puede leer fotos en formato HEIC (iPhone). Por favor:\n• Abre la foto en tu galería y compártela como JPG\n• O haz una captura de pantalla de la foto y sube la captura';
        reject(error);
        return;
      }
    }

    // Si es muy pequeña (< 200KB), no comprimir
    if (file.size < 200 * 1024) { resolve(file); return; }

    // === AJUSTAR PARÁMETROS según tamaño y dispositivo ===
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
    const isOldDevice = isIOSDevice && /OS (9|10|11|12|13|14)_/.test(navigator.userAgent || '');

    let effectiveMaxWidth = maxWidth;
    let effectiveMaxHeight = maxHeight;
    let effectiveQuality = quality;

    if (isOldDevice) {
      effectiveMaxWidth = Math.min(maxWidth, 800);
      effectiveMaxHeight = Math.min(maxHeight, 800);
      effectiveQuality = Math.min(quality, 0.6);
    }

    // Escalar agresividad según tamaño (dentro del límite de 10MB)
    if (file.size > 8 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(effectiveMaxWidth, 600);
      effectiveMaxHeight = Math.min(effectiveMaxHeight, 600);
      effectiveQuality = 0.5;
    } else if (file.size > 5 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(effectiveMaxWidth, 700);
      effectiveMaxHeight = Math.min(effectiveMaxHeight, 700);
      effectiveQuality = 0.55;
    } else if (file.size > 3 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(effectiveMaxWidth, 900);
      effectiveMaxHeight = Math.min(effectiveMaxHeight, 900);
      effectiveQuality = 0.6;
    }

    console.log(`[ImageCompressor] Procesando ${(file.size/1024/1024).toFixed(1)}MB → max ${effectiveMaxWidth}px, q=${effectiveQuality}`);

    // === INTENTAR COMPRIMIR ===
    try {
      // Método 1: createImageBitmap (GPU, eficiente en memoria)
      let result = await withTimeout(
        compressViaImageBitmap(file, effectiveMaxWidth, effectiveMaxHeight, effectiveQuality),
        TIMEOUT_MS
      );
      if (result) {
        console.log(`[ImageCompressor] ✅ ImageBitmap: ${(file.size/1024).toFixed(0)}KB → ${(result.size/1024).toFixed(0)}KB`);
        resolve(result);
        return;
      }

      // Método 2: ObjectURL + Image (fallback Safari)
      result = await withTimeout(
        compressViaObjectURL(file, effectiveMaxWidth, effectiveMaxHeight, effectiveQuality),
        TIMEOUT_MS
      );
      if (result) {
        console.log(`[ImageCompressor] ✅ ObjectURL: ${(file.size/1024).toFixed(0)}KB → ${(result.size/1024).toFixed(0)}KB`);
        resolve(result);
        return;
      }

      // Si ambos métodos fallaron y el archivo es > 2MB, rechazar
      if (file.size > 2 * 1024 * 1024) {
        const error = new Error('COMPRESION_FALLIDA');
        error.userMessage = `No se pudo procesar la foto (${(file.size/1024/1024).toFixed(0)}MB). Prueba a:\n• Hacer la foto con menos resolución\n• Enviártela por WhatsApp y subirla desde ahí`;
        reject(error);
        return;
      }

      // Para archivos pequeños (<2MB), subir el original
      console.warn('[ImageCompressor] Compresión fallida, usando original (<2MB)');
      resolve(file);
    } catch (err) {
      if (file.size > 2 * 1024 * 1024) {
        const error = new Error('COMPRESION_ERROR');
        error.userMessage = `Error al procesar la foto. Prueba con otra imagen o reduce la resolución de la cámara.`;
        reject(error);
        return;
      }
      resolve(file);
    }
  });
}