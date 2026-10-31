import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

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

    let accessToken: string;
    try {
      const connection = await base44.asServiceRole.connectors.getConnection('x');
      accessToken = connection.accessToken;
    } catch (connectionError) {
      console.error('publishToX: no se pudo recuperar la conexión de X:', connectionError);
      const detail = connectionError instanceof Error ? connectionError.message : String(connectionError || '');
      return Response.json({
        success: false,
        needs_connection: true,
        error: detail
          ? `Base44 no pudo recuperar la autorización de X: ${detail}`
          : 'Base44 no pudo recuperar la autorización de X. La conexión aparece activa, pero el servidor no puede acceder a ella.',
      }, { status: 400 });
    }

    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.data?.id) {
      const detail = payload?.detail
        || payload?.title
        || payload?.errors?.[0]?.message
        || 'X no ha aceptado la publicación.';
      return Response.json({ success: false, error: detail, status: response.status }, { status: 400 });
    }

    return Response.json({
      success: true,
      post_id: payload.data.id,
      text: payload.data.text || text,
      url: `https://x.com/i/web/status/${payload.data.id}`,
    });
  } catch (error) {
    console.error('publishToX error:', error);
    return Response.json({ success: false, error: error?.message || 'Error inesperado al publicar en X.' }, { status: 500 });
  }
});