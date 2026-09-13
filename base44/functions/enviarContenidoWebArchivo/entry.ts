import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// PASO 1 del envío público de fotos/vídeos: sube el archivo y devuelve su URL.
// Se hace en una función aparte porque, en este entorno, cualquier operación
// posterior a una subida de archivo se queda colgada.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const archivoNombre = String(body?.archivo_nombre || 'envio').trim();
    const archivoTipo = String(body?.archivo_tipo || '');
    const archivoBase64 = String(body?.archivo_base64 || '');

    if (!archivoBase64) return Response.json({ error: 'Falta el archivo' }, { status: 400 });

    const esVideo = archivoTipo.startsWith('video');
    const esFoto = archivoTipo.startsWith('image');
    if (!esVideo && !esFoto) {
      return Response.json({ error: 'Solo se pueden enviar fotos o vídeos' }, { status: 400 });
    }

    const binario = atob(archivoBase64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    if (bytes.length > MAX_BYTES) {
      return Response.json({
        error: 'El archivo pesa demasiado (máximo 10 MB desde la web). Si es un vídeo largo, envíalo desde la app del club.',
      }, { status: 413 });
    }

    const file = new File([new Blob([bytes], { type: archivoTipo })], archivoNombre, { type: archivoTipo });
    const subida = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    if (!subida?.file_url) {
      return Response.json({ error: 'No se pudo guardar el archivo. Inténtalo de nuevo.' }, { status: 500 });
    }

    return Response.json({ success: true, archivo_url: subida.file_url, tipo: esVideo ? 'video' : 'foto' });
  } catch (error) {
    console.error('[enviarContenidoWebArchivo] error', error);
    return Response.json({ error: error.message || 'Error inesperado' }, { status: 500 });
  }
});