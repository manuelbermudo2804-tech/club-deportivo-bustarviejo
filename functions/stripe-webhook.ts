import Stripe from 'npm:stripe@14.21.0';

// Webhook mínimo: solo verifica firma y confirma recepción
// Si esto devuelve 200 en Stripe, la conexión y el secret están correctos
Deno.serve(async (req) => {
  // Leer cuerpo RAW (obligatorio para verificar la firma)
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

  if (!webhookSecret || !stripeSecret) {
    console.error('[stripeWebhook:min] Falta STRIPE_WEBHOOK_SECRET o STRIPE_SECRET_KEY');
    return Response.json({ error: 'Stripe no está configurado' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

  try {
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);

    console.log('[stripeWebhook:min] OK', {
      id: event.id,
      type: event.type,
      created: event.created,
      livemode: event.livemode,
    });

    // No procesamos nada todavía: solo confirmamos
    return Response.json({ received: true, type: event.type });
  } catch (err) {
    console.error('[stripeWebhook:min] Firma inválida / error:', err?.message || err);
    return new Response('Signature verification failed', { status: 400 });
  }
});