import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: al crear un Payment, rellena email_padre/email_tutor_2
// desde el Player si no vienen ya en el documento. Necesario para que el RLS
// permita a las familias ver sus propios pagos.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { event, data, payload_too_large } = body || {};

    if (!event || event.type !== 'create' || event.entity_name !== 'Payment') {
      return Response.json({ ok: true, skipped: 'not a payment create' });
    }

    let payment = data;
    if (payload_too_large || !payment) {
      try { payment = await base44.asServiceRole.entities.Payment.get(event.entity_id); } catch { payment = null; }
    }
    if (!payment) return Response.json({ ok: true, skipped: 'no payment data' });
    if (payment.email_padre) return Response.json({ ok: true, skipped: 'already filled' });
    if (!payment.jugador_id) return Response.json({ ok: true, skipped: 'no jugador_id' });

    let player = null;
    try { player = await base44.asServiceRole.entities.Player.get(payment.jugador_id); } catch {}
    if (!player) return Response.json({ ok: true, skipped: 'player not found' });

    const patch = { email_padre: player.email_padre || 'unknown@cdbustarviejo.com' };
    if (player.email_tutor_2) patch.email_tutor_2 = player.email_tutor_2;

    await base44.asServiceRole.entities.Payment.update(event.entity_id, patch);
    return Response.json({ ok: true, updated: true, patch });
  } catch (error) {
    console.error('autoFillPaymentEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});