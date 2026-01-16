import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lineItems, amount, name, currency = 'eur', successUrl, cancelUrl, metadata = {} } = body || {};

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

    const sessionParams = {
      mode: 'payment',
      customer_email: user.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || 'unknown',
        user_email: user.email,
        ...metadata,
      },
    };

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      // Expecting items like { price: 'price_xxx', quantity: 1 }
      sessionParams.line_items = lineItems;
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