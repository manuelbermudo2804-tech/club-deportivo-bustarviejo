import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ============ PLANTILLAS DE EMAIL PREMIUM ============
const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';

function baseLayout(headerBg, headerTitle, headerEmoji, contentHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:${headerBg};padding:30px 24px;text-align:center">
<img src="${LOGO_URL}" alt="CD Bustarviejo" width="70" height="70" style="border-radius:14px;border:3px solid rgba(255,255,255,0.4);display:block;margin:0 auto 12px"/>
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">${headerEmoji} ${headerTitle}</h1>
<p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px">CD Bustarviejo</p>
</div>
<div style="padding:28px 24px">${contentHtml}</div>
<div style="background:#333333;padding:20px 24px;text-align:center">
<p style="margin:4px 0;font-size:12px;color:#cccccc">📧 <a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none">cdbustarviejo@gmail.com</a> · <a href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES" style="color:#fb923c;text-decoration:none">C.D.BUSTARVIEJO@HOTMAIL.ES</a></p>
<p style="margin:10px 0 4px;font-size:12px;color:#cccccc">© ${new Date().getFullYear()} CD Bustarviejo · Todos los derechos reservados</p>
</div>
</div></body></html>`;
}

function carnetBlock(nombre, numeroSocio, temporada, dni, badgeText, badgeClass) {
  const badgeBg = badgeClass === 'badge-red' ? '#dc2626' : badgeClass === 'badge-amber' ? '#d97706' : '#16a34a';
  const row = (label, value, bg) => `<tr><td style="background:${bg};padding:10px 16px;border-bottom:1px solid #e0e0e0;font-size:11px;color:#888888;font-weight:600;text-transform:uppercase;width:120px">${label}</td><td style="background:${bg};padding:10px 16px;border-bottom:1px solid #e0e0e0;font-size:15px;color:#1a1a1a;font-weight:700">${value}</td></tr>`;
  let rows = row('NOMBRE', nombre || '—', '#f8f8f8');
  if (numeroSocio) rows += row('Nº SOCIO', numeroSocio, '#ffffff');
  rows += row('TEMPORADA', temporada || '—', numeroSocio ? '#f8f8f8' : '#ffffff');
  if (dni) rows += row('DNI', dni, numeroSocio ? '#ffffff' : '#f8f8f8');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border:2px solid #ea580c;border-collapse:separate;overflow:hidden"><tr><td colspan="2" style="background:#ea580c;padding:12px 16px;color:#ffffff;font-size:16px;font-weight:700;text-align:center">CARNET DE SOCIO — CD BUSTARVIEJO</td></tr>${rows}<tr><td colspan="2" style="background:${badgeBg};padding:10px 16px;color:#ffffff;font-size:13px;font-weight:700;text-align:center">${badgeText || '✅ SOCIO VERIFICADO'}</td></tr></table>`;
}

