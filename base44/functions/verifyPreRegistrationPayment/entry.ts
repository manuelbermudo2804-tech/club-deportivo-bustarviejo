import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

    const { sessionId } = await req.json();
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return Response.json({ error: 'Sesión de pago no válida.' }, { status: 400 });
    }
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) return Response.json({ error: 'Stripe no está configurado.' }, { status: 500 });

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = session.metadata || {};

    // La confirmación se obtiene directamente de Stripe; no se confía en parámetros del navegador.
    if (metadata.tipo !== 'inscripcion_previa' ||
        String(metadata.user_email || '').toLowerCase() !== String(user.email).toLowerCase()) {
      return Response.json({ paid: false, error: 'El pago no corresponde a esta cuenta.' }, { status: 403 });
    }
    if (session.mode !== 'payment' ||
        session.currency !== 'eur' ||
        !Array.isArray(session.payment_method_types) ||
        !session.payment_method_types.includes('card') ||
        !['Único', 'Tres meses'].includes(metadata.modalidad) ||
        !metadata.categoria ||
        !metadata.temporada) {
      return Response.json({ paid: false, error: 'La sesión no corresponde a un pago previo válido con tarjeta.' }, { status: 409 });
    }
    if (session.payment_status !== 'paid') {
      return Response.json({ paid: false, status: session.payment_status || session.status });
    }
    const amount = Number(metadata.importe_euros);
    if (!Number.isFinite(amount) || Math.round(amount * 100) !== Number(session.amount_total)) {
      return Response.json({ paid: false, error: 'El importe confirmado no coincide con la inscripción.' }, { status: 409 });
    }

    return Response.json({
      paid: true,
      sessionId: session.id,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
      categoria: metadata.categoria,
      modalidad: metadata.modalidad,
      temporada: metadata.temporada,
      amount,
      email: user.email,
    });
  } catch (error) {
    console.error('[verifyPreRegistrationPayment]', error?.message || error);
    return Response.json({ error: 'No se pudo verificar el pago con Stripe.' }, { status: 500 });
  }
});