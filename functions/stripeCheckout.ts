import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // User not logged in
    }

    const body = await req.json();
    const { lineItems, amount, name, currency = 'eur', successUrl, cancelUrl, metadata = {} } = body || {};

    // Permitir acceso público SOLO para tipos específicos (ej: alta nuevo socio)
    const isPublicTransaction = metadata.tipo === 'alta_socio_referido';

    if (!user && !isPublicTransaction) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((!lineItems && !(amount && name)) || !successUrl || !cancelUrl) {
      return Response.json({
        error: 'Missing parameters',
        details: 'Provide successUrl, cancelUrl and either lineItems or (amount & name)'
      }, { status: 400 });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    // Si no hay usuario logueado, usar el email de los metadatos
    const customerEmail = user?.email || metadata.email || metadata.user_email;

    if (!customerEmail) {
      return Response.json({ error: 'Customer email required' }, { status: 400 });
    }

    const sessionParams = {
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || 'unknown',
        user_email: customerEmail,
        ...metadata,
      },
      automatic_tax: { enabled: false },
    };

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      // Support both price IDs and price_data objects
      sessionParams.line_items = lineItems.map((it) => {
        if (it.price || it.price_data) return it;
        return {
          price_data: it.price_data || {
            currency: currency,
            product_data: { name: it.name || 'Pago' },
            unit_amount: Math.round(Number(it.unit_amount || it.amount) * 100),
          },
          quantity: it.quantity || 1,
        };
      });
    } else {
      // Ad-hoc amount
      sessionParams.line_items = [{
        price_data: {
          currency,
          product_data: { name },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return Response.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('[stripeCheckout] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});