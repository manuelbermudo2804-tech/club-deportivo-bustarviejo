import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const LI_VERSION = '202503';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !user.es_coordinador) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const text = body.message || body.texto || '';
    const imageUrl = body.image_url || null;
    if (!text) return Response.json({ error: 'Falta el texto de la publicación' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');

    const baseHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'LinkedIn-Version': LI_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    };

    // 1) Buscar la página (organización) que administra la cuenta conectada
    const aclRes = await fetch(
      'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED',
      { headers: baseHeaders }
    );
    const aclData = await aclRes.json();
    if (!aclRes.ok) {
      return Response.json({ error: aclData?.message || 'No se pudieron leer las páginas de LinkedIn' }, { status: 400 });
    }
    const orgUrn = aclData?.elements?.[0]?.organization;
    if (!orgUrn) {
      return Response.json({ error: 'La cuenta conectada no administra ninguna página de LinkedIn' }, { status: 400 });
    }

    // 2) Si hay imagen, subirla primero
    let imageUrn = null;
    if (imageUrl) {
      const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ initializeUploadRequest: { owner: orgUrn } }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) {
        return Response.json({ error: initData?.message || 'Error al preparar la imagen' }, { status: 400 });
      }
      const uploadUrl = initData?.value?.uploadUrl;
      imageUrn = initData?.value?.image;

      const imgResp = await fetch(imageUrl);
      const imgBytes = new Uint8Array(await imgResp.arrayBuffer());
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: imgBytes,
      });
      if (!putRes.ok) {
        return Response.json({ error: 'Error al subir la imagen a LinkedIn' }, { status: 400 });
      }
    }

    // 3) Publicar
    const post = {
      author: orgUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    if (imageUrn) post.content = { media: { id: imageUrn } };

    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: { ...baseHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      return Response.json({ error: `LinkedIn: ${errText}` }, { status: 400 });
    }

    const postId = postRes.headers.get('x-restli-id') || null;
    return Response.json({ success: true, post_id: postId, organization: orgUrn });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});