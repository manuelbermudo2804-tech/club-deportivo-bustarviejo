import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Notifica al admin/gestores de una landing cuando llega una nueva inscripción.
// - Envía push notification a los emails de panel_gestion.emails_autorizados (y a admins si está marcado).
// - El email de confirmación lo gestiona sendLandingConfirmation (no duplicar aquí).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const submissionId = body?.submissionId;
    if (!submissionId) return Response.json({ error: 'submissionId requerido' }, { status: 400 });

    const submission = await base44.asServiceRole.entities.LandingSubmission.get(submissionId);
    if (!submission) return Response.json({ error: 'submission no encontrada' }, { status: 404 });
    const page = await base44.asServiceRole.entities.LandingPage.get(submission.landing_page_id);
    if (!page) return Response.json({ error: 'page no encontrada' }, { status: 404 });

    const recipients = new Set();
    (page.panel_gestion?.emails_autorizados || []).forEach((e) => {
      if (e && typeof e === 'string') recipients.add(e.toLowerCase().trim());
    });

    // Si está marcada la opción "notificar a todos los admins"
    if (page.panel_gestion?.notificar_admins) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        (admins || []).forEach((a) => a.email && recipients.add(a.email.toLowerCase()));
      } catch {}
    }

    if (recipients.size === 0) return Response.json({ ok: true, sent: 0 });

    const titulo = page.nombre || 'Nueva inscripción';
    const nombre = submission.nombre || submission.email || 'Anónimo';
    const importe = submission.pago_importe_total ? ` · ${submission.pago_importe_total}€` : '';

    let sent = 0;
    for (const email of recipients) {
      try {
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          target_email: email,
          title: `🎉 ${titulo}`,
          body: `${nombre} se ha inscrito${importe}`,
          data: { url: `/PageBuilderInscritos?id=${page.id}` },
        });
        sent++;
      } catch {}
    }

    return Response.json({ ok: true, sent });
  } catch (error) {
    console.error('notifyLandingSubmission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});