function emailBienvenida({ nombre, numeroSocio, temporada, dni }) {
  return baseLayout('#ea580c', '¡BIENVENIDO AL CLUB!', '🎉',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre||'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">¡Gracias por tu apoyo al CD Bustarviejo! Hemos confirmado tu pago y nos complace darte la bienvenida como <strong style="color:#ea580c">socio oficial</strong> para la temporada <strong>${temporada||''}</strong>.</p>
${carnetBlock(nombre, numeroSocio, temporada, dni, '✅ SOCIO VERIFICADO', 'badge-green')}
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#f0fdf4;border-left:4px solid #22c55e"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>💚 ¡Gracias por formar parte de nuestra familia!</strong></p><p style="margin:4px 0;font-size:13px;color:#333333">Tu contribución es fundamental para el desarrollo de más de 200 jóvenes deportistas de Bustarviejo.</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#eff6ff;border-left:4px solid #3b82f6"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>📲 Guarda este email</strong> como comprobante de tu membresía.</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong><br/><span style="font-size:12px;color:#64748b">Tu club de siempre 💚</span></p>`);
}

function emailRenovacion({ nombre, numeroSocio, temporada, amount, fechaVencimiento }) {
  const fv = fechaVencimiento || (temporada?.includes('-') ? `30 de junio de ${temporada.split('-')[1]}` : '');
  return baseLayout('#16a34a', 'Cuota renovada con éxito', '✅',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre||'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">Tu suscripción anual se ha renovado correctamente. Hemos cobrado <strong>${amount||25}€</strong> de tu cuota de socio.</p>
${carnetBlock(nombre, numeroSocio, temporada, null, '🔄 RENOVADO', 'badge-green')}
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#f0fdf4;border-left:4px solid #22c55e"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>✅ Tu membresía está activa</strong> hasta el <strong>${fv}</strong>.</p><p style="margin:4px 0;font-size:13px;color:#333333">No necesitas hacer nada más. La renovación se hizo automáticamente.</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">¡Gracias por seguir apoyando al club! 💪</p>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`);
}

function emailFalloCobro({ nombre, amount, reason }) {
  return baseLayout('#dc2626', 'Problema con tu cuota de socio', '⚠️',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre||'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">No hemos podido cobrar <strong>${amount||25}€</strong> de tu cuota de socio del CD Bustarviejo.</p>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fef2f2;border-left:4px solid #dc2626"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>⚠️ Motivo:</strong> ${reason||'La tarjeta fue rechazada o no tiene fondos suficientes.'}</p><p style="margin:4px 0;font-size:13px;color:#333333">Stripe reintentará el cobro automáticamente en los próximos días.</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fff7ed;border-left:4px solid #ea580c"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>¿Qué puedes hacer?</strong></p><p style="margin:4px 0;font-size:13px;color:#333333">1. Verifica que tu tarjeta tiene fondos suficientes</p><p style="margin:4px 0;font-size:13px;color:#333333">2. Si el problema persiste, contacta con el club</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`);
}

function emailSuscripcionCancelada({ nombre, fechaVencimiento }) {
  return baseLayout('#d97706', 'Suscripción cancelada', '🔔',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre||'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">Tu suscripción anual de socio del CD Bustarviejo ha sido <strong>cancelada</strong>.</p>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fff7ed;border-left:4px solid #ea580c"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>📅 Tu membresía seguirá activa</strong> hasta el <strong>${fechaVencimiento||'30 de junio'}</strong>.</p><p style="margin:4px 0;font-size:13px;color:#333333">Después de esa fecha, no se realizarán más cobros automáticos.</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#eff6ff;border-left:4px solid #3b82f6"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>¿Quieres volver?</strong> Si en el futuro deseas renovar tu membresía, podrás hacerlo desde nuestra web o app.</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Gracias por el tiempo que nos has acompañado. ¡Siempre serás bienvenido/a! 💚</p>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`);
}

function emailFalloPagoDirecto({ nombre, amount, tipoDesc, reason }) {
  return baseLayout('#dc2626', 'Fallo en el pago', '⚠️',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre||'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">No hemos podido procesar tu <strong>${tipoDesc||'pago'}</strong> de <strong>${amount||0}€</strong>.</p>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fef2f2;border-left:4px solid #dc2626"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>⚠️ Motivo:</strong> ${reason||'Error desconocido'}</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fff7ed;border-left:4px solid #ea580c"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>¿Qué puedes hacer?</strong></p><p style="margin:4px 0;font-size:13px;color:#333333">1. Inténtalo de nuevo desde la app o la web</p><p style="margin:4px 0;font-size:13px;color:#333333">2. Usa otro método de pago</p><p style="margin:4px 0;font-size:13px;color:#333333">3. Si el problema persiste, contacta con el club</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`);
}

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

                  // Primer cobro recurrente: siempre 1 de septiembre
                  const now = new Date();
                  const septYear = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
                  const sept1 = new Date(septYear, 8, 1); // 1 de septiembre
                  const anchorTs = Math.floor(sept1.getTime() / 1000);

                  // Crear suscripción con trial_end (retrasa primer cobro hasta septiembre)
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
                  console.log('[stripe-webhook] Plan Mensual: suscripción creada', subscriptionId, 'primer cobro recurrente:', new Date(anchorTs * 1000).toISOString());
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

        // Caso: Cobro Extra (extra_charge)
        if (metadata.tipo === 'extra_charge' && metadata.extra_charge_id) {
          try {
            // Log Stripe
            try {
              await base44.asServiceRole.entities.StripePaymentLog.create({
                section: 'extra_charge',
                amount: Number(session.amount_total || 0) / 100,
                currency: session.currency || 'eur',
                status: 'succeeded',
                session_id: session.id,
                payment_intent_id: session.payment_intent || null,
                email: session.customer_details?.email || session.customer_email || metadata.user_email,
                related_entity: 'ExtraChargePayment',
                related_id: metadata.extra_charge_id,
                metadata,
                created_at: new Date().toISOString()
              });
            } catch (logErr) {
              console.error('[stripe-webhook] Error guardando log Stripe (extra_charge):', logErr?.message || logErr);
            }

            const payerEmail = session.customer_details?.email || session.customer_email || metadata.user_email;

            // Crear registro ExtraChargePayment
            const ecPayment = await base44.asServiceRole.entities.ExtraChargePayment.create({
              extra_charge_id: metadata.extra_charge_id,
              usuario_email: payerEmail,
              seleccion: (() => { try { return JSON.parse(metadata.seleccion || '[]'); } catch { return []; } })(),
              total: Number(session.amount_total || 0) / 100,
              metodo: 'Tarjeta',
              estado: 'Pagado',
              concepto: metadata.titulo || 'Cobro extra'
            });
            console.log('[stripe-webhook] ExtraChargePayment creado', { id: ecPayment.id, charge: metadata.extra_charge_id });

            // Notificar al pagador
            try {
              if (payerEmail) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: payerEmail,
                  subject: `✅ Pago confirmado - ${metadata.titulo || 'Cobro extra'}`,
                  body: `Hemos recibido tu pago de ${(Number(session.amount_total || 0) / 100).toFixed(2)}€ para "${metadata.titulo || 'Cobro extra'}".\nEstado: Pagado.\nGracias.\n\nCD Bustarviejo`
                });
              }
            } catch (emailErr) {
              console.error('[stripe-webhook] Error email extra_charge:', emailErr?.message || emailErr);
            }

            // Notificar al admin
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: 'cdbustarviejo@outlook.es',
                subject: `✅ Cobro extra pagado (Stripe) - ${payerEmail}`,
                body: `Cobro extra "${metadata.titulo || ''}" pagado por ${payerEmail}.\nImporte: ${(Number(session.amount_total || 0) / 100).toFixed(2)}€`
              });
            } catch (emailErr) {
              console.error('[stripe-webhook] Error email admin extra_charge:', emailErr?.message || emailErr);
            }
          } catch (e) {
            console.error('[stripe-webhook] Error procesando extra_charge:', e?.message || e);
          }
        }

        // ============ PAYMENT LINK SIN METADATA ============
        // Socios que pagan desde Payment Links directos de Stripe (sin metadata.tipo)
        // El pre-registro se hizo via publicMemberRegister con el email
        if (!metadata.tipo || metadata.tipo === '') {
          const payerEmail = session.customer_details?.email || session.customer_email || '';
          const amountPaid = Number(session.amount_total || 0) / 100;

          // Solo procesar si parece una cuota de socio (25€)
          if (payerEmail && amountPaid >= 24 && amountPaid <= 26) {
            console.log('[stripe-webhook] Payment Link detectado (sin metadata), buscando socio por email:', payerEmail);

            try {
              // Determinar temporada desde SeasonConfig (igual que publicMemberRegister)
              let tempActual;
              try {
                const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.list();
                const activeConfig = seasonConfigs.find(c => c.activa === true);
                tempActual = activeConfig?.temporada;
              } catch (e) {
                console.error('[stripe-webhook] Error obteniendo SeasonConfig:', e.message);
              }
              if (!tempActual) {
                const now = new Date();
                const yr = now.getFullYear();
                const mo = now.getMonth() + 1;
                tempActual = mo >= 7 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
              }
              console.log('[stripe-webhook] Payment Link: temporada activa =', tempActual);

              const candidates = await base44.asServiceRole.entities.ClubMember.filter({ email: payerEmail, temporada: tempActual });
              const pendingMember = candidates?.find(m => m.estado_pago !== 'Pagado');

              if (pendingMember) {
                // Calcular fecha_vencimiento
                let plFechaVenc = null;
                try {
                  if (tempActual && tempActual.includes('-')) {
                    plFechaVenc = `${tempActual.split('-')[1]}-06-30`;
                  }
                } catch {}

                await base44.asServiceRole.entities.ClubMember.update(pendingMember.id, {
                  estado_pago: 'Pagado',
                  metodo_pago: 'Tarjeta',
                  activo: true,
                  origen_pago: 'stripe_unico',
                  renovacion_automatica: false,
                  fecha_alta: today,
                  fecha_pago: today,
                  fecha_vencimiento: plFechaVenc,
                  fecha_ultimo_cobro: new Date().toISOString(),
                });
                console.log('[stripe-webhook] Socio marcado Pagado via Payment Link:', pendingMember.id, payerEmail);

                // Log Stripe
                try {
                  await base44.asServiceRole.entities.StripePaymentLog.create({
                    section: 'socios_payment_link',
                    amount: amountPaid,
                    currency: session.currency || 'eur',
                    status: 'succeeded',
                    session_id: session.id,
                    payment_intent_id: session.payment_intent || null,
                    email: payerEmail,
                    related_entity: 'ClubMember',
                    related_id: pendingMember.id,
                    metadata: { source: 'payment_link', email: payerEmail },
                    created_at: new Date().toISOString()
                  });
                } catch (logErr) {
                  console.error('[stripe-webhook] Error log Payment Link:', logErr?.message);
                }

                // Emails
                try {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to: payerEmail,
                    subject: '🎉 ¡Bienvenido/a al CD Bustarviejo!',
                    body: emailBienvenida({
                      nombre: pendingMember.nombre_completo,
                      numeroSocio: pendingMember.numero_socio,
                      temporada: tempActual,
                      dni: pendingMember.dni || ''
                    })
                  });
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to: 'cdbustarviejo@outlook.es',
                    subject: `✅ Nuevo socio pagado (Payment Link) - ${pendingMember.nombre_completo}`,
                    body: `Socio pagado via Payment Link:\nNombre: ${pendingMember.nombre_completo}\nEmail: ${payerEmail}\nNúmero: ${pendingMember.numero_socio}\nTemporada: ${tempActual}`
                  });
                } catch (emailErr) {
                  console.error('[stripe-webhook] Error email Payment Link:', emailErr?.message);
                }
              } else {
                console.log('[stripe-webhook] Payment Link: no se encontró socio pendiente para', payerEmail, tempActual);
              }
            } catch (plErr) {
              console.error('[stripe-webhook] Error procesando Payment Link:', plErr?.message);
            }
          }
        }

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

        // NUEVO: Cuota de socio (pago desde la app, web o Payment Link con metadata)
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

          // Determinar origen_pago y si es suscripción
          const isSuscripcion = session.mode === 'subscription';
          const origenPago = metadata.origen_pago || (isSuscripcion ? 'stripe_suscripcion' : 'stripe_unico');

          // Calcular fecha_vencimiento (30 junio del año de fin de temporada)
          let fechaVencimiento = null;
          try {
            if (temporada && temporada.includes('-')) {
              const endYear = temporada.split('-')[1];
              fechaVencimiento = `${endYear}-06-30`;
            }
          } catch {}

          // Datos de suscripción si aplica
          let stripeSubId = null;
          let stripeCustomerId = session.customer || null;
          let fechaProximoCobro = null;
          if (isSuscripcion && session.subscription) {
            stripeSubId = session.subscription;
            try {
              const sub = await stripe.subscriptions.retrieve(session.subscription);
              if (sub.current_period_end) {
                fechaProximoCobro = new Date(sub.current_period_end * 1000).toISOString();
              }
            } catch (subErr) {
              console.error('[stripe-webhook] Error obteniendo datos suscripción socio:', subErr?.message);
            }
          }

          // Campos comunes para actualizar/crear
          const memberUpdateData = {
            estado_pago: 'Pagado',
            metodo_pago: 'Tarjeta',
            activo: true,
            origen_pago: origenPago,
            renovacion_automatica: isSuscripcion,
            fecha_alta: today,
            fecha_pago: today,
            fecha_vencimiento: fechaVencimiento,
            fecha_ultimo_cobro: new Date().toISOString(),
            stripe_customer_id: stripeCustomerId || undefined,
            stripe_subscription_id: stripeSubId || undefined,
            stripe_subscription_status: isSuscripcion ? 'active' : undefined,
            fecha_proximo_cobro: fechaProximoCobro || undefined,
          };
          // Remove undefined keys
          Object.keys(memberUpdateData).forEach(k => memberUpdateData[k] === undefined && delete memberUpdateData[k]);

          let member = null;

          // 1. Si viene con membership_id → ya existía, solo marcar Pagado
          if (membershipId) {
            try {
              await base44.asServiceRole.entities.ClubMember.update(membershipId, memberUpdateData);
              const members = await base44.asServiceRole.entities.ClubMember.filter({ id: membershipId });
              member = members?.[0] || null;
              console.log('[stripe-webhook] ClubMember marcado Pagado', { membership_id: membershipId, origen_pago: origenPago });
            } catch (e) {
              console.error('[stripe-webhook] Error actualizando ClubMember:', e?.message || e);
            }
          } else if (email) {
            // 2. Buscar por email+temporada
            try {
              const candidates = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
              const candidate = candidates?.[0];
              if (candidate) {
                await base44.asServiceRole.entities.ClubMember.update(candidate.id, memberUpdateData);
                member = candidate;
                console.log('[stripe-webhook] ClubMember detectado por email+temporada, marcado Pagado', { id: candidate.id });
              }
            } catch (e) {
              console.error('[stripe-webhook] Error buscando ClubMember por email:', e?.message || e);
            }

            // 3. AUTO-CREACIÓN: Si no existe ningún ClubMember → crear automáticamente
            if (!member && metadata.nombre_completo) {
              try {
                const allMembers = await base44.asServiceRole.entities.ClubMember.list();
                const currentYear = new Date().getFullYear();
                const membersThisYear = allMembers.filter(m => m.numero_socio?.includes(`CDB-${currentYear}`));
                const nextNumber = membersThisYear.length + 1;
                const numeroSocio = `CDB-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

                const newMember = await base44.asServiceRole.entities.ClubMember.create({
                  numero_socio: numeroSocio,
                  tipo_inscripcion: metadata.tipo_inscripcion || 'Nueva Inscripción',
                  nombre_completo: metadata.nombre_completo,
                  dni: metadata.dni || '',
                  telefono: metadata.telefono || '',
                  email: email,
                  direccion: metadata.direccion || '',
                  municipio: metadata.municipio || '',
                  es_segundo_progenitor: metadata.es_segundo_progenitor === 'true',
                  es_socio_externo: true,
                  cuota_socio: Number(session.amount_total || 0) / 100,
                  temporada: temporada,
                  referido_por: metadata.referido_por || '',
                  notas: 'Socio creado automáticamente desde pago Stripe (web)',
                  ...memberUpdateData,
                });
                member = newMember;
                console.log('[stripe-webhook] ClubMember AUTO-CREADO desde Stripe', { id: newMember.id, numero: numeroSocio, origen_pago: origenPago });
              } catch (createErr) {
                console.error('[stripe-webhook] Error auto-creando ClubMember:', createErr?.message || createErr);
              }
            }
          }

          // Emails de confirmación (socio y admin)
          try {
            const to = member?.email || email;
            if (to) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to,
                subject: '🎉 ¡Bienvenido/a al CD Bustarviejo!',
                body: emailBienvenida({
                  nombre: member?.nombre_completo || metadata.nombre_completo || '',
                  numeroSocio: member?.numero_socio || '',
                  temporada,
                  dni: member?.dni || metadata.dni || ''
                })
              });
            }
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: 'cdbustarviejo@outlook.es',
              subject: `✅ Nuevo socio pagado (Stripe) - ${member?.nombre_completo || metadata.nombre_completo || email}`,
              body: `Socio pagado: ${member?.nombre_completo || metadata.nombre_completo || ''}\nEmail: ${email}\nNúmero: ${member?.numero_socio || 'pendiente'}\nTemporada: ${temporada}\n${member?.id ? 'Auto-creado desde web' : 'Existente actualizado'}`
            });
          } catch (emailErr) {
            console.error('[stripe-webhook] Error enviando email Socio:', emailErr?.message || emailErr);
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

          // Renovación anual automática de socio (suscripción yearly)
          if (subMeta.tipo === 'cuota_socio') {
            const amount = (invoice.amount_paid || 0) / 100;
            const today = new Date().toISOString().slice(0, 10);
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const temporada = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
            const email = subMeta.user_email || subMeta.email || invoice.customer_email;
            const fechaVencimiento = temporada.includes('-') ? `${temporada.split('-')[1]}-06-30` : null;

            // Obtener fecha próximo cobro de la suscripción
            let fechaProximoCobro = null;
            try {
              if (subscription.current_period_end) {
                fechaProximoCobro = new Date(subscription.current_period_end * 1000).toISOString();
              }
            } catch {}

            console.log('[stripe-webhook] Renovación anual de socio', { email, temporada, amount });

            try {
              let existing = [];
              try { existing = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada }); } catch {}

              const renewalData = {
                estado_pago: 'Pagado',
                metodo_pago: 'Tarjeta',
                activo: true,
                origen_pago: 'stripe_suscripcion',
                renovacion_automatica: true,
                fecha_alta: today,
                fecha_pago: today,
                fecha_vencimiento: fechaVencimiento,
                fecha_ultimo_cobro: new Date().toISOString(),
                fecha_proximo_cobro: fechaProximoCobro,
                stripe_subscription_id: subId,
                stripe_customer_id: invoice.customer || null,
                stripe_subscription_status: 'active',
                aviso_cobro_ok_enviado: false,
                recordatorio_renovacion_enviado: false,
                recordatorio_renovacion_count: 0,
              };

              if (existing.length === 0 && email) {
                const allMembers = await base44.asServiceRole.entities.ClubMember.list();
                const prev = allMembers.find(m => m.email === email && m.temporada !== temporada);
                const membersThisYear = allMembers.filter(m => m.numero_socio?.includes(`CDB-${year}`));
                const nextNumber = membersThisYear.length + 1;
                const numeroSocio = `CDB-${year}-${String(nextNumber).padStart(4, '0')}`;

                await base44.asServiceRole.entities.ClubMember.create({
                  numero_socio: numeroSocio,
                  tipo_inscripcion: 'Renovación',
                  nombre_completo: prev?.nombre_completo || subMeta.nombre_completo || '',
                  dni: prev?.dni || subMeta.dni || '',
                  telefono: prev?.telefono || subMeta.telefono || '',
                  email,
                  direccion: prev?.direccion || subMeta.direccion || '',
                  municipio: prev?.municipio || subMeta.municipio || '',
                  es_socio_externo: prev?.es_socio_externo || true,
                  cuota_socio: amount,
                  temporada,
                  referido_por: prev?.referido_por || '',
                  notas: 'Renovación automática por suscripción Stripe',
                  ...renewalData,
                });
                console.log('[stripe-webhook] Socio renovado automáticamente', { email, temporada });
              } else if (existing[0] && existing[0].estado_pago !== 'Pagado') {
                await base44.asServiceRole.entities.ClubMember.update(existing[0].id, renewalData);
              } else if (existing[0]) {
                // Ya estaba pagado, solo actualizar fechas de cobro
                await base44.asServiceRole.entities.ClubMember.update(existing[0].id, {
                  fecha_ultimo_cobro: new Date().toISOString(),
                  fecha_proximo_cobro: fechaProximoCobro,
                  stripe_subscription_status: 'active',
                });
              }

              // Notificar al socio que su renovación se procesó correctamente
              if (email) {
                const prevMember = existing?.[0];
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: email,
                  subject: `✅ Cuota de socio renovada automáticamente - Temporada ${temporada}`,
                  body: emailRenovacion({
                    nombre: prevMember?.nombre_completo || subMeta.nombre_completo || '',
                    numeroSocio: prevMember?.numero_socio || '',
                    temporada,
                    amount
                  })
                });
                // Marcar aviso enviado
                try {
                  const members = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
                  if (members?.[0]) {
                    await base44.asServiceRole.entities.ClubMember.update(members[0].id, { aviso_cobro_ok_enviado: true });
                  }
                } catch {}
              }
            } catch (socioErr) {
              console.error('[stripe-webhook] Error renovación anual socio:', socioErr?.message);
            }
          }

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

          // Fallo en cobro de suscripción de socio
          if (subMeta.tipo === 'cuota_socio') {
            const amount = (invoice.amount_due || 0) / 100;
            const email = subMeta.user_email || subMeta.email || invoice.customer_email;
            console.log('[stripe-webhook] Fallo cobro suscripción socio', { email, amount });

            try {
              await base44.asServiceRole.entities.StripePaymentLog.create({
                section: 'socios_fallo',
                amount,
                currency: invoice.currency || 'eur',
                status: 'failed',
                session_id: invoice.id,
                payment_intent_id: invoice.payment_intent || null,
                email,
                related_entity: 'ClubMember',
                related_id: null,
                metadata: subMeta,
                created_at: new Date().toISOString()
              });
            } catch (logErr) {
              console.error('[stripe-webhook] Error log fallo socio:', logErr?.message);
            }

            // Actualizar estado de suscripción del socio
            try {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth() + 1;
              const temporada = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
              const members = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
              if (members?.[0]) {
                await base44.asServiceRole.entities.ClubMember.update(members[0].id, {
                  stripe_subscription_status: 'past_due',
                  estado_pago: 'Fallido',
                  aviso_cobro_fallido_enviado: false,
                });
              }
            } catch (upErr) {
              console.error('[stripe-webhook] Error actualizando socio fallido:', upErr?.message);
            }

            // Notificar al socio
            if (email) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: email,
                  subject: `⚠️ Fallo en el cobro de tu cuota de socio`,
                  body: emailFalloCobro({ nombre: subMeta.nombre_completo || '', amount })
                });
                // Marcar aviso enviado
                try {
                  const now2 = new Date();
                  const yr = now2.getFullYear();
                  const mo = now2.getMonth() + 1;
                  const temp = mo >= 7 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
                  const ms = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada: temp });
                  if (ms?.[0]) await base44.asServiceRole.entities.ClubMember.update(ms[0].id, { aviso_cobro_fallido_enviado: true });
                } catch {}
              } catch (emailErr) {
                console.error('[stripe-webhook] Error email fallo socio:', emailErr?.message);
              }
            }
            // Notificar admin
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: 'cdbustarviejo@outlook.es',
                subject: `⚠️ Fallo cobro cuota socio - ${email}`,
                body: `Fallo al cobrar ${amount}€ de cuota de socio de ${email}.\nSuscripción: ${subId}\nStripe reintentará automáticamente.`
              });
            } catch {}
          }

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
                to: 'cdbustarviejo@outlook.es',
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

    // ========== CUSTOMER.SUBSCRIPTION.UPDATED / DELETED ==========
    // Cancelación o cambio de estado de suscripción
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data?.object || {};
      const subMeta = subscription.metadata || {};
      const subStatus = subscription.status; // active, past_due, canceled, unpaid, incomplete

      if (subMeta.tipo === 'cuota_socio') {
        const email = subMeta.user_email || subMeta.email || '';
        console.log('[stripe-webhook] Suscripción socio actualizada', { id: subscription.id, status: subStatus, email });

        try {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1;
          const temporada = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

          const members = await base44.asServiceRole.entities.ClubMember.filter({ 
            stripe_subscription_id: subscription.id 
          });
          // Si no encontramos por subscription_id, buscar por email+temporada
          let member = members?.[0];
          if (!member && email) {
            const byEmail = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
            member = byEmail?.[0];
          }

          if (member) {
            const updateData = {
              stripe_subscription_status: subStatus,
            };

            if (subStatus === 'canceled') {
              updateData.renovacion_automatica = false;
              console.log('[stripe-webhook] Suscripción cancelada para socio', member.id);

              // Notificar al socio
              if (email) {
                try {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to: email,
                    subject: '🔔 Tu suscripción de socio ha sido cancelada',
                    body: emailSuscripcionCancelada({
                      nombre: member.nombre_completo || '',
                      fechaVencimiento: member.fecha_vencimiento ? new Date(member.fecha_vencimiento).toLocaleDateString('es-ES') : '30 de junio'
                    })
                  });
                } catch {}
              }
            } else if (subStatus === 'past_due') {
              updateData.aviso_cobro_fallido_enviado = false;
            }

            // Actualizar próximo cobro si la suscripción sigue activa
            if (subscription.current_period_end && subStatus !== 'canceled') {
              updateData.fecha_proximo_cobro = new Date(subscription.current_period_end * 1000).toISOString();
            }
            if (subStatus === 'canceled') {
              updateData.fecha_proximo_cobro = null;
            }

            await base44.asServiceRole.entities.ClubMember.update(member.id, updateData);
          }
        } catch (subErr) {
          console.error('[stripe-webhook] Error procesando actualización suscripción socio:', subErr?.message);
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
            body: emailFalloPagoDirecto({
              nombre: jugadorNombre || '',
              amount,
              tipoDesc,
              reason: failMessage
            })
          });
        }

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'cdbustarviejo@outlook.es',
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