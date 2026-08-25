import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

/**
 * Publica una foto en el feed de la cuenta de Instagram Business del club.
 * Instagram exige SIEMPRE una imagen (no admite texto suelto).
 *
 * Body: { caption: string, image_url: string }
 * Respuesta: { success, post_id } | { success: false, error, needs_connection? }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const { caption, image_url } = await req.json();
    if (!image_url) {
      return Response.json({
        success: false,
        error: 'Instagram necesita una imagen. Genera o sube una foto antes de publicar.',
      }, { status: 400 });
    }

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('instagram');
      accessToken = conn.accessToken;
    } catch {
      return Response.json({
        success: false,
        needs_connection: true,
        error: 'Instagram no está conectado todavía. Pídele al desarrollador que active la conexión.',
      }, { status: 400 });
    }

    // 1. Obtener el ID de la cuenta
    const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
    const me = await meRes.json();
    if (!me?.id) {
      return Response.json({ success: false, error: me?.error?.message || 'No se pudo leer la cuenta de Instagram' }, { status: 400 });
    }

    // 2. Crear el contenedor de media
    const createRes = await fetch(`https://graph.instagram.com/v21.0/${me.id}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url, caption: caption || '', access_token: accessToken }),
    });
    const created = await createRes.json();
    if (!created?.id) {
      return Response.json({ success: false, error: created?.error?.message || 'Instagram rechazó la imagen' }, { status: 400 });
    }

    // 3. Publicar el contenedor
    const pubRes = await fetch(`https://graph.instagram.com/v21.0/${me.id}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: created.id, access_token: accessToken }),
    });
    const published = await pubRes.json();
    if (!published?.id) {
      return Response.json({ success: false, error: published?.error?.message || 'No se pudo publicar en Instagram' }, { status: 400 });
    }

    return Response.json({ success: true, post_id: published.id, username: me.username });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});