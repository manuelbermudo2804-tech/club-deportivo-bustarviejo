import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backend function: recibe una imagen cruda (multipart/form-data o binary body),
 * la redimensiona y comprime usando Web APIs (OffscreenCanvas), 
 * y la sube al storage. Devuelve la URL final.
 * 
 * - Convierte a JPG
 * - Lado largo máximo: 1500px
 * - Calidad: 75%
 * - Si > 2MB tras primera compresión, recomprime a q=60
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let fileBlob;
    let originalName = 'photo.jpg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return Response.json({ error: 'No se envió ningún archivo' }, { status: 400 });
      }
      originalName = file.name || 'photo.jpg';
      fileBlob = file;
    } else {
      // Raw binary body (base44 SDK sends binary when you pass a File)
      const body = await req.arrayBuffer();
      if (!body || body.byteLength === 0) {
        return Response.json({ error: 'Cuerpo vacío' }, { status: 400 });
      }
      // Detect type from the content-type header
      const ct = contentType || 'image/jpeg';
      fileBlob = new Blob([body], { type: ct });
    }

    // Validate size (double check — frontend limits to 5MB)
    if (fileBlob.size > 10 * 1024 * 1024) {
      return Response.json({
        error: 'Archivo demasiado grande',
        userMessage: 'El archivo supera los 10MB. Reduce la resolución de la cámara.'
      }, { status: 413 });
    }

    const MAX_SIDE = 1500;

    // Decode image using createImageBitmap (available in Deno Deploy)
    let bitmap;
    try {
      bitmap = await createImageBitmap(fileBlob);
    } catch (decodeErr) {
      console.error('[processImage] Error decodificando imagen:', decodeErr);
      // If we can't decode (e.g. HEIC on server without codec), upload as-is
      // Base44's UploadFile can handle it and some formats display fine
      const uploadResult = await base44.integrations.Core.UploadFile({ file: fileBlob });
      return Response.json({
        file_url: uploadResult.file_url,
        size_kb: Math.round(fileBlob.size / 1024),
        note: 'uploaded_without_processing'
      });
    }

    // Calculate target dimensions (fit inside MAX_SIDE, keep aspect ratio)
    let targetW = bitmap.width;
    let targetH = bitmap.height;
    if (targetW > MAX_SIDE || targetH > MAX_SIDE) {
      const ratio = Math.min(MAX_SIDE / targetW, MAX_SIDE / targetH);
      targetW = Math.round(targetW * ratio);
      targetH = Math.round(targetH * ratio);
    }

    // Draw onto OffscreenCanvas and export as JPEG
    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    // First pass: quality 0.75
    let jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
    console.log(`[processImage] Pass 1: ${targetW}x${targetH}, ${(jpegBlob.size/1024).toFixed(0)}KB`);

    // If still > 2MB, recompress at lower quality
    if (jpegBlob.size > 2 * 1024 * 1024) {
      jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.60 });
      console.log(`[processImage] Pass 2 (q=60): ${(jpegBlob.size/1024).toFixed(0)}KB`);
    }

    // If STILL > 2MB, reduce dimensions further
    if (jpegBlob.size > 2 * 1024 * 1024) {
      const smallerW = Math.round(targetW * 0.7);
      const smallerH = Math.round(targetH * 0.7);
      const canvas2 = new OffscreenCanvas(smallerW, smallerH);
      const ctx2 = canvas2.getContext('2d');
      // Re-decode from the first jpeg to avoid re-decoding original
      const tmpBitmap = await createImageBitmap(jpegBlob);
      ctx2.drawImage(tmpBitmap, 0, 0, smallerW, smallerH);
      tmpBitmap.close();
      jpegBlob = await canvas2.convertToBlob({ type: 'image/jpeg', quality: 0.60 });
      console.log(`[processImage] Pass 3 (${smallerW}x${smallerH}, q=60): ${(jpegBlob.size/1024).toFixed(0)}KB`);
    }

    // Create File for upload
    const fileName = originalName.replace(/\.[^.]+$/, '.jpg');
    const finalFile = new File([jpegBlob], fileName, { type: 'image/jpeg' });

    // Upload to Base44 storage
    const { file_url } = await base44.integrations.Core.UploadFile({ file: finalFile });

    return Response.json({
      file_url,
      size_kb: Math.round(jpegBlob.size / 1024)
    });

  } catch (error) {
    console.error('[processImage] Error:', error);
    return Response.json({
      error: error.message || 'Error procesando imagen',
      userMessage: 'Error al procesar la imagen en el servidor. Inténtalo de nuevo.'
    }, { status: 500 });
  }
});