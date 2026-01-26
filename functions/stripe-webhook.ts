import Stripe from 'npm:stripe@14.21.0';

// Webhook inicial mínimo: solo valida firma y responde 200
Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

  if (!webhookSecret || !stripeSecret) {
    console.error('[stripe-webhook:init] Falta STRIPE_WEBHOOK_SECRET o STRIPE_SECRET_KEY');
    return Response.json({ error: 'Stripe no está configurado' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

  try {
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    console.log('[stripe-webhook:init] OK', { id: event.id, type: event.type, livemode: event.livemode });
    return Response.json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook:init] Firma inválida:', err?.message || err);
    return new Response('Signature verification failed', { status: 400 });
  }
});