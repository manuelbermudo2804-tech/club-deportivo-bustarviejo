import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// Endpoint PÚBLICO que el cliente llama tras volver de Stripe success_url.
// Verifica el pago contra Stripe (no se fía de query params) y marca la submission
// como pagada. Idempotente: si ya está pagada, devuelve OK sin duplicar nada.
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = (body.session_id || '').toString();
    if (!sessionId) return Response.json({ error: 'session_id requerido' }, { status: 400 });

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) return Response.json({ error: 'Stripe no configurado' }, { status: 500 });

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.metadata?.tipo !== 'landing_submission') {
      return Response.json({ error: 'Sesión inválida' }, { status: 400 });
    }

    const submissionId = session.metadata?.submission_id;
    if (!submissionId) return Response.json({ error: 'submission no encontrada' }, { status: 404 });

    const submission = await base44.asServiceRole.entities.LandingSubmission.get(submissionId);
    if (!submission) return Response.json({ error: 'submission no existe' }, { status: 404 });

    // Si ya está pagada, devolver OK (idempotencia)
    if (submission.pago_estado === 'pagado') {
      return Response.json({ ok: true, already_paid: true, submission_id: submissionId });
    }

    if (session.payment_status === 'paid') {
      await base44.asServiceRole.entities.LandingSubmission.update(submissionId, {
        estado: 'nuevo',
        pago_estado: 'pagado',
        pago_stripe_payment_intent: session.payment_intent || '',
        pago_fecha: new Date().toISOString(),
      });

      // Incrementar estadísticas
      try {
        const page = await base44.asServiceRole.entities.LandingPage.get(submission.landing_page_id);
        if (page) {
          const stats = page.estadisticas || {};
          await base44.asServiceRole.entities.LandingPage.update(submission.landing_page_id, {
            estadisticas: {
              ...stats,
              inscripciones: (stats.inscripciones || 0) + 1,
              ultima_inscripcion: new Date().toISOString(),
            },
          });
        }
      } catch {}

      // Email de confirmación (best-effort)
      try {
        base44.asServiceRole.functions
          .invoke('sendLandingConfirmation', { submissionId })
          .catch(() => {});
      } catch {}

      return Response.json({ ok: true, paid: true, submission_id: submissionId });
    }

    return Response.json({ ok: false, paid: false, status: session.payment_status });
  } catch (error) {
    console.error('landingPaymentConfirm error:', error);
    return Response.json({ error: error.message || 'Error' }, { status: 500 });
  }
});