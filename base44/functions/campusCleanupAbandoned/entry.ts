import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import Stripe from 'npm:stripe@14.21.0';

// Cancela las inscripciones del Campus cuyo pago con tarjeta se abandonó
// (la sesión de Stripe ha caducado sin pagarse) para que no figuren como pendientes.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const liveKey = Deno.env.get('STRIPE_SECRET_KEY');
    const testKey = Deno.env.get('STRIPE_SECRET_KEY_TEST');
    const live = liveKey ? new Stripe(liveKey, { apiVersion: '2024-06-20' }) : null;
    const test = testKey ? new Stripe(testKey, { apiVersion: '2024-06-20' }) : null;

    const page = await base44.asServiceRole.entities.CampusRegistration.filter(
      { estado: 'pendiente', estado_pago: 'pendiente' }, { sort: '-created_date', limit: 500 });
    const cutoff = Date.now() - 45 * 60 * 1000;
    const candidates = (page.items || []).filter(r => r.stripe_session_id && new Date(r.created_date).getTime() < cutoff);

    const cancelled = [];
    for (const reg of candidates) {
      // Seleccionar la cuenta por el prefijo de la sesión, no por notas editables.
      // Nunca probar una sesión de un entorno con la clave del otro.
      const isTest = String(reg.stripe_session_id).startsWith('cs_test_');
      const isLive = String(reg.stripe_session_id).startsWith('cs_live_');
      const stripe = isTest ? test : isLive ? live : null;
      if (!stripe) {
        console.warn('[campusCleanupAbandoned] Entorno Stripe no identificable; se conserva la plaza', reg.id);
        continue;
      }
      const session = await stripe.checkout.sessions.retrieve(reg.stripe_session_id).catch(() => null);
      // Solo se cancela si Stripe confirma que el enlace caducó sin pago.
      if (!session || session.status !== 'expired') continue;
      const kids = await base44.asServiceRole.entities.CampusParticipant.filter({ registration_id: reg.id });
      await Promise.all((kids || []).filter(k => k.estado !== 'cancelado')
        .map(k => base44.asServiceRole.entities.CampusParticipant.update(k.id, { estado: 'cancelado' })));
      await base44.asServiceRole.entities.CampusRegistration.update(reg.id, {
        estado: 'cancelada', estado_pago: 'fallido',
        estado_alta_socio: reg.estado_alta_socio === 'pendiente' ? 'fallido' : reg.estado_alta_socio,
        notas: 'Cancelada automáticamente: el pago con tarjeta no se completó y el enlace caducó. Plazas liberadas.'
      });
      cancelled.push(reg.id);
    }
    return Response.json({ ok: true, revisadas: candidates.length, canceladas: cancelled.length });
  } catch (error) {
    console.error('[campusCleanupAbandoned]', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});