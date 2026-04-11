/**
 * Validador de imágenes para frontend.
 * 
 * NO hace procesamiento pesado (ni canvas, ni resize, ni base64).
 * Solo valida tamaño y formato antes de subir al backend.
 * El redimensionado y compresión se hacen en el backend (sharp).
 */

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Valida una imagen antes de subirla.
 * - Rechaza archivos > 5MB
 * - Detecta formato HEIC en navegadores que no lo soportan
 * - NO toca la imagen (sin canvas, sin resize, sin base64)
 * 
 * @param {File} file
 * @returns {Promise<File>} el mismo archivo si pasa validación
 * @throws {Error} con .userMessage si no pasa
 */
export function validateImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(file); return; }

    // Archivo vacío (tamaño 0) — ocurre en algunos Android WebView al cancelar cámara
    if (file.size === 0) {
      const error = new Error('ARCHIVO_VACIO');
      error.userMessage = 'La imagen está vacía o no se pudo leer. Inténtalo de nuevo.';
      reject(error);
      return;
    }

    // Normalizar MIME: algunos Android devuelven "" o "application/octet-stream"
    const mimeType = file.type || '';
    const isImageByMime = mimeType.startsWith('image/');
    const isImageByExt = /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name || '');
    const isUnknownMime = mimeType === '' || mimeType === 'application/octet-stream';

    // Verificar que es imagen (por MIME o por extensión, o MIME genérico aceptable)
    const isImage = isImageByMime || isImageByExt || isUnknownMime;
    if (!isImage) { resolve(file); return; }

    // Límite de tamaño: 5MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      const error = new Error('ARCHIVO_DEMASIADO_GRANDE');
      error.userMessage = `La foto pesa ${sizeMB}MB y el máximo es ${MAX_FILE_SIZE_MB}MB. Por favor:\n• Baja la resolución de la cámara en Ajustes (ej: de 200MP a 12MP)\n• O envía la foto por WhatsApp a ti mismo y súbela desde ahí (se reduce automáticamente)`;
      reject(error);
      return;
    }

    // HEIC: verificar si el navegador puede al menos seleccionarlo
    // En iOS Safari funciona nativamente, en Android Chrome no
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' ||
                   /\.(heic|heif)$/i.test(file.name || '');
    if (isHEIC) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
      const isMacSafari = /Macintosh.*Safari/i.test(navigator.userAgent || '') && !/Chrome/i.test(navigator.userAgent || '');
      if (!isIOS && !isMacSafari) {
        // El backend (sharp) SÍ soporta HEIC, pero el navegador podría no poder enviarlo bien
        // Aceptar y dejar que el backend lo maneje — sharp lo convierte sin problema
        console.log('[validateImage] HEIC en Android/Chrome — el backend lo procesará');
      }
    }

    resolve(file);
  });
}

/**
 * @deprecated Usar validateImage() en su lugar. 
 * Se mantiene por compatibilidad con componentes que aún la importan.
 * Simplemente redirige a validateImage (ya no comprime nada en frontend).
 */
export function compressImage(file, _options) {
  return validateImage(file);
}