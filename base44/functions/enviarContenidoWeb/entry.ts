import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Recibe una foto o vídeo enviado desde la web pública del club (sin registro)
// y lo deja en el Centro de Contenido con estado "pendiente" para que el club lo revise.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const equipo = String(body?.equipo || '').trim();
    const nombre = String(body?.nombre || '').trim();
    const email = String(body?.email || '').trim();
    const descripcion = String(body?.descripcion || '').trim();
    const archivoNombre = String(body?.archivo_nombre || 'envio').trim();
    const archivoTipo = String(body?.archivo_tipo || '');
    const archivoBase64 = String(body?.archivo_base64 || '');
    console.log('[enviarContenidoWeb] recibido', { equipo, nombre, archivoTipo, largoBase64: archivoBase64.length });

    if (!archivoBase64) return Response.json({ error: 'Falta el archivo' }, { status: 400 });
    if (!equipo) return Response.json({ error: 'Falta indicar el equipo' }, { status: 400 });
    if (!nombre) return Response.json({ error: 'Falta tu nombre' }, { status: 400 });

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
    console.log('[enviarContenidoWeb] decodificado, bytes:', bytes.length);

    const blob = new Blob([bytes], { type: archivoTipo });
    const file = new File([blob], archivoNombre, { type: archivoTipo });
    console.log('[enviarContenidoWeb] subiendo archivo...');
    const subida = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    console.log('[enviarContenidoWeb] subida OK', subida?.file_url ? 'con url' : 'sin url');
    if (!subida?.file_url) {
      return Response.json({ error: 'No se pudo guardar el archivo. Inténtalo de nuevo.' }, { status: 500 });
    }

    const now = new Date();
    const y = now.getFullYear();
    const temporada = now.getMonth() + 1 >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

    const db = createClientFromRequest(req);
    const registro = await db.asServiceRole.entities.ContenidoClub.create({
      tipo: esVideo ? 'video' : 'foto',
      archivo_url: subida.file_url,
      descripcion,
      equipo,
      autor_nombre: nombre,
      autor_email: email,
      estado: 'pendiente',
      temporada,
      notas_admin: 'Enviado desde la web pública',
    });
    console.log('[enviarContenidoWeb] registro creado', registro?.id);

    return Response.json({ success: true, id: registro?.id || null });
  } catch (error) {
    console.error('[enviarContenidoWeb] error', error);
    return Response.json({ error: error.message || 'Error inesperado' }, { status: 500 });
  }
});