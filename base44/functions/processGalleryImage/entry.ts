import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Procesador exclusivo de la galería del club.
 * No modifica processImage: inscripciones y chats mantienen su optimización ligera.
 * Conserva más resolución/calidad para fotografías que se verán y descargarán.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const contentType = req.headers.get('content-type') || '';
    let file;
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = formData.get('image') || formData.get('file');
      if (!file || !(file instanceof File)) {
        return Response.json({ error: 'No se envió ningún archivo de imagen' }, { status: 400 });
      }
    } else {
      return Response.json({ error: 'Envía la imagen como File' }, { status: 400 });
    }

    // Tope de entrada defensivo. Los archivos que no se puedan procesar se pueden subir
    // desde el cliente por la ruta original de respaldo.
    if (!file.size || file.size > 20 * 1024 * 1024) {
      return Response.json({ error: 'Archivo vacío o superior a 20 MB' }, { status: 413 });
    }

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      // HEIC/formatos no decodificables: no forzar conversión con pérdida.
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      return Response.json({ file_url: uploaded.file_url, note: 'uploaded_without_processing' });
    }

    // Calidad de galería: 2400 px y JPEG 88%; solo reducir más si supera 5 MB.
    const MAX_SIDE = 2400;
    const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      return Response.json({ file_url: uploaded.file_url, note: 'uploaded_without_processing' });
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let output = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
    if (output.size > 5 * 1024 * 1024) {
      output = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
    }
    if (output.size > 5 * 1024 * 1024) {
      const smallerCanvas = new OffscreenCanvas(Math.round(width * 0.85), Math.round(height * 0.85));
      const smallerCtx = smallerCanvas.getContext('2d');
      const decoded = await createImageBitmap(output);
      smallerCtx.drawImage(decoded, 0, 0, smallerCanvas.width, smallerCanvas.height);
      decoded.close();
      output = await smallerCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
    }

    const originalName = file.name || 'foto';
    const finalName = originalName.replace(/\.[^.]+$/, '') + '.jpg';
    const finalFile = new File([output], finalName, { type: 'image/jpeg' });
    const uploaded = await base44.integrations.Core.UploadFile({ file: finalFile });
    return Response.json({
      file_url: uploaded.file_url,
      size_kb: Math.round(output.size / 1024),
      width,
      height,
      quality_profile: 'gallery_high_quality'
    });
  } catch (error) {
    console.error('[processGalleryImage] Error:', error);
    return Response.json({ error: error?.message || 'Error al procesar la foto' }, { status: 500 });
  }
});
