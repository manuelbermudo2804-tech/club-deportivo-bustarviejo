import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    // Buscar customers por email
    const customers = await stripe.customers.list({ email, limit: 5 });

    const results = [];

    for (const customer of customers.data) {
      // Buscar suscripciones de cada customer
      const subscriptions = await stripe.subscriptions.list({ customer: customer.id, limit: 10 });

      results.push({
        customer_id: customer.id,
        customer_email: customer.email,
        customer_name: customer.name,
        created: new Date(customer.created * 1000).toISOString(),
        subscriptions: subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          metadata: sub.metadata,
          items: sub.items.data.map(item => ({
            price_id: item.price.id,
            amount: item.price.unit_amount / 100,
            currency: item.price.currency,
            interval: item.price.recurring?.interval,
          }))
        }))
      });
    }

    // También buscar los últimos checkout sessions de ese email
    const sessions = await stripe.checkout.sessions.list({ limit: 10 });
    const emailSessions = sessions.data.filter(s => 
      (s.customer_details?.email || s.customer_email || '').toLowerCase() === email.toLowerCase()
    );

    return Response.json({
      email,
      customers_found: results.length,
      customers: results,
      recent_sessions: emailSessions.map(s => ({
        id: s.id,
        mode: s.mode, // 'payment' o 'subscription'
        status: s.status,
        payment_status: s.payment_status,
        amount_total: (s.amount_total || 0) / 100,
        subscription: s.subscription,
        metadata: s.metadata,
        created: new Date(s.created * 1000).toISOString(),
      }))
    });
  } catch (error) {
    console.error('[stripeCheckCustomer] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});