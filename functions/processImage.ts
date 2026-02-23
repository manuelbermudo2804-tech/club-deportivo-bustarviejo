import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import sharp from 'npm:sharp@0.33.2';

/**
 * Backend function: recibe una imagen cruda (multipart), la redimensiona y comprime,
 * y la sube al storage. Devuelve la URL final.
 * 
 * - Convierte a JPG
 * - Lado largo máximo: 1500px
 * - Calidad: 75%
 * - Resultado objetivo: 1-2MB máximo
 * - Soporta HEIC, PNG, WebP, BMP, GIF, TIFF nativamente vía sharp
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    let imageBuffer;
    let originalName = 'photo.jpg';

    if (contentType.includes('multipart/form-data')) {
      // Parse multipart form data
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return Response.json({ error: 'No se envió ningún archivo' }, { status: 400 });
      }
      originalName = file.name || 'photo.jpg';
      imageBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Raw binary body
      const body = await req.arrayBuffer();
      if (!body || body.byteLength === 0) {
        return Response.json({ error: 'Cuerpo vacío' }, { status: 400 });
      }
      imageBuffer = Buffer.from(body);
    }

    // Validar tamaño (doble check - frontend ya limita a 5MB)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return Response.json({ 
        error: 'Archivo demasiado grande',
        userMessage: 'El archivo supera los 10MB. Reduce la resolución de la cámara.'
      }, { status: 413 });
    }

    // Procesar con sharp: redimensionar + convertir a JPG + comprimir
    const MAX_SIDE = 1500;
    const QUALITY = 75;

    const processed = await sharp(imageBuffer)
      .rotate() // Auto-rotar según EXIF
      .resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: 'inside',           // Mantener aspect ratio, lado largo = MAX_SIDE
        withoutEnlargement: true // No agrandar imágenes pequeñas
      })
      .jpeg({ quality: QUALITY, mozjpeg: true }) // mozjpeg = mejor compresión
      .toBuffer();

    // Liberar buffer original
    imageBuffer = null;

    const processedSizeMB = (processed.length / 1024 / 1024).toFixed(2);
    console.log(`[processImage] Procesado: ${processedSizeMB}MB, ${MAX_SIDE}px max, q=${QUALITY}`);

    // Si aún es > 2MB, comprimir más agresivamente
    let finalBuffer = processed;
    if (processed.length > 2 * 1024 * 1024) {
      finalBuffer = await sharp(processed)
        .jpeg({ quality: 60, mozjpeg: true })
        .toBuffer();
      console.log(`[processImage] Re-comprimido: ${(finalBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    }

    // Crear un File/Blob para subirlo via SDK
    const fileName = originalName.replace(/\.[^.]+$/, '.jpg');
    const blob = new Blob([finalBuffer], { type: 'image/jpeg' });
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    // Subir al storage de Base44
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    return Response.json({ 
      file_url,
      size_kb: Math.round(finalBuffer.length / 1024)
    });

  } catch (error) {
    console.error('[processImage] Error:', error);
    return Response.json({ 
      error: error.message || 'Error procesando imagen',
      userMessage: 'Error al procesar la imagen en el servidor. Inténtalo de nuevo.'
    }, { status: 500 });
  }
});