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
          customer_email: session.customer_details?.email || session.customer_email,
        });

        try {
          const base44 = createClientFromRequest(req);
          const meta = session.metadata || {};
          const emailFromMeta = (meta.email || '').toLowerCase();
          const email = (emailFromMeta || session.customer_details?.email || session.customer_email || '').toLowerCase();
          const name = meta.nombre_completo || session.customer_details?.name || '';
          // NO forzar reemplazo de guiones por barras, usar el valor exacto de la configuración
          const temporada = meta.temporada || ''; 
          const tipo = meta.tipo || '';
          const amount = (session.amount_total || 0) / 100;
          const extra = {
            dni: meta.dni || '',
            telefono: meta.telefono || '',
            direccion: meta.direccion || '',
            municipio: meta.municipio || '',
            tipo_inscripcion: meta.tipo_inscripcion || 'Nueva Inscripción',
            es_segundo_progenitor: meta.es_segundo_progenitor === 'true',
            referido_por: meta.referido_por || '',
            referido_por_email: meta.referido_por_email || '',
            es_socio_externo: meta.es_socio_externo === 'true'
          };

          if ((tipo === 'cuota_socio' || tipo === 'alta_socio_referido') && email) {
            // Detectar referidor automático: si viene referido_por_email, buscar ese usuario
            let referidoPor = extra.referido_por || '';
            let referidoPorEmail = extra.referido_por_email || '';

            // Si viene referral_code (de JoinReferral), buscar el usuario que coincide con el hash
            if (meta.referral_code && !referidoPorEmail) {
              try {
                const allUsers = await base44.asServiceRole.entities.User.list();
                const generateReferralCode = (email) => {
                  let hash = 0;
                  for (let i = 0; i < email.length; i++) {
                    const char = email.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                  }
                  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
                };
                
                const foundUser = allUsers.find(u => generateReferralCode(u.email || '') === meta.referral_code);
                if (foundUser) {
                  referidoPor = foundUser.full_name;
                  referidoPorEmail = foundUser.email;
                  console.log(`[stripeWebhook] Referidor encontrado por código ${meta.referral_code}: ${referidoPor}`);
                }
              } catch (e) {
                console.error('[stripeWebhook] Error buscando referidor por código:', e);
              }
            }

            if (!referidoPor && referidoPorEmail) {
              // Intentar obtener nombre del usuario referidor (para compatibilidad con automático)
              try {
                const referrers = await base44.asServiceRole.entities.User.filter({ email: referidoPorEmail });
                if (referrers && referrers.length > 0) {
                  referidoPor = referrers[0].full_name || referidoPorEmail;
                }
              } catch (e) {
                referidoPor = referidoPorEmail; // Fallback al email si falla
              }
            }

            // Buscar socio de la temporada; si no existe, crearlo como externo
            let targetMemberId = null;
            const existing = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
            
            if (existing && existing.length > 0) {
              const member = existing[0];
              targetMemberId = member.id;
              await base44.asServiceRole.entities.ClubMember.update(member.id, {
                estado_pago: 'Pagado',
                cuota_pagada: amount || 25,
                fecha_pago: new Date().toISOString().split('T')[0],
                metodo_pago: 'Tarjeta',
                referido_por: referidoPor || member.referido_por,
                referido_por_email: referidoPorEmail || member.referido_por_email,
                referido_procesado: false // Marcar false temporalmente para procesar abajo
              });
              console.log('[stripeWebhook] ClubMember actualizado como Pagado:', member.id);
            } else {
              const created = await base44.asServiceRole.entities.ClubMember.create({
                numero_socio: `CDB-${new Date().getFullYear()}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`,
                nombre_completo: name || email,
                dni: extra.dni,
                telefono: extra.telefono,
                email,
                direccion: extra.direccion,
                municipio: extra.municipio,
                cuota_socio: amount || 25,
                cuota_pagada: amount || 25,
                tipo_inscripcion: extra.tipo_inscripcion,
                estado_pago: 'Pagado',
                temporada: temporada,
                activo: true,
                es_socio_externo: extra.es_socio_externo,
                metodo_pago: 'Tarjeta',
                referido_por: referidoPor,
                referido_por_email: referidoPorEmail,
                referido_procesado: false
              });
              targetMemberId = created.id;
              console.log('[stripeWebhook] ClubMember creado y marcado Pagado:', created.id);
            }

            // --- PROCESAMIENTO INMEDIATO DE REFERIDOS ---
            if ((referidoPor || referidoPorEmail) && targetMemberId) {
              try {
                // Obtener configuración activa
                const configs = await base44.asServiceRole.entities.SeasonConfig.list();
                const activeConfig = configs.find(c => c.activa === true);

                if (activeConfig?.programa_referidos_activo) {
                  const refEmail = referidoPorEmail;
                  const refNombre = referidoPor || refEmail;
                  const referidoNombre = name || email;

                  // 1. Buscar usuario referidor
                  let referrerUser = null;
                  // Intentar por email
                  if (refEmail) {
                    const users = await base44.asServiceRole.entities.User.filter({ email: refEmail });
                    referrerUser = users?.[0];
                  }
                  
                  // Si no se encuentra por email y hay nombre, intentar buscar por nombre exacto (para referidos manuales)
                  if (!referrerUser && !refEmail && refNombre) {
                    try {
                        const allUsers = await base44.asServiceRole.entities.User.list();
                        referrerUser = allUsers.find(u => 
                            u.full_name?.toLowerCase().trim() === refNombre.toLowerCase().trim() ||
                            u.email?.toLowerCase().trim() === refNombre.toLowerCase().trim()
                        );
                        if (referrerUser) console.log(`[stripeWebhook] Usuario encontrado por nombre: ${referrerUser.full_name}`);
                    } catch (e) { console.error('Error buscando usuario por nombre:', e); }
                  }

                  if (referrerUser) {
                    // Actualizar contadores del usuario referidor
                    const currentCount = referrerUser.referrals_count || 0;
                    const creditEarned = activeConfig.referidos_premio_1 || 5;
                    
                    const newCount = currentCount + 1;
                    let newCredit = (referrerUser.clothing_credit_balance || 0) + creditEarned;
                    let newRaffles = referrerUser.raffle_entries_total || 0;

                    // Bonus por hitos
                    if (newCount === 3) {
                        newCredit += (activeConfig.referidos_premio_3 || 15) - creditEarned;
                        newRaffles += activeConfig.referidos_sorteo_3 || 1;
                    } else if (newCount === 5) {
                        newCredit += (activeConfig.referidos_premio_5 || 25) - (activeConfig.referidos_premio_3 || 15);
                        newRaffles += (activeConfig.referidos_sorteo_5 || 3) - (activeConfig.referidos_sorteo_3 || 1);
                    } else if (newCount === 10) {
                        newCredit += (activeConfig.referidos_premio_10 || 50) - (activeConfig.referidos_premio_5 || 25);
                        newRaffles += (activeConfig.referidos_sorteo_10 || 5) - (activeConfig.referidos_sorteo_5 || 3);
                    } else if (newCount === 15) {
                        newCredit += (activeConfig.referidos_premio_15 || 50) - (activeConfig.referidos_premio_10 || 50);
                        newRaffles += (activeConfig.referidos_sorteo_15 || 10) - (activeConfig.referidos_sorteo_10 || 5);
                    }

                    // Guardar actualización de usuario
                    await base44.asServiceRole.entities.User.update(referrerUser.id, {
                        referrals_count: newCount,
                        clothing_credit_balance: newCredit,
                        raffle_entries_total: newRaffles
                    });

                    // Historial de crédito
                    await base44.asServiceRole.entities.CreditoRopaHistorico.create({
                        user_email: referrerUser.email,
                        user_nombre: referrerUser.full_name,
                        tipo: "ganado",
                        cantidad: creditEarned,
                        concepto: `Socio referido (Stripe): ${referidoNombre}`,
                        temporada: temporada,
                        referido_nombre: referidoNombre,
                        saldo_antes: referrerUser.clothing_credit_balance || 0,
                        saldo_despues: newCredit,
                        fecha_movimiento: new Date().toISOString()
                    });

                    // Registro de premio
                    await base44.asServiceRole.entities.ReferralReward.create({
                        referrer_email: referrerUser.email,
                        referrer_name: referrerUser.full_name,
                        referred_member_id: targetMemberId,
                        referred_member_name: referidoNombre,
                        temporada: temporada,
                        clothing_credit_earned: creditEarned
                    });
                    
                    console.log(`✅ [stripeWebhook] Premios otorgados a ${referrerUser.full_name}`);
                  }

                  // 2. Crear registro histórico global
                  await base44.asServiceRole.entities.ReferralHistory.create({
                    temporada: temporada,
                    referidor_email: refEmail,
                    referidor_nombre: refNombre,
                    referido_email: email,
                    referido_nombre: referidoNombre,
                    referido_id: targetMemberId,
                    estado: 'activo',
                    credito_otorgado: referrerUser ? (activeConfig.referidos_premio_1 || 5) : 0,
                    sorteos_otorgados: 0,
                    fecha_referido: new Date().toISOString()
                  });

                  // 3. Marcar socio como procesado FINALMENTE
                  await base44.asServiceRole.entities.ClubMember.update(targetMemberId, {
                    referido_procesado: true,
                    referido_por: refNombre,
                    referido_por_email: refEmail
                  });
                  
                  console.log(`✅ [stripeWebhook] Referido procesado completamente para socio ${targetMemberId}`);
                }
              } catch (err) {
                console.error('[stripeWebhook] Error procesando referidos inline:', err);
              }
            }
            }

            // Cuotas: marcar Payment como pagado y registrar transacción
            if (tipo === 'pago_cuota' && session.metadata?.payment_id) {
              try {
                const paymentId = session.metadata.payment_id;
                // Idempotencia: si ya existe transaction para este payment, no repetir
                const existentes = await base44.asServiceRole.entities.FinancialTransaction.filter({ referencia_origen: paymentId, categoria: 'Cuotas' });
                if (!existentes || existentes.length === 0) {
                  // Actualizar Payment
                  await base44.asServiceRole.entities.Payment.update(paymentId, {
                    estado: 'Pagado',
                    metodo_pago: 'Tarjeta',
                    fecha_pago: new Date().toISOString().split('T')[0]
                  });
                  const temporadaNorm = (session.metadata?.temporada || '').replace(/-/g,'/');
                  await base44.asServiceRole.entities.FinancialTransaction.create({
                    tipo: 'Ingreso',
                    concepto: `Cuota ${session.metadata?.mes || ''}`.trim(),
                    cantidad: amount,
                    fecha: new Date().toISOString().split('T')[0],
                    categoria: 'Cuotas',
                    subtipo_documento: 'Cuota',
                    metodo_pago: 'Tarjeta',
                    temporada: temporadaNorm,
                    proveedor_cliente: session.metadata?.jugador_nombre || email,
                    automatico: true,
                    referencia_origen: paymentId,
                  });
                  }

                  // Enviar emails de confirmación (tarjeta) a familia y copia al club
                  try {
                  const pagos = await base44.asServiceRole.entities.Payment.filter({ id: paymentId });
                  const pago = pagos?.[0];
                  if (pago) {
                    const jugadores = await base44.asServiceRole.entities.Player.filter({ id: pago.jugador_id });
                    const jugador = jugadores?.[0];
                    const subject = `Pago confirmado - ${jugador?.nombre || ''} - ${pago.mes || ''}`.trim();
                    const html = `
                      <h2>✅ Pago confirmado (tarjeta)</h2>
                      <p>Hemos registrado tu pago de <strong>${(amount || 0).toFixed(2)}€</strong> correspondiente a <strong>${pago.mes || ''}</strong> (${(pago.temporada || '').replace(/-/g,'/')}).</p>
                      <p><strong>Jugador:</strong> ${jugador?.nombre || ''}</p>
                      <p><strong>Método:</strong> Tarjeta</p>
                      <hr>
                      <p>Puedes ver tus pagos y descargar el recibo desde la app: <a href="https://app.cdbustarviejo.com">Mis Pagos</a></p>
                    `;
                    const destinos = [jugador?.email_padre, jugador?.email_tutor_2].filter(Boolean);
                    for (const to of destinos) {
                      await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: html });
                    }
                    // Copia al club
                    await base44.asServiceRole.integrations.Core.SendEmail({ to: 'CDBUSTARVIEJO@GMAIL.COM', subject: `[CLUB] Pago tarjeta confirmado - ${jugador?.nombre || ''} - ${pago.mes || ''}`.trim(), body: html });
                  }
                  } catch (mailErr) {
                  console.error('[stripeWebhook] Error enviando emails cuota tarjeta:', mailErr);
                  }
                  } catch (err) {
                console.error('[stripeWebhook] Error post-proceso Cuota:', err);
              }
            }

            // Lote de cuotas (tarjeta): marcar cada Payment y crear asientos
            if (tipo === 'pago_cuota_batch' && session.metadata?.batch_id) {
              try {
                const batchId = session.metadata.batch_id;
                const batchList = await base44.asServiceRole.entities.BatchPayment.filter({ id: batchId });
                const batch = batchList?.[0];
                if (batch) {
                  const temporadaNorm = (batch.temporada || session.metadata?.temporada || '').replace(/-/g,'/');
                  for (const it of (batch.items || [])) {
                    const pid = it.payment_id;
                    // Idempotencia por payment_id
                    const existentes = await base44.asServiceRole.entities.FinancialTransaction.filter({ referencia_origen: pid, categoria: 'Cuotas' });
                    if (!existentes || existentes.length === 0) {
                      await base44.asServiceRole.entities.Payment.update(pid, {
                        estado: 'Pagado',
                        metodo_pago: 'Tarjeta',
                        fecha_pago: new Date().toISOString().split('T')[0]
                      });
                      await base44.asServiceRole.entities.FinancialTransaction.create({
                            tipo: 'Ingreso',
                            concepto: `Cuota ${it.mes}`.trim(),
                            cantidad: it.cantidad,
                            fecha: new Date().toISOString().split('T')[0],
                            categoria: 'Cuotas',
                            subtipo_documento: 'Cuota',
                            metodo_pago: 'Tarjeta',
                            temporada: it.temporada || temporadaNorm,
                            proveedor_cliente: it.jugador_nombre || email,
                            automatico: true,
                            referencia_origen: pid
                          });
                        }
                      }
                      await base44.asServiceRole.entities.BatchPayment.update(batch.id, {
                       status: 'paid',
                       stripe_session_id: session.id
                      });

                      // Email resumen al pagador y copia al club
                      try {
                        const resumen = (batch.items || []).map(x => `${x.jugador_nombre || ''} - ${x.mes}: ${Number(x.cantidad).toFixed(2)}€`).join('<br>');
                        const subject = 'Pago por tarjeta confirmado (lote de cuotas)';
                        const html = `<h2>✅ Pago confirmado (tarjeta)</h2><p>Hemos registrado tu pago en lote:</p><p>${resumen}</p>`;
                        const destinatario = (session.customer_details?.email || session.customer_email || email || '').toLowerCase();
                        if (destinatario) await base44.asServiceRole.integrations.Core.SendEmail({ to: destinatario, subject, body: html });
                        await base44.asServiceRole.integrations.Core.SendEmail({ to: 'CDBUSTARVIEJO@GMAIL.COM', subject: '[CLUB] Lote de cuotas pagado (tarjeta)', body: html });
                      } catch (mailErr) {
                        console.error('[stripeWebhook] Error email batch tarjeta:', mailErr);
                      }
                      }
                      } catch (err) {
                console.error('[stripeWebhook] Error post-proceso Lote Cuotas:', err);
              }
            }

            // Lotería: marcar pedido como pagado y registrar margen financiero
            if (tipo === 'loteria' && session.metadata?.order_id) {
              try {
                const orderId = session.metadata.order_id;
                await base44.asServiceRole.entities.LotteryOrder.update(orderId, {
                  pagado: true,
                  metodo_pago: 'Tarjeta',
                  fecha_pago: new Date().toISOString()
                });
                console.log('[stripeWebhook] Lotería pagada por tarjeta. Order:', orderId);

                // Email confirmación lotería
                try {
                  const destinatario = (session.customer_details?.email || session.customer_email || email || '').toLowerCase();
                  const subject = 'Pago de Lotería confirmado (tarjeta)';
                  const html = `<h2>✅ Pago confirmado (tarjeta)</h2><p>Hemos registrado tu pago de lotería.</p>`;
                  if (destinatario) await base44.asServiceRole.integrations.Core.SendEmail({ to: destinatario, subject, body: html });
                  await base44.asServiceRole.integrations.Core.SendEmail({ to: 'CDBUSTARVIEJO@GMAIL.COM', subject: '[CLUB] Lotería pagada (tarjeta)', body: html });
                } catch (mailErr) {
                  console.error('[stripeWebhook] Error email lotería tarjeta:', mailErr);
                }

                // Obtener pedido para calcular margen
                const pedidos = await base44.asServiceRole.entities.LotteryOrder.filter({ id: orderId });
                const pedido = pedidos?.[0];
                if (pedido) {
                  const baseCoste = 20;
                  const precio = Number(pedido.precio_por_decimo || session.metadata?.precio_por_decimo || 22);
                  const margenPorDecimo = Math.max(precio - baseCoste, 0);
                  const decimos = Number(pedido.numero_decimos || 0);
                  const margenTotal = Number((margenPorDecimo * decimos).toFixed(2));
                  const temporadaNorm = (pedido.temporada || session.metadata?.temporada || '').replace(/-/g,'/');

                  if (margenTotal > 0) {
                    // Evitar duplicados por order y temporada
                    const existentes = await base44.asServiceRole.entities.FinancialTransaction.filter({ referencia_origen: orderId, concepto: 'Ganancia Lotería', temporada: temporadaNorm });
                    if (!existentes || existentes.length === 0) {
                      await base44.asServiceRole.entities.FinancialTransaction.create({
                        tipo: 'Ingreso',
                        concepto: 'Ganancia Lotería',
                        cantidad: margenTotal,
                        fecha: new Date().toISOString().split('T')[0],
                        categoria: 'Lotería',
                        subtipo_documento: 'Lotería',
                        metodo_pago: 'Tarjeta',
                        temporada: temporadaNorm || '',
                        proveedor_cliente: pedido.jugador_nombre || '',
                        automatico: true,
                        referencia_origen: orderId,
                        notas: `Margen ${margenPorDecimo}€ x ${decimos} décimos`
                      });
                      console.log('[stripeWebhook] FinancialTransaction creada para margen de lotería:', orderId, margenTotal);
                    }
                  }
                }
              } catch (err) {
                console.error('[stripeWebhook] Error post-proceso Lotería:', err);
              }
            }

           } catch (e) {
          console.error('[stripeWebhook] Error procesando cuota socio:', e);
        }
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