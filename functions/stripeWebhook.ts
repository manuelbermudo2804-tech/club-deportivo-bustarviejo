import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecret || !webhookSecret) {
      console.error('[stripeWebhook] Missing Stripe secrets');
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    // IMPORTANT: Deno/Web Crypto requires the async version
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);

    // You can use service role if you need to write to entities
    const base44 = createClientFromRequest(req);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('[stripeWebhook] checkout.session.completed', {
          id: session.id,
          amount_total: session.amount_total,
          currency: session.currency,
          metadata: session.metadata,
          payment_intent: session.payment_intent,
        });
        // Example placeholder: here you could update your entities
        // await base44.asServiceRole.entities.Payment.create({...})
        break;
      }
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        console.log(`[stripeWebhook] ${event.type}`, { id: pi.id, amount: pi.amount, status: pi.status });
        break;
      }
      default:
        console.log('[stripeWebhook] Unhandled event', event.type);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] Error:', error);
    return new Response('Webhook Error', { status: 400 });
  }
});