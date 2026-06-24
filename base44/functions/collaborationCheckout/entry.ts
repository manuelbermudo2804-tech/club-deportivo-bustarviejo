import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

// PÚBLICO (sin login). Lo llama el formulario de /Colabora.
// Objetivo clave: NO PERDER NINGÚN REGISTRO. Por eso:
//  1) Creamos SIEMPRE el CollaborationPayment ANTES de ir a Stripe (queda traza
//     aunque el pago se abandone o falle).
//  2) Registramos un evento público en el Centro de Diagnóstico (UploadDiagnostic)
//     para que sea auditable desde "Registro de errores y eventos".
async function logEvent(base44, payload) {
  try {
    await base44.asServiceRole.entities.UploadDiagnostic.create({
      event_type: payload.event_type || 'diagnostic_report',
      context: 'collaborationCheckout',
      error_message: payload.error_message ? String(payload.error_message).slice(0, 500) : undefined,
      user_email: payload.email || 'anónimo',
      page_path: '/Colabora',
      user_agent: payload.user_agent ? String(payload.user_agent).slice(0, 500) : undefined,
      severity: payload.severity || 'info',
      extra_data: payload.extra_data || {},
    });
  } catch (e) {
    console.warn('[collaborationCheckout] log event failed:', e?.message);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      nombre_comercio = '',
      contacto_nombre = '',
      email = '',
      telefono = '',
      website_url = '',
      logo_url = '',
      nivel_nombre = '',
      importe = 0,
      origin = '',
      honeypot = '',
      user_agent = '',
    } = body || {};

    // Anti-bot: solo bloqueamos si el honeypot tiene una URL (autocompletado del navegador no mete URLs)
    if (honeypot && /https?:\/\/|www\./i.test(honeypot)) {
      return Response.json({ error: 'Solicitud no válida.' }, { status: 400 });
    }

    const importeNum = Number(importe) || 0;
    if (!nombre_comercio || !email) {
      return Response.json({ error: 'El nombre del negocio y el email son obligatorios.' }, { status: 400 });
    }
    if (!(importeNum > 0)) {
      return Response.json({ error: 'Indica un importe válido.' }, { status: 400 });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      return Response.json({ error: 'Stripe no configurado' }, { status: 500 });
    }

    // 1) Crear SIEMPRE el registro primero (traza garantizada)
    const record = await base44.asServiceRole.entities.CollaborationPayment.create({
      nombre_comercio,
      contacto_nombre,
      email,
      telefono,
      website_url,
      logo_url,
      nivel_nombre: nivel_nombre || 'Colaborador',
      importe: importeNum,
      estado_pago: 'pendiente',
    });

    await logEvent(base44, {
      event_type: 'diagnostic_report',
      email,
      user_agent,
      severity: 'info',
      extra_data: { fase: 'checkout_iniciado', record_id: record.id, nombre_comercio, importe: importeNum, nivel_nombre },
    });

    // 2) Crear la sesión de Stripe
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const baseUrl = origin || 'https://app.cdbustarviejo.com';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      success_url: `${baseUrl}/Colabora?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/Colabora?canceled=1`,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Colaboración CD Bustarviejo · ${nivel_nombre || 'Colaborador'}` },
          unit_amount: Math.round(importeNum * 100),
        },
        quantity: 1,
      }],
      metadata: {
        tipo: 'collaboration_payment',
        record_id: record.id,
        nombre_comercio,
        importe: String(importeNum),
      },
    });

    // Guardar el session_id en el registro para enlazarlo
    await base44.asServiceRole.entities.CollaborationPayment.update(record.id, {
      stripe_session_id: session.id,
    });

    return Response.json({ ok: true, url: session.url, record_id: record.id });
  } catch (error) {
    console.error('collaborationCheckout error:', error?.message);
    await logEvent(base44, {
      event_type: 'app_error',
      severity: 'error',
      error_message: error?.message || 'Error',
      extra_data: { fase: 'checkout_error' },
    });
    return Response.json({ error: error?.message || 'Error al iniciar el pago.' }, { status: 500 });
  }
});