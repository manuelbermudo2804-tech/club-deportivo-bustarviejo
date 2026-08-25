import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

/**
 * Publica en la página de Facebook del club.
 * Admite texto solo, o texto + imagen.
 *
 * Body: { message: string, image_url?: string }
 * Respuesta: { success, post_id, page_name } | { success: false, error, needs_connection? }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const { message, image_url } = await req.json();
    if (!message && !image_url) {
      return Response.json({ success: false, error: 'Falta el contenido a publicar' }, { status: 400 });
    }

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('facebook_pages');
      accessToken = conn.accessToken;
    } catch {
      return Response.json({
        success: false,
        needs_connection: true,
        error: 'Facebook no está conectado todavía. Pídele al desarrollador que active la conexión.',
      }, { status: 400 });
    }

    // 1. Localizar la página del club y su token propio
    const pagesRes = await fetch(`https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`);
    const pages = await pagesRes.json();
    const page = pages?.data?.[0];
    if (!page?.access_token) {
      return Response.json({
        success: false,
        error: pages?.error?.message || 'No se encontró ninguna página de Facebook administrada por esta cuenta',
      }, { status: 400 });
    }

    // 2. Publicar (foto si hay imagen, si no publicación de texto)
    const endpoint = image_url
      ? `https://graph.facebook.com/v25.0/${page.id}/photos`
      : `https://graph.facebook.com/v25.0/${page.id}/feed`;
    const payload = image_url
      ? { url: image_url, caption: message || '', access_token: page.access_token }
      : { message, access_token: page.access_token };

    const postRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const posted = await postRes.json();
    if (!posted?.id && !posted?.post_id) {
      return Response.json({ success: false, error: posted?.error?.message || 'No se pudo publicar en Facebook' }, { status: 400 });
    }

    return Response.json({ success: true, post_id: posted.post_id || posted.id, page_name: page.name });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});