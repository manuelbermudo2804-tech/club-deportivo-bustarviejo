import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// Crea una sesión de Stripe Checkout para una inscripción a una landing.
// PÚBLICO (sin auth). Crea la submission en estado "pendiente_pago" y
// devuelve la URL de Stripe para redirigir al usuario.
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      landing_page_id,
      landing_slug,
      nombre,
      email,
      telefono,
      datos,
      archivos,
      opcion_id,
      cantidad,
      cupon_codigo,
      user_agent,
      referrer,
      origin,
      utm_source,
      utm_medium,
      utm_campaign,
      honeypot,
    } = body || {};

    if (honeypot && honeypot.length > 0) {
      // Bot detectado: devolvemos OK falso para no levantar sospechas
      return Response.json({ url: origin || '/', session_id: 'bot' });
    }

    if (!landing_page_id || !email) {
      return Response.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const page = await base44.asServiceRole.entities.LandingPage.get(landing_page_id);
    if (!page) return Response.json({ error: 'Página no encontrada' }, { status: 404 });
    if (page.estado === 'cerrada' || page.estado === 'archivada') {
      return Response.json({ error: 'Inscripciones cerradas' }, { status: 403 });
    }

    const pagoCfg = page.config?.pago || {};
    if (!pagoCfg.activo) {
      return Response.json({ error: 'Esta página no tiene pago activado' }, { status: 400 });
    }

    const opciones = pagoCfg.opciones || [];
    const opcion = opciones.find((o) => o.id === opcion_id) || opciones[0];
    if (!opcion || !opcion.nombre || !(opcion.precio > 0)) {
      return Response.json({ error: 'Opción de pago no válida' }, { status: 400 });
    }

    const qty = Math.max(1, Math.min(parseInt(cantidad) || 1, opcion.permitir_cantidad ? (opcion.cantidad_max || 100) : 1));
    let importeTotal = Number((opcion.precio * qty).toFixed(2));

    // Aplicar cupón si se ha enviado y es válido
    let descuento = 0;
    let cupon = null;
    if (cupon_codigo) {
      const cupones = page.config?.cupones || [];
      cupon = cupones.find((c) => c.codigo && c.codigo.toLowerCase() === String(cupon_codigo).toLowerCase());
      if (cupon && cupon.activo !== false &&
          (!cupon.max_usos || (cupon.usos || 0) < cupon.max_usos) &&
          (!cupon.fecha_expiracion || new Date(cupon.fecha_expiracion) >= new Date())) {
        if (cupon.tipo === 'porcentaje') descuento = Math.min(importeTotal, importeTotal * (Number(cupon.valor) / 100));
        else descuento = Math.min(importeTotal, Number(cupon.valor) || 0);
        descuento = Number(descuento.toFixed(2));
        importeTotal = Number((importeTotal - descuento).toFixed(2));
      } else {
        cupon = null; // inválido, ignorar
      }
    }

    // Si el cupón deja el precio en 0, no podemos cobrar con Stripe — registramos como pagado directo
    if (importeTotal <= 0) {
      const submission = await base44.asServiceRole.entities.LandingSubmission.create({
        landing_page_id,
        landing_slug: landing_slug || page.slug || '',
        nombre: nombre || '',
        email: email || '',
        telefono: telefono || '',
        datos: datos || {},
        archivos: archivos || [],
        estado: 'nuevo',
        user_agent: user_agent || '',
        referrer: referrer || '',
        utm_source: utm_source || '',
        utm_medium: utm_medium || '',
        utm_campaign: utm_campaign || '',
        pago_estado: 'pagado',
        pago_opcion_nombre: opcion.nombre,
        pago_precio_unitario: opcion.precio,
        pago_cantidad: qty,
        pago_importe_total: 0,
        pago_descuento_codigo: cupon?.codigo || '',
        pago_descuento_importe: descuento,
        pago_fecha: new Date().toISOString(),
      });
      try { base44.asServiceRole.functions.invoke('sendLandingConfirmation', { submissionId: submission.id }).catch(() => {}); } catch {}
      return Response.json({ url: `${(origin || '').replace(/\/$/, '')}/l/${page.slug}?pago=ok&sid=free_${submission.id}`, session_id: `free_${submission.id}`, free: true });
    }

    // Validar plazas antes de crear la sesión (cuentan submissions pagadas + pendientes recientes)
    const plazasMax = parseInt(page?.config?.limites?.plazas_maximas) || 0;
    if (plazasMax > 0) {
      const subs = await base44.asServiceRole.entities.LandingSubmission.filter({ landing_page_id });
      const cuentan = (subs || []).filter((s) => {
        if (s.estado === 'cancelado') return false;
        // Pagadas siempre cuentan
        if (s.pago_estado === 'pagado') return true;
        // Pendientes recientes (últimos 30 min) bloquean plaza temporalmente
        if (s.pago_estado === 'pendiente') {
          const created = new Date(s.created_date).getTime();
          return Date.now() - created < 30 * 60 * 1000;
        }
        return s.estado !== 'pendiente_pago';
      }).length;
      if (cuentan >= plazasMax) {
        return Response.json({
          error: page?.config?.limites?.mensaje_plazas_agotadas || 'Lo sentimos, ya no quedan plazas disponibles.',
          plazas_agotadas: true,
        }, { status: 409 });
      }
    }

    // Crear submission en estado pendiente_pago
    const submission = await base44.asServiceRole.entities.LandingSubmission.create({
      landing_page_id,
      landing_slug: landing_slug || page.slug || '',
      nombre: nombre || '',
      email: email || '',
      telefono: telefono || '',
      datos: datos || {},
      archivos: archivos || [],
      estado: 'pendiente_pago',
      user_agent: user_agent || '',
      referrer: referrer || '',
      utm_source: utm_source || '',
      utm_medium: utm_medium || '',
      utm_campaign: utm_campaign || '',
      pago_estado: 'pendiente',
      pago_opcion_nombre: opcion.nombre,
      pago_precio_unitario: opcion.precio,
      pago_cantidad: qty,
      pago_importe_total: importeTotal,
      pago_descuento_codigo: cupon?.codigo || '',
      pago_descuento_importe: descuento,
    });

    // Crear sesión Stripe Checkout
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      return Response.json({ error: 'Stripe no configurado' }, { status: 500 });
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    const baseUrl = (origin || '').replace(/\/$/, '');
    const successUrl = `${baseUrl}/l/${page.slug}?pago=ok&sid={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/l/${page.slug}?pago=cancelado`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: false,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: opcion.nombre,
            description: opcion.descripcion || undefined,
          },
          unit_amount: Math.round(opcion.precio * 100),
        },
        quantity: qty,
      }],
      metadata: {
        tipo: 'landing_submission',
        landing_page_id,
        landing_slug: page.slug || '',
        submission_id: submission.id,
        opcion_id: opcion.id,
        opcion_nombre: opcion.nombre,
        cantidad: String(qty),
        importe_total: String(importeTotal),
        user_email: email,
      },
    });

    // Guardar session id en la submission
    try {
      await base44.asServiceRole.entities.LandingSubmission.update(submission.id, {
        pago_stripe_session_id: session.id,
      });
    } catch {}

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('landingPaymentCheckout error:', error);
    return Response.json({ error: error.message || 'Error creando sesión de pago' }, { status: 500 });
  }
});