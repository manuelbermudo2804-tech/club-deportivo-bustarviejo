import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint PÚBLICO (sin auth) para el constructor de páginas.
// Acciones:
//   - action="get"     → devuelve { page } por slug
//   - action="submit"  → crea LandingSubmission y dispara email de confirmación
//   - action="visit"   → incrementa contador de visitas (best-effort)
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'get') {
      const slug = (body.slug || '').toString().trim();
      if (!slug) return Response.json({ page: null });
      const results = await base44.asServiceRole.entities.LandingPage.filter({ slug });
      const page = results?.[0] || null;
      return Response.json({ page });
    }

    if (action === 'visit') {
      const pageId = (body.page_id || '').toString();
      if (!pageId) return Response.json({ ok: false });
      try {
        const page = await base44.asServiceRole.entities.LandingPage.get(pageId);
        const visitas = (page?.estadisticas?.visitas || 0) + 1;
        await base44.asServiceRole.entities.LandingPage.update(pageId, {
          estadisticas: { ...(page?.estadisticas || {}), visitas },
        });
      } catch {}
      return Response.json({ ok: true });
    }

    if (action === 'submit') {
      const pageId = (body.landing_page_id || '').toString();
      if (!pageId) return Response.json({ error: 'landing_page_id requerido' }, { status: 400 });
      const page = await base44.asServiceRole.entities.LandingPage.get(pageId);
      if (!page) return Response.json({ error: 'Página no encontrada' }, { status: 404 });
      if (page.estado === 'cerrada' || page.estado === 'archivada') {
        return Response.json({ error: 'Inscripciones cerradas' }, { status: 403 });
      }

      const submission = await base44.asServiceRole.entities.LandingSubmission.create({
        landing_page_id: pageId,
        landing_slug: page.slug || body.landing_slug || '',
        nombre: body.nombre || '',
        email: body.email || '',
        telefono: body.telefono || '',
        datos: body.datos || {},
        estado: 'nuevo',
        user_agent: body.user_agent || '',
        referrer: body.referrer || '',
      });

      // Actualizar estadísticas (best-effort)
      try {
        const stats = page.estadisticas || {};
        await base44.asServiceRole.entities.LandingPage.update(pageId, {
          estadisticas: {
            ...stats,
            inscripciones: (stats.inscripciones || 0) + 1,
            ultima_inscripcion: new Date().toISOString(),
          },
        });
      } catch {}

      // Disparar email de confirmación (best-effort, no bloquea respuesta)
      try {
        base44.asServiceRole.functions
          .invoke('sendLandingConfirmation', { submissionId: submission.id })
          .catch(() => {});
      } catch {}

      return Response.json({ ok: true, submission_id: submission.id });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('landingPublic error:', error);
    return Response.json({ error: error.message || 'Error' }, { status: 500 });
  }
});