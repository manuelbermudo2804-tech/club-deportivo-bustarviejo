import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

/**
 * Publica un post de texto en X mediante el conector OAuth de Base44.
 * Body: { text: string }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return Response.json({ success: false, error: 'Escribe el texto que quieres publicar en X.' }, { status: 400 });
    }
    if (text.length > 280) {
      return Response.json({
        success: false,
        error: `X permite hasta 280 caracteres en este post. El texto tiene ${text.length}. Acórtalo antes de publicar.`,
        character_count: text.length,
        limit: 280,
      }, { status: 400 });
    }

    // Los conectores compartidos de Base44 no exponen tokens OAuth sin procesar.
    // La llamada debe pasar por el proxy de conectores de Base44.
    const result = await base44.asServiceRole.connectors.callApi('x', {
      method: 'POST',
      path: '/2/tweets',
      body: { text },
    });

    const payload = result?.data;
    const postId = payload?.data?.id ?? payload?.id;
    if (!result?.success || !postId) {
      console.error('publishToX: X rechazó la publicación:', result?.status, payload);
      const detail = payload?.detail || payload?.title || payload?.errors?.[0]?.message
        || payload?.error || 'X no ha confirmado la publicación.';
      return Response.json({ success: false, error: detail, status: result?.status }, { status: 400 });
    }

    return Response.json({
      success: true,
      post_id: postId,
      text: payload?.data?.text || payload?.text || text,
      url: `https://x.com/i/web/status/${postId}`,
    });
  } catch (error) {
    console.error('publishToX error:', error);
    return Response.json({ success: false, error: error?.message || 'Error inesperado al publicar en X.' }, { status: 500 });
  }
});