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
    let numMeses = mesFinNum >= 9 ? mesFinNum - 9 + 1 : (12 - 9 + 1) + mesFinNum;
    if (numMeses < 1) numMeses = 1;

    const mensualidad = Math.round((restante / numMeses) * 100) / 100;
    const mensualidadCentimos = Math.round(mensualidad * 100);

    // Fecha de inicio de la suscripción: 1 de septiembre
    const now = new Date();
    const year = now.getFullYear();
    const septYear = now.getMonth() >= 8 ? year : (now.getMonth() < 6 ? year : year); 
    // Si estamos en jun-ago, sept es del mismo año. Si estamos en sept+, sept ya pasó.
    const subscriptionStartDate = new Date(septYear, 8, 1); // 1 de septiembre
    if (subscriptionStartDate <= now) {
      // Si sept ya pasó, empezar el siguiente mes
      subscriptionStartDate.setMonth(now.getMonth() + 1, 1);
    }

    // Fecha de cancelación automática: último día del mes_fin
    let cancelYear = mesFinNum >= 9 ? year : year + 1;
    if (now.getMonth() + 1 > 8 && mesFinNum < 9) {
      cancelYear = year + 1;
    }
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

    // 2. Crear precio recurrente para las mensualidades
    const product = await stripe.products.create({
      name: `Mensualidad ${jugador_nombre} - ${categoria} (${temporada})`,
      metadata: { jugador_id, jugador_nombre, categoria, temporada }
    });

    const recurringPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: mensualidadCentimos,
      currency: 'eur',
      recurring: { interval: 'month' }
    });

    // 3. Usamos modo "payment" para cobrar el pago inicial inmediatamente.
    //    Después, al recibir el webhook, crearemos la suscripción con la tarjeta guardada.
    //    Para esto necesitamos guardar la tarjeta: setup_future_usage implícito en payment mode.
    
    // Alternativa más simple: usar modo subscription con trial hasta septiembre
    // El primer cobro es inmediato (pago inicial como setup_fee via line_item one-off NO funciona en sub mode).
    
    // SOLUCIÓN: Usar Checkout en modo "payment" con setup_future_usage para guardar tarjeta,
    // y crear la suscripción programada desde el webhook.
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id,
      payment_intent_data: {
        setup_future_usage: 'off_session', // Guarda la tarjeta para cobros futuros
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Inscripción ${jugador_nombre} - ${categoria} (${pctInicial}% inicial)`,
              description: `Pago inicial del Plan Mensual. Después: ${numMeses}x ${mensualidad}€/mes (Sept-${mes_fin || 'Mayo'})`
            },
            unit_amount: Math.round(pagoInicial * 100),
          },
          quantity: 1,
        }
      ],
      metadata: {
        tipo: 'plan_mensual_inscripcion',
        jugador_id,
        jugador_nombre,
        categoria,
        temporada,
        pago_inicial: String(pagoInicial),
        mensualidad: String(mensualidad),
        num_meses: String(numMeses),
        mes_fin: mes_fin || 'Mayo',
        total_cuota: String(totalConDescuento),
        user_email: user.email,
        recurring_price_id: recurringPrice.id,
        cancel_at: String(cancelAtTimestamp),
        subscription_start: subscriptionStartDate.toISOString()
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
        cancel_at: cancelDate.toISOString(),
        subscription_start: subscriptionStartDate.toISOString()
      }
    });

  } catch (error) {
    console.error('[stripeSubscription] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});