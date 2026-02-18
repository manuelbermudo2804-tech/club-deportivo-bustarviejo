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

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data?.object || {};
      const metadata = session.metadata || {};
      const status = session.payment_status || session.status;
      console.log('[stripe-webhook] checkout.session.completed', { session_id: session.id, status, metadata });

      if (session?.payment_status === 'paid') {
        // Fallback log: si el tipo no es uno de los conocidos, registramos igualmente
        try {
          const tipo = metadata?.tipo;
          if (!['pago_cuota','pago_cuota_batch','loteria','cuota_socio'].includes(tipo)) {
            await base44.asServiceRole.entities.StripePaymentLog.create({
              section: 'extra',
              amount: Number(session.amount_total || 0) / 100,
              currency: session.currency || 'eur',
              status: 'succeeded',
              session_id: session.id,
              payment_intent_id: session.payment_intent || null,
              email: session.customer_details?.email || session.customer_email || metadata.user_email,
              related_entity: 'Unknown',
              related_id: null,
              metadata,
              created_at: new Date().toISOString()
            });
          }
        } catch (logErr) {
          console.error('[stripe-webhook] Error guardando log Stripe (fallback):', logErr?.message || logErr);
        }
        const today = new Date().toISOString().slice(0,10);

        // Caso 1: pago individual de cuota
        if (metadata.tipo === 'pago_cuota' && metadata.payment_id) {
          try {
            // Log Stripe (cuotas) - antes de actualizar BD
            try {
              await base44.asServiceRole.entities.StripePaymentLog.create({
                section: 'cuotas',
                amount: Number(session.amount_total || 0) / 100,
                currency: session.currency || 'eur',
                status: 'succeeded',
                session_id: session.id,
                payment_intent_id: session.payment_intent || null,
                email: session.customer_details?.email || session.customer_email || metadata.user_email,
                related_entity: 'Payment',
                related_id: metadata.payment_id,
                metadata,
                created_at: new Date().toISOString()
              });
            } catch (logErr) {
              console.error('[stripe-webhook] Error guardando log Stripe (cuotas-pre):', logErr?.message || logErr);
            }
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
              // Log Stripe (batch) - antes de actualizar BD
              try {
                await base44.asServiceRole.entities.StripePaymentLog.create({
                  section: 'cuotas_batch',
                  amount: Number(session.amount_total || 0) / 100,
                  currency: session.currency || 'eur',
                  status: 'succeeded',
                  session_id: session.id,
                  payment_intent_id: session.payment_intent || null,
                  email: session.customer_details?.email || session.customer_email || metadata.user_email,
                  related_entity: 'BatchPayment',
                  related_id: batch.id,
                  metadata,
                  created_at: new Date().toISOString()
                });
              } catch (logErr) {
                console.error('[stripe-webhook] Error guardando log Stripe (batch-pre):', logErr?.message || logErr);
              }

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

        // Plan Mensual: pago inicial completado → crear suscripción programada
        if (metadata.tipo === 'plan_mensual_inscripcion') {
          try {
            await base44.asServiceRole.entities.StripePaymentLog.create({
              section: 'plan_mensual',
              amount: Number(session.amount_total || 0) / 100,
              currency: session.currency || 'eur',
              status: 'succeeded',
              session_id: session.id,
              payment_intent_id: session.payment_intent || null,
              email: session.customer_details?.email || session.customer_email || metadata.user_email,
              related_entity: 'Payment',
              related_id: metadata.jugador_id,
              metadata,
              created_at: new Date().toISOString()
            });

            // Crear la suscripción con la tarjeta guardada
            let subscriptionId = null;
            try {
              const customerId = session.customer;
              const recurringPriceId = metadata.recurring_price_id;
              const cancelAtTs = Number(metadata.cancel_at || 0);

              if (customerId && recurringPriceId) {
                // Obtener la tarjeta guardada del customer
                const paymentMethods = await stripe.paymentMethods.list({
                  customer: customerId,
                  type: 'card',
                  limit: 1
                });
                const defaultPm = paymentMethods.data?.[0]?.id;

                if (defaultPm) {
                  // Establecer como método de pago por defecto
                  await stripe.customers.update(customerId, {
                    invoice_settings: { default_payment_method: defaultPm }
                  });

                  // Calcular billing_cycle_anchor (1 de septiembre)
                  const now = new Date();
                  let septYear = now.getFullYear();
                  const sept1 = new Date(septYear, 8, 1); // mes 8 = sept
                  if (sept1 <= now) {
                    // Sept ya pasó este año → siguiente mes
                    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    var anchorTs = Math.floor(nextMonth.getTime() / 1000);
                  } else {
                    var anchorTs = Math.floor(sept1.getTime() / 1000);
                  }

                  // Crear suscripción con trial_end (para retrasar primer cobro hasta septiembre)
                  const subParams = {
                    customer: customerId,
                    items: [{ price: recurringPriceId }],
                    default_payment_method: defaultPm,
                    trial_end: anchorTs,
                    metadata: {
                      tipo: 'plan_mensual_cuota',
                      jugador_id: metadata.jugador_id,
                      jugador_nombre: metadata.jugador_nombre,
                      categoria: metadata.categoria,
                      temporada: metadata.temporada,
                      mensualidad: metadata.mensualidad,
                      num_meses: metadata.num_meses,
                      user_email: metadata.user_email
                    }
                  };
                  if (cancelAtTs > 0) subParams.cancel_at = cancelAtTs;

                  const subscription = await stripe.subscriptions.create(subParams);
                  subscriptionId = subscription.id;
                  console.log('[stripe-webhook] Plan Mensual: suscripción creada', subscriptionId, 'primer cobro:', new Date(anchorTs * 1000).toISOString());
                } else {
                  console.warn('[stripe-webhook] Plan Mensual: no se encontró tarjeta guardada para customer', customerId);
                }
              }
            } catch (subErr) {
              console.error('[stripe-webhook] Error creando suscripción:', subErr?.message || subErr);
            }

            // Buscar y marcar como Pagado el pago inicial del jugador
            const jugadorPayments = await base44.asServiceRole.entities.Payment.filter({
              jugador_id: metadata.jugador_id,
              tipo_pago: 'Plan Mensual',
              mes: 'Junio',
              estado: 'Pendiente'
            });
            const initialPayment = jugadorPayments?.[0];
            if (initialPayment) {
              await base44.asServiceRole.entities.Payment.update(initialPayment.id, {
                estado: 'Pagado',
                fecha_pago: today,
                stripe_subscription_id: subscriptionId || null,
                stripe_subscription_status: subscriptionId ? 'active' : null,
                plan_mensual_mensualidad: Number(metadata.mensualidad || 0),
                plan_mensual_meses: Number(metadata.num_meses || 0),
                plan_mensual_mes_fin: metadata.mes_fin || 'Mayo'
              });
              console.log('[stripe-webhook] Plan Mensual: pago inicial marcado Pagado, subscription:', subscriptionId);
            }

            // Notificar al padre
            try {
              const email = session.customer_details?.email || session.customer_email || metadata.user_email;
              if (email) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: email,
                  subject: `✅ Plan Mensual activado - ${metadata.jugador_nombre}`,
                  body: `Hemos recibido tu pago inicial de ${metadata.pago_inicial}€ para ${metadata.jugador_nombre}.\n\nA partir de septiembre se cobrará automáticamente ${metadata.mensualidad}€/mes en tu tarjeta hasta ${metadata.mes_fin || 'Mayo'}.\n\nGracias por tu confianza.\n\nCD Bustarviejo`
                });
              }
            } catch (emailErr) {
              console.error('[stripe-webhook] Error email Plan Mensual:', emailErr?.message);
            }
          } catch (e) {
            console.error('[stripe-webhook] Error procesando Plan Mensual:', e?.message || e);
          }
        }

        // Otros tipos (ej: extra_charge) se añadirán después si hace falta

        // NUEVO: Lotería de Navidad
        if (metadata.tipo === 'loteria') {
          try {
            // Log Stripe (lotería)
            try {
              await base44.asServiceRole.entities.StripePaymentLog.create({
                section: 'loteria',
                amount: Number(session.amount_total || 0) / 100,
                currency: session.currency || 'eur',
                status: 'succeeded',
                session_id: session.id,
                payment_intent_id: session.payment_intent || null,
                email: session.customer_details?.email || session.customer_email || metadata.user_email,
                related_entity: 'LotteryOrder',
                related_id: metadata.order_id || null,
                metadata,
                created_at: new Date().toISOString()
              });
            } catch (logErr) {
              console.error('[stripe-webhook] Error guardando log Stripe (lotería-pre):', logErr?.message || logErr);
            }

            let orderId = metadata.order_id || null;

            if (orderId) {
              await base44.asServiceRole.entities.LotteryOrder.update(orderId, {
                pagado: true,
                metodo_pago: 'Tarjeta'
              });
              console.log('[stripe-webhook] Lotería marcada como pagada', { order_id: orderId });
            } else {
              // Crear pedido tras pago exitoso (sin pedido provisional)
              const newOrder = await base44.asServiceRole.entities.LotteryOrder.create({
                jugador_id: metadata.jugador_id || null,
                jugador_nombre: metadata.jugador_nombre || '',
                jugador_categoria: metadata.jugador_categoria || '',
                email_padre: session.customer_details?.email || session.customer_email || metadata.user_email || '',
                telefono: metadata.telefono || '',
                numero_decimos: Number(metadata.numero_decimos || 0),
                precio_por_decimo: Number(metadata.precio_por_decimo || 0),
                total: Number(metadata.total || 0),
                estado: 'Solicitado',
                pagado: true,
                metodo_pago: 'Tarjeta',
                justificante_url: '',
                temporada: metadata.temporada || '',
                notas: metadata.notas || ''
              });
              orderId = newOrder.id;
              console.log('[stripe-webhook] Lotería creada tras pago', { order_id: orderId });
            }

            // Notificar por email
            try {
              const orders = await base44.asServiceRole.entities.LotteryOrder.filter({ id: orderId });
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
            console.error('[stripe-webhook] Error procesando Lotería:', e?.message || e);
          }
        }

        // NUEVO: Cuota de socio (pago desde la app o Payment Link con metadata)
        if (metadata.tipo === 'cuota_socio') {
          const temporada = metadata.temporada || '';
          // Log Stripe (socios) - antes de actualizar BD
          try {
            await base44.asServiceRole.entities.StripePaymentLog.create({
              section: 'socios',
              amount: Number(session.amount_total || 0) / 100,
              currency: session.currency || 'eur',
              status: 'succeeded',
              session_id: session.id,
              payment_intent_id: session.payment_intent || null,
              email: session.customer_details?.email || session.customer_email || metadata.user_email,
              related_entity: 'ClubMember',
              related_id: metadata.membership_id || null,
              metadata,
              created_at: new Date().toISOString()
            });
          } catch (logErr) {
            console.error('[stripe-webhook] Error guardando log Stripe (socios-pre):', logErr?.message || logErr);
          }
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
    }

    // ========== INVOICE.PAYMENT_SUCCEEDED ==========
    // Cobros mensuales automáticos de suscripciones (Plan Mensual)
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data?.object || {};
      const subId = invoice.subscription;
      const billingReason = invoice.billing_reason; // 'subscription_cycle' para cobros recurrentes

      // Solo procesar cobros recurrentes (no el primer cobro de setup)
      if (subId && billingReason === 'subscription_cycle') {
        console.log('[stripe-webhook] invoice.payment_succeeded (recurrente)', { invoice_id: invoice.id, subscription: subId, amount: invoice.amount_paid });

        try {
          // Obtener metadata de la suscripción
          const subscription = await stripe.subscriptions.retrieve(subId);
          const subMeta = subscription.metadata || {};

          if (subMeta.tipo === 'plan_mensual_cuota') {
            const amount = (invoice.amount_paid || 0) / 100;
            const today = new Date().toISOString().slice(0, 10);
            const now = new Date();
            const MESES_NOMBRE = { 1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre' };
            const mesNombre = MESES_NOMBRE[now.getMonth() + 1] || 'Septiembre';

            // Registrar log
            try {
              await base44.asServiceRole.entities.StripePaymentLog.create({
                section: 'plan_mensual_recurrente',
                amount,
                currency: invoice.currency || 'eur',
                status: 'succeeded',
                session_id: invoice.id,
                payment_intent_id: invoice.payment_intent || null,
                email: subMeta.user_email || invoice.customer_email,
                related_entity: 'Payment',
                related_id: subMeta.jugador_id,
                metadata: { ...subMeta, billing_reason: billingReason, mes: mesNombre },
                created_at: new Date().toISOString()
              });
            } catch (logErr) {
              console.error('[stripe-webhook] Error log recurrente:', logErr?.message);
            }

            // Crear registro de Payment para esta mensualidad
            try {
              await base44.asServiceRole.entities.Payment.create({
                jugador_id: subMeta.jugador_id,
                jugador_nombre: subMeta.jugador_nombre || '',
                tipo_pago: 'Plan Mensual',
                mes: mesNombre,
                temporada: subMeta.temporada || '',
                cantidad: amount,
                estado: 'Pagado',
                metodo_pago: 'Transferencia',
                fecha_pago: today,
                stripe_subscription_id: subId,
                stripe_subscription_status: 'active',
                plan_mensual_mensualidad: Number(subMeta.mensualidad || 0),
                plan_mensual_meses: Number(subMeta.num_meses || 0),
                notas: `Cobro automático Plan Mensual - ${mesNombre}`
              });
              console.log('[stripe-webhook] Payment creado para cobro mensual', { jugador: subMeta.jugador_nombre, mes: mesNombre, amount });
            } catch (payErr) {
              console.error('[stripe-webhook] Error creando Payment mensual:', payErr?.message);
            }

            // Notificar al padre
            try {
              const email = subMeta.user_email || invoice.customer_email;
              if (email) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: email,
                  subject: `✅ Cobro mensual recibido - ${subMeta.jugador_nombre}`,
                  body: `Hemos cobrado ${amount}€ de la mensualidad de ${mesNombre} para ${subMeta.jugador_nombre}.\n\nEste cobro es parte del Plan Mensual contratado.\n\nGracias por tu confianza.\n\nCD Bustarviejo`
                });
              }
            } catch (emailErr) {
              console.error('[stripe-webhook] Error email cobro mensual:', emailErr?.message);
            }
          }
        } catch (e) {
          console.error('[stripe-webhook] Error procesando invoice recurrente:', e?.message || e);
        }
      }
    }

    // ========== INVOICE.PAYMENT_FAILED ==========
    // Fallo en cobro automático
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data?.object || {};
      const subId = invoice.subscription;

      if (subId) {
        console.log('[stripe-webhook] invoice.payment_failed', { invoice_id: invoice.id, subscription: subId });

        try {
          const subscription = await stripe.subscriptions.retrieve(subId);
          const subMeta = subscription.metadata || {};

          if (subMeta.tipo === 'plan_mensual_cuota') {
            // Registrar log de fallo
            try {
              await base44.asServiceRole.entities.StripePaymentLog.create({
                section: 'plan_mensual_fallo',
                amount: (invoice.amount_due || 0) / 100,
                currency: invoice.currency || 'eur',
                status: 'failed',
                session_id: invoice.id,
                payment_intent_id: invoice.payment_intent || null,
                email: subMeta.user_email || invoice.customer_email,
                related_entity: 'Payment',
                related_id: subMeta.jugador_id,
                metadata: subMeta,
                created_at: new Date().toISOString()
              });
            } catch (logErr) {
              console.error('[stripe-webhook] Error log fallo:', logErr?.message);
            }

            // Actualizar estado de suscripción en el Payment inicial
            try {
              const initialPayments = await base44.asServiceRole.entities.Payment.filter({
                jugador_id: subMeta.jugador_id,
                tipo_pago: 'Plan Mensual',
                stripe_subscription_id: subId
              });
              if (initialPayments?.[0]) {
                await base44.asServiceRole.entities.Payment.update(initialPayments[0].id, {
                  stripe_subscription_status: 'past_due'
                });
              }
            } catch (upErr) {
              console.error('[stripe-webhook] Error actualizando status suscripción:', upErr?.message);
            }

            // Notificar al padre y al admin
            try {
              const amount = (invoice.amount_due || 0) / 100;
              const email = subMeta.user_email || invoice.customer_email;
              if (email) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: email,
                  subject: `⚠️ Fallo en cobro mensual - ${subMeta.jugador_nombre}`,
                  body: `No hemos podido cobrar ${amount}€ de la mensualidad de ${subMeta.jugador_nombre}.\n\nPor favor, verifica que tu tarjeta tiene fondos suficientes. Stripe reintentará el cobro automáticamente.\n\nSi el problema persiste, contacta con el club.\n\nCD Bustarviejo`
                });
              }
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: 'cdbustarviejo@gmail.com',
                subject: `⚠️ Fallo cobro Plan Mensual - ${subMeta.jugador_nombre}`,
                body: `Fallo al cobrar ${amount}€ de ${subMeta.jugador_nombre} (${email}).\nSuscripción: ${subId}\nStripe reintentará automáticamente.`
              });
            } catch (emailErr) {
              console.error('[stripe-webhook] Error email fallo cobro:', emailErr?.message);
            }
          }
        } catch (e) {
          console.error('[stripe-webhook] Error procesando invoice fallida:', e?.message || e);
        }
      }
    }

    // ========== PAYMENT_INTENT.PAYMENT_FAILED ==========
    // Fallo en pago directo (checkout de cuotas, Plan Mensual inicial, lotería, socios, etc.)
    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data?.object || {};
      const metadata = pi.metadata || {};
      const amount = (pi.amount || 0) / 100;
      const failMessage = pi.last_payment_error?.message || 'Error desconocido';
      const email = pi.receipt_email || metadata.user_email || '';

      console.log('[stripe-webhook] payment_intent.payment_failed', { pi_id: pi.id, amount, tipo: metadata.tipo, email, error: failMessage });

      // Registrar log de fallo
      try {
        await base44.asServiceRole.entities.StripePaymentLog.create({
          section: 'payment_intent_failed',
          amount,
          currency: pi.currency || 'eur',
          status: 'failed',
          session_id: null,
          payment_intent_id: pi.id,
          email,
          related_entity: metadata.tipo || 'Unknown',
          related_id: metadata.payment_id || metadata.jugador_id || metadata.order_id || metadata.membership_id || null,
          metadata: { ...metadata, error: failMessage },
          created_at: new Date().toISOString()
        });
      } catch (logErr) {
        console.error('[stripe-webhook] Error log payment_intent failed:', logErr?.message);
      }

      // Notificar al usuario y al admin
      try {
        const jugadorNombre = metadata.jugador_nombre || metadata.jugador_id || '';
        const tipoDesc = metadata.tipo === 'pago_cuota' ? 'cuota' 
          : metadata.tipo === 'plan_mensual_inscripcion' ? 'pago inicial Plan Mensual'
          : metadata.tipo === 'loteria' ? 'lotería'
          : metadata.tipo === 'cuota_socio' ? 'cuota de socio'
          : metadata.tipo === 'pago_cuota_batch' ? 'pago por lote'
          : metadata.tipo === 'extra_charge' ? 'cobro extra'
          : 'pago';

        if (email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `⚠️ Fallo en ${tipoDesc}${jugadorNombre ? ` - ${jugadorNombre}` : ''}`,
            body: `No hemos podido procesar tu ${tipoDesc} de ${amount}€${jugadorNombre ? ` para ${jugadorNombre}` : ''}.\n\nMotivo: ${failMessage}\n\nPor favor, inténtalo de nuevo o usa otro método de pago.\n\nCD Bustarviejo`
          });
        }

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'cdbustarviejo@gmail.com',
          subject: `⚠️ Fallo en pago (${tipoDesc}) - ${email || 'desconocido'}`,
          body: `Fallo al cobrar ${amount}€.\nTipo: ${tipoDesc}\nJugador: ${jugadorNombre}\nEmail: ${email}\nMotivo: ${failMessage}\nPaymentIntent: ${pi.id}`
        });
      } catch (emailErr) {
        console.error('[stripe-webhook] Error email payment_intent failed:', emailErr?.message);
      }
    }

  } catch (e) {
    // No devolvemos 500 para evitar reintentos infinitos; solo registramos.
    console.error('[stripe-webhook] Error general manejando evento:', e?.message || e);
  }

  // Siempre 200 tras validar firma
  return Response.json({ received: true });
});