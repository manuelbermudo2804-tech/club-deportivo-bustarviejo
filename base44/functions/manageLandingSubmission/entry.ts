import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, submission_id, estado } = await req.json();
    if (!action || !submission_id) {
      return Response.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Cargar la inscripción y su página para validar autorización
    const submission = await base44.asServiceRole.entities.LandingSubmission.get(submission_id);
    if (!submission) return Response.json({ error: 'Inscripción no encontrada' }, { status: 404 });

    const page = await base44.asServiceRole.entities.LandingPage.get(submission.landing_page_id);
    const isAdmin = user.role === 'admin';
    const authorized = (page?.panel_gestion?.emails_autorizados || [])
      .map((e) => (e || '').toLowerCase().trim());
    const myEmail = (user.email || '').toLowerCase().trim();

    if (!isAdmin && !authorized.includes(myEmail)) {
      return Response.json({ error: 'Sin permiso para esta página' }, { status: 403 });
    }

    if (action === 'update_estado') {
      await base44.asServiceRole.entities.LandingSubmission.update(submission_id, { estado });
      return Response.json({ ok: true });
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.LandingSubmission.delete(submission_id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});