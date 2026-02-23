/**
 * Comprime una imagen antes de subirla.
 * OPTIMIZADO para iPhones antiguos y Android con poca memoria (ej: Redmi Note 12 Pro 200MP).
 * 
 * Estrategias:
 * 1. Usa createImageBitmap con resizeWidth/resizeHeight (descarga en GPU, no consume RAM del canvas)
 * 2. Limita el canvas a dimensiones seguras para iOS Safari (max ~4096px)
 * 3. Libera memoria agresivamente (revokeObjectURL, nullificar canvas)
 * 4. Fallback robusto: si algo falla, sube el original
 * 5. Timeout de seguridad para evitar que el proceso se quede colgado
 * 6. Para Android con fotos enormes (>10MP), usa createImageBitmap con resize nativo
 */

// Tamaño máximo seguro de canvas
const MAX_CANVAS_PIXELS = 2560 * 2048; // ~5MP
const MAX_CANVAS_SIDE = 2560;
const TIMEOUT_MS = 25000; // 25 segundos (fotos 200MP tardan más en decodificar)

/**
 * Crea una promesa con timeout
 */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms); // En timeout, devolvemos null (usará fallback)
    promise.then((val) => { clearTimeout(timer); resolve(val); })
           .catch(() => { clearTimeout(timer); resolve(null); });
  });
}

/**
 * Calcula dimensiones seguras para el canvas
 */
