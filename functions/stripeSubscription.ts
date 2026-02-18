import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      jugador_id,
      jugador_nombre,
      categoria,
      temporada,
      total_cuota,
      porcentaje_inicial,
      mes_fin,
      descuento_hermano = 0,
      successUrl,
      cancelUrl
    } = body;

    if (!jugador_id || !total_cuota || !successUrl || !cancelUrl) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    // Calcular importes
    const pctInicial = porcentaje_inicial || 60;
    const totalConDescuento = total_cuota - descuento_hermano;
    const pagoInicial = Math.round(totalConDescuento * pctInicial / 100);
    const restante = totalConDescuento - pagoInicial;

    // Calcular meses de cobro (Sept a mes_fin)
    const MES_NUMEROS = {
      "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12,
      "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6
    };
    const mesFinNum = MES_NUMEROS[mes_fin || "Mayo"] || 5;
    // Meses desde septiembre (9) hasta mes_fin
    let numMeses = 0;
    if (mesFinNum >= 9) {
      numMeses = mesFinNum - 9 + 1;
    } else {
      numMeses = (12 - 9 + 1) + mesFinNum; // sept-dic + ene-mesFin
    }
    if (numMeses < 1) numMeses = 1;

    const mensualidad = Math.round((restante / numMeses) * 100) / 100; // en euros, 2 decimales
    const mensualidadCentimos = Math.round(mensualidad * 100);

    // Calcular fecha de cancelación automática
    const now = new Date();
    const year = now.getFullYear();
    let cancelYear = mesFinNum >= 9 ? year : year + 1;
    // Si ya pasamos septiembre del año actual y el mes_fin es antes, será el año siguiente
    if (now.getMonth() + 1 > 8 && mesFinNum < 9) {
      cancelYear = year + 1;
    }
    // Último día del mes_fin
    const cancelDate = new Date(cancelYear, mesFinNum, 0, 23, 59, 59);
    const cancelAtTimestamp = Math.floor(cancelDate.getTime() / 1000);

    // 1. Crear o buscar customer en Stripe
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: { base44_user_email: user.email }
      });
    }

    // 2. Crear un precio recurrente para la suscripción
    const product = await stripe.products.create({
      name: `Plan Mensual - ${jugador_nombre} - ${categoria}`,
      metadata: {
        jugador_id,
        jugador_nombre,
        categoria,
        temporada
      }
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: mensualidadCentimos,
      currency: 'eur',
      recurring: { interval: 'month' }
    });

    // 3. Crear sesión de Checkout con:
    //    - Pago inicial (one-off) como line_item
    //    - Suscripción mensual que arranca en el primer cobro del mes siguiente
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          // Pago inicial (60%)
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Inscripción ${jugador_nombre} - ${categoria} (${pctInicial}% inicial)`,
            },
            unit_amount: Math.round(pagoInicial * 100),
          },
          quantity: 1,
        },
        {
          // Suscripción mensual
          price: price.id,
          quantity: 1,
        }
      ],
      subscription_data: {
        cancel_at: cancelAtTimestamp,
        metadata: {
          tipo: 'plan_mensual_cuota',
          jugador_id,
          jugador_nombre,
          categoria,
          temporada,
          mensualidad: String(mensualidad),
          num_meses: String(numMeses),
          total_cuota: String(totalConDescuento),
          pago_inicial: String(pagoInicial),
          user_email: user.email
        }
      },
      metadata: {
        tipo: 'plan_mensual_inscripcion',
        jugador_id,
        jugador_nombre,
        categoria,
        temporada,
        pago_inicial: String(pagoInicial),
        mensualidad: String(mensualidad),
        num_meses: String(numMeses),
        total_cuota: String(totalConDescuento),
        user_email: user.email
      }
    });

    return Response.json({
      url: session.url,
      session_id: session.id,
      desglose: {
        total_cuota: totalConDescuento,
        pago_inicial: pagoInicial,
        restante,
        num_meses: numMeses,
        mensualidad,
        mes_fin: mes_fin || "Mayo",
        cancel_at: cancelDate.toISOString()
      }
    });

  } catch (error) {
    console.error('[stripeSubscription] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});