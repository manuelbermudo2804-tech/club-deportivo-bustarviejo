import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Webhook: valida firma y ejecuta lógica mínima de negocio
Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

  if (!webhookSecret || !stripeSecret) {
    console.error('[stripe-webhook] Falta STRIPE_WEBHOOK_SECRET o STRIPE_SECRET_KEY');
    return Response.json({ error: 'Stripe no está configurado' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Firma inválida:', err?.message || err);
    return new Response('Signature verification failed', { status: 400 });
  }

  // A partir de aquí, el request es auténtico. Usamos service role para operar en BD.
  const base44 = createClientFromRequest(req);

  try {
    console.log('[stripe-webhook] Recibido', { id: event.id, type: event.type, livemode: event.livemode });

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const metadata = session.metadata || {};
      const status = session.payment_status || session.status;
      console.log('[stripe-webhook] checkout.session.completed', { session_id: session.id, status, metadata });

      if (status === 'paid') {
        const nowIso = new Date().toISOString();

        // Caso 1: pago individual de cuota
        if (metadata.tipo === 'pago_cuota' && metadata.payment_id) {
          try {
            await base44.asServiceRole.entities.Payment.update(metadata.payment_id, {
              estado: 'Pagado',
              fecha_pago: nowIso,
            });
            console.log('[stripe-webhook] Payment marcado Pagado', { payment_id: metadata.payment_id });
          } catch (e) {
            console.error('[stripe-webhook] Error actualizando Payment:', e?.message || e);
          }
        }

        // Caso 2: pago por carrito/lote
        if (metadata.tipo === 'pago_cuota_batch') {
          try {
            // Buscar el lote por session.id (método más fiable) o por batch_id si llega
            let batches = await base44.asServiceRole.entities.BatchPayment.filter({ stripe_session_id: session.id });
            let batch = batches?.[0];
            if (!batch && metadata.batch_id) {
              batches = await base44.asServiceRole.entities.BatchPayment.filter({ id: metadata.batch_id });
              batch = batches?.[0];
            }

            if (batch) {
              // Actualizar estado del lote
              await base44.asServiceRole.entities.BatchPayment.update(batch.id, {
                status: 'paid',
                paid_at: nowIso,
              });

              // Marcar todos los payments del lote como Pagado
              const items = Array.isArray(batch.items) ? batch.items : [];
              for (const it of items) {
                if (!it?.payment_id) continue;
                try {
                  await base44.asServiceRole.entities.Payment.update(it.payment_id, {
                    estado: 'Pagado',
                    fecha_pago: nowIso,
                  });
                } catch (e) {
                  console.error('[stripe-webhook] Error marcando pago de lote:', it.payment_id, e?.message || e);
                }
              }
              console.log('[stripe-webhook] Lote pagado', { batch_id: batch.id, items: items.length });
            } else {
              console.warn('[stripe-webhook] Lote no encontrado para session', session.id);
            }
          } catch (e) {
            console.error('[stripe-webhook] Error procesando lote:', e?.message || e);
          }
        }

        // Otros tipos (ej: extra_charge) se añadirán después si hace falta
      }
    }
  } catch (e) {
    // No devolvemos 500 para evitar reintentos infinitos; solo registramos.
    console.error('[stripe-webhook] Error general manejando evento:', e?.message || e);
  }

  // Siempre 200 tras validar firma
  return Response.json({ received: true });
});