function getSafeDimensions(origWidth, origHeight, maxWidth, maxHeight) {
  let width = origWidth;
  let height = origHeight;

  // 1. Respetar maxWidth/maxHeight del usuario
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // 2. Limitar cada lado al máximo seguro
  if (width > MAX_CANVAS_SIDE || height > MAX_CANVAS_SIDE) {
    const ratio = Math.min(MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // 3. Limitar píxeles totales (para iOS Safari antiguo)
  const totalPixels = width * height;
  if (totalPixels > MAX_CANVAS_PIXELS) {
    const ratio = Math.sqrt(MAX_CANVAS_PIXELS / totalPixels);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

/**
 * Comprime usando createObjectURL + Image (más eficiente en memoria que readAsDataURL)
 * NOTA: En iOS Safari antiguo, Image puede crashear con fotos muy grandes.
 * Por eso limitamos dimensiones ANTES de dibujar en canvas.
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
    
    // Timeout de seguridad: si la imagen no carga en 10s, abortar
    const loadTimeout = setTimeout(() => {
      try { if (objectUrl) URL.revokeObjectURL(objectUrl); } catch {}
      img.onload = null;
      img.onerror = null;
      img.src = '';
      resolve(null);
    }, 10000);
    
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
        
        // Liberar objectURL y referencia a img inmediatamente
        try { URL.revokeObjectURL(objectUrl); } catch {}
        objectUrl = null;
        img.src = ''; // Liberar memoria de la imagen decodificada

        canvas.toBlob(
          (blob) => {
            // Limpiar canvas para liberar memoria
            try { ctx.clearRect(0, 0, 1, 1); } catch {}
            canvas.width = 1;
            canvas.height = 1;

            if (!blob || blob.size === 0) {
              resolve(null);
              return;
            }

            try {
              const compressed = new File(
                [blob],
                file.name?.replace(/\.[^.]+$/, '.jpg') || 'photo.jpg',
                { type: 'image/jpeg', lastModified: Date.now() }
              );
              resolve(compressed);
            } catch {
              // Algunos navegadores antiguos no soportan new File()
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('[ImageCompressor] Error en canvas:', err);
        try { if (objectUrl) URL.revokeObjectURL(objectUrl); } catch {}
        resolve(null);
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Comprime usando createImageBitmap con resize nativo del navegador.
 * En Android Chrome, createImageBitmap con resizeWidth/resizeHeight 
 * hace la decodificación+resize en GPU/nativo, sin cargar la imagen completa en RAM.
 * Esto es CRÍTICO para cámaras de 200MP como el Redmi Note 12 Pro.
 */
async function compressViaImageBitmap(file, maxWidth, maxHeight, quality) {
  try {
    if (typeof createImageBitmap !== 'function') return null;

    // Intentar primero con resize nativo (más eficiente en memoria)
    // Esto evita cargar la imagen completa en RAM antes de redimensionar
    let bitmap;
    try {
      // Crear bitmap con resize nativo - el navegador decodifica directamente al tamaño final
      bitmap = await createImageBitmap(file, {
        resizeWidth: maxWidth,
        resizeHeight: maxHeight,
        resizeQuality: 'medium' // 'low' | 'medium' | 'high' - medium es buen equilibrio
      });
    } catch {
      // Fallback: algunos navegadores no soportan las opciones de resize
      bitmap = await createImageBitmap(file);
    }

    const { width, height } = getSafeDimensions(bitmap.width, bitmap.height, maxWidth, maxHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close(); // Liberar memoria del bitmap

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          // Limpiar canvas agresivamente
          try { ctx.clearRect(0, 0, 1, 1); } catch {}
          canvas.width = 1;
          canvas.height = 1;

          if (!blob || blob.size === 0) {
            resolve(null);
            return;
          }

          try {
            const compressed = new File(
              [blob],
              file.name?.replace(/\.[^.]+$/, '.jpg') || 'photo.jpg',
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            resolve(compressed);
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
 * Comprime una imagen antes de subirla.
 * @param {File} file - Archivo de imagen
 * @param {Object} options - maxWidth, maxHeight, quality
 * @returns {Promise<File>} - Archivo comprimido o el original si falla
 */
export function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = {}) {
  return new Promise(async (resolve) => {
    // Validaciones básicas
    if (!file) { resolve(file); return; }
    
    // Si no es imagen, devolver tal cual
    const isImage = file.type?.startsWith('image/') || 
                    /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name || '');
    if (!isImage) { resolve(file); return; }

    // Si es muy pequeña (< 200KB), no comprimir
    if (file.size < 200 * 1024) { resolve(file); return; }

    // Detectar dispositivo para ajustar límites
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
    const isOldDevice = isIOSDevice && /OS (9|10|11|12|13|14)_/.test(navigator.userAgent || '');
    const isAndroid = /android/i.test(navigator.userAgent || '');
    
    // Para archivos muy grandes o dispositivos viejos, ser más agresivo
    let effectiveMaxWidth = maxWidth;
    let effectiveMaxHeight = maxHeight;
    let effectiveQuality = quality;
    
    if (isOldDevice) {
      effectiveMaxWidth = Math.min(maxWidth, 800);
      effectiveMaxHeight = Math.min(maxHeight, 800);
      effectiveQuality = Math.min(quality, 0.65);
      console.log('[ImageCompressor] iOS antiguo, compresión conservadora');
    }
    
    // Android con fotos enormes (Redmi Note 12 Pro = 200MP = ~50MB JPG, ~25MB HEIF)
    // Estas fotos pueden tener 12000x16000px y desbordar la RAM al decodificar
    if (file.size > 20 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(effectiveMaxWidth, 600);
      effectiveMaxHeight = Math.min(effectiveMaxHeight, 600);
      effectiveQuality = 0.5;
      console.log(`[ImageCompressor] Archivo enorme (${(file.size/1024/1024).toFixed(1)}MB), compresión muy agresiva`);
    } else if (file.size > 15 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(effectiveMaxWidth, 700);
      effectiveMaxHeight = Math.min(effectiveMaxHeight, 700);
      effectiveQuality = 0.55;
      console.log('[ImageCompressor] Archivo muy grande (>15MB), compresión agresiva');
    } else if (file.size > 8 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(effectiveMaxWidth, 800);
      effectiveMaxHeight = Math.min(effectiveMaxHeight, 800);
      effectiveQuality = 0.6;
      console.log('[ImageCompressor] Archivo grande (>8MB), reduciendo dimensiones');
    } else if (file.size > 4 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(effectiveMaxWidth, 1000);
      effectiveMaxHeight = Math.min(effectiveMaxHeight, 1000);
      effectiveQuality = Math.min(effectiveQuality, 0.65);
      console.log('[ImageCompressor] Archivo mediano (>4MB), ajustando dimensiones');
    }

    // Intentar comprimir con timeout de seguridad
    try {
      // Método 1: createImageBitmap (más eficiente en memoria)
      let result = await withTimeout(
        compressViaImageBitmap(file, effectiveMaxWidth, effectiveMaxHeight, effectiveQuality),
        TIMEOUT_MS
      );

      if (result) {
        console.log(`[ImageCompressor] OK (ImageBitmap): ${(file.size/1024).toFixed(0)}KB → ${(result.size/1024).toFixed(0)}KB`);
        resolve(result);
        return;
      }

      // Método 2: ObjectURL + Image (fallback para Safari antiguo)
      result = await withTimeout(
        compressViaObjectURL(file, effectiveMaxWidth, effectiveMaxHeight, effectiveQuality),
        TIMEOUT_MS
      );

      if (result) {
        console.log(`[ImageCompressor] OK (ObjectURL): ${(file.size/1024).toFixed(0)}KB → ${(result.size/1024).toFixed(0)}KB`);
        resolve(result);
        return;
      }

      // ÚLTIMO RECURSO: Si la foto es enorme y no se pudo comprimir,
      // NO devolver el original (50MB crashearía la subida y dejaría la app en blanco).
      // En su lugar, rechazar con un error claro para que el usuario sepa qué hacer.
      if (file.size > 5 * 1024 * 1024) {
        console.error(`[ImageCompressor] No se pudo comprimir archivo de ${(file.size/1024/1024).toFixed(1)}MB. Rechazando.`);
        // Crear un error que el código que llama pueda capturar
        const error = new Error('IMAGEN_DEMASIADO_GRANDE');
        error.userMessage = `La foto es demasiado grande (${(file.size/1024/1024).toFixed(0)}MB). Por favor, baja la resolución de la cámara en Ajustes (de 200MP a 12MP o 50MP) e inténtalo de nuevo.`;
        reject(error);
        return;
      }

      // Para archivos pequeños que fallaron la compresión, devolver original
      console.warn('[ImageCompressor] Compresión fallida, usando archivo original');
      resolve(file);
    } catch (err) {
      // Si es un archivo enorme, NO devolver original
      if (file.size > 5 * 1024 * 1024) {
        console.error(`[ImageCompressor] Error con archivo de ${(file.size/1024/1024).toFixed(1)}MB:`, err);
        const error = new Error('IMAGEN_DEMASIADO_GRANDE');
        error.userMessage = `No se pudo procesar la foto (${(file.size/1024/1024).toFixed(0)}MB). Baja la resolución de la cámara en Ajustes e inténtalo de nuevo.`;
        reject(error);
        return;
      }
      console.warn('[ImageCompressor] Error inesperado, usando archivo original:', err);
      resolve(file);
    }
  });
}