import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Debes iniciar sesión para inscribirte.' }, { status: 401 });

    const { categoria, modalidad, temporada, successUrl, cancelUrl } = await req.json();
    if (!categoria || !['Único', 'Tres meses'].includes(modalidad) || !temporada || !successUrl || !cancelUrl) {
      return Response.json({ error: 'Faltan datos de inscripción.' }, { status: 400 });
    }

    const configs = await base44.asServiceRole.entities.CategoryConfig.filter({ nombre: categoria, activa: true });
    const config = configs.find(c => !c.temporada || c.temporada === temporada);
    if (!config || config.exigir_primer_pago !== true) {
      return Response.json({ error: 'Esta categoría no tiene habilitado el pago previo.' }, { status: 409 });
    }
    if (config.inscripciones_abiertas === false) {
      return Response.json({ error: 'Las inscripciones de esta categoría están cerradas.' }, { status: 409 });
    }

    const amount = Number(modalidad === 'Único' ? config.cuota_total : config.cuota_inscripcion);
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'La categoría no tiene un importe válido configurado.' }, { status: 400 });

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) return Response.json({ error: 'Stripe no está configurado.' }, { status: 500 });
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    // Los destinos deben pertenecer al mismo sitio de la aplicación para evitar redirecciones arbitrarias.
    const origin = new URL(req.headers.get('origin') || successUrl).origin;
    const success = new URL(successUrl);
    const cancel = new URL(cancelUrl);
    if (success.origin !== origin || cancel.origin !== origin) {
      return Response.json({ error: 'Destino de retorno no válido.' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      success_url: successUrl.includes('?') ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}` : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Inscripción CD Bustarviejo — ${categoria} — ${modalidad === 'Único' ? 'temporada completa' : 'primer pago'}` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      metadata: {
        tipo: 'inscripcion_previa',
        user_email: user.email,
        categoria,
        modalidad,
        temporada,
        importe_euros: String(amount),
        base44_app_id: Deno.env.get('BASE44_APP_ID') || 'unknown',
      },
    });

    return Response.json({ success: true, sessionId: session.id, url: session.url, amount });
  } catch (error) {
    console.error('[preRegistrationCheckout]', error?.message || error);
    return Response.json({ error: 'No se pudo iniciar el pago. Inténtalo de nuevo.' }, { status: 500 });
  }
});