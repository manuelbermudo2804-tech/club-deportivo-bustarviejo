/**
 * Comprime una imagen antes de subirla.
 * OPTIMIZADO para iPhones antiguos y Android con poca memoria.
 * 
 * Estrategias:
 * 1. Usa createImageBitmap (más eficiente que Image + readAsDataURL) cuando está disponible
 * 2. Limita el canvas a dimensiones seguras para iOS Safari (max ~4096px)
 * 3. Libera memoria agresivamente (revokeObjectURL, nullificar canvas)
 * 4. Fallback robusto: si algo falla, sube el original
 * 5. Timeout de seguridad para evitar que el proceso se quede colgado
 */

// Tamaño máximo seguro de canvas para iOS Safari antiguo
// iOS Safari tiene un límite de ~16.7 MP pero en iPhones antiguos (6s, 7, SE1) puede ser ~4 MP
// Usamos 5MP como límite seguro universal para evitar crash/pantalla en blanco
const MAX_CANVAS_PIXELS = 2560 * 2048; // ~5MP - seguro incluso en iPhone 6s/7/SE
const MAX_CANVAS_SIDE = 2560; // Ningún lado mayor a esto
const TIMEOUT_MS = 20000; // 20 segundos máximo por imagen (HEIC puede tardar más)

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
 * Comprime usando createImageBitmap (más eficiente, disponible en navegadores modernos)
 */
async function compressViaImageBitmap(file, maxWidth, maxHeight, quality) {
  try {
    if (typeof createImageBitmap !== 'function') return null;

    const bitmap = await createImageBitmap(file);
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
          // Limpiar canvas
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

    // Si es muy pequeña (< 300KB), no comprimir
    if (file.size < 300 * 1024) { resolve(file); return; }

    // Para archivos muy grandes (> 15MB), ser más agresivo con la compresión
    let effectiveMaxWidth = maxWidth;
    let effectiveMaxHeight = maxHeight;
    let effectiveQuality = quality;
    
    if (file.size > 15 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(maxWidth, 800);
      effectiveMaxHeight = Math.min(maxHeight, 800);
      effectiveQuality = 0.6;
      console.log('[ImageCompressor] Archivo muy grande (>15MB), usando compresión agresiva');
    } else if (file.size > 8 * 1024 * 1024) {
      effectiveMaxWidth = Math.min(maxWidth, 1000);
      effectiveMaxHeight = Math.min(maxHeight, 1000);
      effectiveQuality = 0.65;
      console.log('[ImageCompressor] Archivo grande (>8MB), reduciendo dimensiones');
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

      // Si ningún método funcionó, devolver original
      console.warn('[ImageCompressor] Compresión fallida, usando archivo original');
      resolve(file);
    } catch (err) {
      console.warn('[ImageCompressor] Error inesperado, usando archivo original:', err);
      resolve(file);
    }
  });
}