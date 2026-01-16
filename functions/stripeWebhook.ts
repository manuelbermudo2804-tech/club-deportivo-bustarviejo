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
            es_socio_externo: meta.es_socio_externo === 'true'
          };

          if (tipo === 'cuota_socio' && email) {
            // Buscar socio de la temporada; si no existe, crearlo como externo
            const existing = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
            if (existing && existing.length > 0) {
              const member = existing[0];
              await base44.asServiceRole.entities.ClubMember.update(member.id, {
                estado_pago: 'Pagado',
                cuota_pagada: amount || 25,
                fecha_pago: new Date().toISOString().split('T')[0],
                metodo_pago: 'Tarjeta'
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
                referido_por: extra.referido_por
              });
              console.log('[stripeWebhook] ClubMember creado y marcado Pagado:', created.id);
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

                // Obtener pedido para calcular margen
                const pedidos = await base44.asServiceRole.entities.LotteryOrder.filter({ id: orderId });
                const pedido = pedidos?.[0];
                if (pedido) {
                  const baseCoste = 20;
                  const precio = Number(pedido.precio_por_decimo || session.metadata?.precio_por_decimo || 22);
                  const margenPorDecimo = Math.max(precio - baseCoste, 0);
                  const decimos = Number(pedido.numero_decimos || 0);
                  const margenTotal = Number((margenPorDecimo * decimos).toFixed(2));

                  if (margenTotal > 0) {
                    // Evitar duplicados
                    const existentes = await base44.asServiceRole.entities.FinancialTransaction.filter({ referencia_origen: orderId, concepto: 'Ganancia Lotería' });
                    if (!existentes || existentes.length === 0) {
                      await base44.asServiceRole.entities.FinancialTransaction.create({
                        tipo: 'Ingreso',
                        concepto: 'Ganancia Lotería',
                        cantidad: margenTotal,
                        fecha: new Date().toISOString().split('T')[0],
                        categoria: 'Lotería',
                        subtipo_documento: 'Lotería',
                        metodo_pago: 'Tarjeta',
                        temporada: pedido.temporada || session.metadata?.temporada || '',
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