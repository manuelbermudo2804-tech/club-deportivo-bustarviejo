import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { landing_page_id } = await req.json();
    if (!landing_page_id) return Response.json({ error: 'Falta landing_page_id' }, { status: 400 });

    // Cargar la página con permisos de servicio para comprobar autorización
    const page = await base44.asServiceRole.entities.LandingPage.get(landing_page_id);
    if (!page) return Response.json({ error: 'Página no encontrada' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const authorized = (page.panel_gestion?.emails_autorizados || [])
      .map((e) => (e || '').toLowerCase().trim());
    const myEmail = (user.email || '').toLowerCase().trim();

    if (!isAdmin && !authorized.includes(myEmail)) {
      return Response.json({ error: 'Sin permiso para esta página' }, { status: 403 });
    }

    // El usuario está autorizado → devolver las inscripciones con permisos de servicio
    const submissions = await base44.asServiceRole.entities.LandingSubmission.filter(
      { landing_page_id },
      '-created_date',
      500
    );

    return Response.json({ submissions: submissions || [], page });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});