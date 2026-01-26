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
        const today = new Date().toISOString().slice(0,10);

        // Caso 1: pago individual de cuota
        if (metadata.tipo === 'pago_cuota' && metadata.payment_id) {
          try {
            const updated = await base44.asServiceRole.entities.Payment.update(metadata.payment_id, {
              estado: 'Pagado',
              fecha_pago: today,
            });
            console.log('[stripe-webhook] Payment marcado Pagado', { payment_id: metadata.payment_id });

            // Enviar emails a los tutores
            try {
              const payments = await base44.asServiceRole.entities.Payment.filter({ id: metadata.payment_id });
              const payment = payments?.[0];
              if (payment?.jugador_id) {
                const players = await base44.asServiceRole.entities.Player.filter({ id: payment.jugador_id });
                const player = players?.[0];
                const recipients = [];
                if (player?.email_padre) recipients.push(player.email_padre);
                if (player?.email_tutor_2 && !recipients.includes(player.email_tutor_2)) recipients.push(player.email_tutor_2);
                for (const to of recipients) {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to,
                    subject: `✅ Pago confirmado - ${payment.jugador_nombre}`,
                    body: `Hemos recibido tu pago de ${payment.cantidad}€ (${payment.mes}).\nEstado: Pagado.\nGracias por tu colaboración.\n\nCD Bustarviejo`
                  });
                }
              }
            } catch (emailErr) {
              console.error('[stripe-webhook] Error enviando email Payment:', emailErr?.message || emailErr);
            }
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
                paid_at: new Date().toISOString(),
              });

              // Marcar todos los payments del lote como Pagado y notificar
              const items = Array.isArray(batch.items) ? batch.items : [];
              for (const it of items) {
                if (!it?.payment_id) continue;
                try {
                  const updated = await base44.asServiceRole.entities.Payment.update(it.payment_id, {
                    estado: 'Pagado',
                    fecha_pago: today,
                  });
                  try {
                    const payments = await base44.asServiceRole.entities.Payment.filter({ id: it.payment_id });
                    const payment = payments?.[0];
                    if (payment?.jugador_id) {
                      const players = await base44.asServiceRole.entities.Player.filter({ id: payment.jugador_id });
                      const player = players?.[0];
                      const recipients = [];
                      if (player?.email_padre) recipients.push(player.email_padre);
                      if (player?.email_tutor_2 && !recipients.includes(player.email_tutor_2)) recipients.push(player.email_tutor_2);
                      for (const to of recipients) {
                        await base44.asServiceRole.integrations.Core.SendEmail({
                          to,
                          subject: `✅ Pago confirmado - ${payment.jugador_nombre}`,
                          body: `Hemos recibido tu pago de ${payment.cantidad}€ (${payment.mes}).\nEstado: Pagado.\nGracias por tu colaboración.\n\nCD Bustarviejo`
                        });
                      }
                    }
                  } catch (emailErr) {
                    console.error('[stripe-webhook] Error email batch payment:', emailErr?.message || emailErr);
                  }
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

        // NUEVO: Lotería de Navidad
        if (metadata.tipo === 'loteria' && metadata.order_id) {
          try {
            await base44.asServiceRole.entities.LotteryOrder.update(metadata.order_id, {
              pagado: true,
              metodo_pago: 'Tarjeta'
            });
            console.log('[stripe-webhook] Lotería marcada como pagada', { order_id: metadata.order_id });

            // Notificar por email
            try {
              const orders = await base44.asServiceRole.entities.LotteryOrder.filter({ id: metadata.order_id });
              const order = orders?.[0];
              const recipients = [];
              if (order?.email_padre) recipients.push(order.email_padre);
              if (order?.jugador_id) {
                const players = await base44.asServiceRole.entities.Player.filter({ id: order.jugador_id });
                const player = players?.[0];
                if (player?.email_tutor_2 && !recipients.includes(player.email_tutor_2)) recipients.push(player.email_tutor_2);
              }
              for (const to of recipients) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to,
                  subject: '✅ Pago de Lotería confirmado',
                  body: `Hemos recibido tu pago de Lotería. Pedido: ${order?.numero_decimos || ''} décimos.\nEstado: Pagado.\n¡Gracias y mucha suerte!\n\nCD Bustarviejo`
                });
              }
            } catch (emailErr) {
              console.error('[stripe-webhook] Error enviando email Lotería:', emailErr?.message || emailErr);
            }
          } catch (e) {
            console.error('[stripe-webhook] Error actualizando LotteryOrder:', e?.message || e);
          }
        }

        // NUEVO: Cuota de socio (pago desde la app o Payment Link con metadata)
        if (metadata.tipo === 'cuota_socio') {
          const temporada = metadata.temporada || '';
          const membershipId = metadata.membership_id;
          const email = session.customer_details?.email || session.customer_email || metadata.user_email;

          let member = null;

          if (membershipId) {
            try {
              await base44.asServiceRole.entities.ClubMember.update(membershipId, {
                estado_pago: 'Pagado',
                activo: true,
              });
              const members = await base44.asServiceRole.entities.ClubMember.filter({ id: membershipId });
              member = members?.[0] || null;
              console.log('[stripe-webhook] ClubMember marcado Pagado', { membership_id: membershipId });
            } catch (e) {
              console.error('[stripe-webhook] Error actualizando ClubMember:', e?.message || e);
            }
          } else if (email) {
            try {
              const candidates = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
              const candidate = candidates?.[0];
              if (candidate) {
                await base44.asServiceRole.entities.ClubMember.update(candidate.id, {
                  estado_pago: 'Pagado',
                  activo: true,
                });
                member = candidate;
                console.log('[stripe-webhook] ClubMember detectado por email+temporada, marcado Pagado', { id: candidate.id });
              } else {
                console.warn('[stripe-webhook] No se encontró ClubMember para email/temporada, revise Payment Link metadata');
              }
            } catch (e) {
              console.error('[stripe-webhook] Error marcando ClubMember por email:', e?.message || e);
            }
          }

          // Emails de confirmación (socio y admin)
          try {
            const to = member?.email || email;
            if (to) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to,
                subject: '✅ Cuota de socio confirmada',
                body: `Hemos recibido tu cuota de socio para la temporada ${temporada}.\nEstado: Pagado.\nGracias por apoyar al club.\n\nCD Bustarviejo`
              });
            }
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: 'cdbustarviejo@gmail.com',
              subject: '✅ Nuevo socio pagado (Stripe)',
              body: `Socio pagado: ${member?.nombre_completo || ''} - ${to || ''} - Temporada: ${temporada}`
            });
          } catch (emailErr) {
            console.error('[stripe-webhook] Error enviando email Socio:', emailErr?.message || emailErr);
          }
        }
        }
        }
        } catch (e) {
    // No devolvemos 500 para evitar reintentos infinitos; solo registramos.
    console.error('[stripe-webhook] Error general manejando evento:', e?.message || e);
  }

  // Siempre 200 tras validar firma
  return Response.json({ received: true });
});