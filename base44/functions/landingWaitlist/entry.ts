import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Apunta a un usuario a la lista de espera de una landing.
// PÚBLICO. Crea una LandingSubmission con estado="lista_espera".
Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { landing_page_id, nombre, email, telefono, user_agent, referrer } = body;

    if (!landing_page_id || !email) {
      return Response.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const page = await base44.asServiceRole.entities.LandingPage.get(landing_page_id);
    if (!page) return Response.json({ error: 'Página no encontrada' }, { status: 404 });

    // Evitar duplicados
    const existentes = await base44.asServiceRole.entities.LandingSubmission.filter({
      landing_page_id, email, estado: 'lista_espera',
    });
    if (existentes && existentes.length > 0) {
      return Response.json({ ok: true, already: true });
    }

    await base44.asServiceRole.entities.LandingSubmission.create({
      landing_page_id,
      landing_slug: page.slug,
      nombre: nombre || '',
      email,
      telefono: telefono || '',
      datos: { lista_espera: true },
      estado: 'lista_espera',
      user_agent: user_agent || '',
      referrer: referrer || '',
    });

    // Actualizar contador
    try {
      const stats = page.estadisticas || {};
      await base44.asServiceRole.entities.LandingPage.update(landing_page_id, {
        estadisticas: { ...stats, lista_espera_count: (stats.lista_espera_count || 0) + 1 },
      });
    } catch {}

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});