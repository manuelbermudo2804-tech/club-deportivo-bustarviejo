import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;">
<div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div>
<div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div>
</div>`;

async function sendResendEmail(apiKey, to, subject, html) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
        to: [to],
        subject,
        html: html + SOCIAL_FOOTER,
      }),
    });
  } catch (e) {
    console.warn(`[collaborationConfirm] Email to ${to} failed:`, e.message);
  }
}

// PÚBLICO. El cliente lo llama al volver de Stripe. Verifica el pago, marca el
// registro como pagado y crea el Sponsor en estado pendiente (activo:false) para
// que el club lo revise y active el banner con 1 clic. Idempotente.
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = (body.session_id || '').toString();
    if (!sessionId) return Response.json({ error: 'session_id requerido' }, { status: 400 });

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) return Response.json({ error: 'Stripe no configurado' }, { status: 500 });

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.metadata?.tipo !== 'collaboration_payment') {
      return Response.json({ error: 'Sesión inválida' }, { status: 400 });
    }

    const recordId = session.metadata?.record_id;
    if (!recordId) return Response.json({ error: 'registro no encontrado' }, { status: 404 });

    const record = await base44.asServiceRole.entities.CollaborationPayment.get(recordId);
    if (!record) return Response.json({ error: 'registro no existe' }, { status: 404 });

    if (record.stripe_session_id && record.stripe_session_id !== sessionId) {
      return Response.json({ error: 'Sesión no coincide' }, { status: 403 });
    }

    if (record.estado_pago === 'pagado') {
      return Response.json({ ok: true, already_paid: true });
    }

    if (session.payment_status !== 'paid') {
      return Response.json({ ok: false, paid: false, status: session.payment_status });
    }

    // Crear el Sponsor en estado PENDIENTE (activo:false) para revisión del club
    const hoy = new Date();
    const finVigencia = new Date(hoy);
    finVigencia.setFullYear(finVigencia.getFullYear() + 1);
    const toDate = (d) => d.toISOString().split('T')[0];

    const sponsor = await base44.asServiceRole.entities.Sponsor.create({
      nombre: record.nombre_comercio,
      logo_url: record.logo_url || '',
      website_url: record.website_url || '',
      activo: false,
      nivel_patrocinio: 'Colaborador',
      paquete: 'Personalizado',
      precio_anual: record.importe,
      fecha_inicio: toDate(hoy),
      fecha_fin: toDate(finVigencia),
      contacto_nombre: record.contacto_nombre || '',
      contacto_email: record.email || '',
      contacto_telefono: record.telefono || '',
      beneficios_acordados: record.nivel_nombre,
      notas: `Alta automática vía /Colabora (pago con tarjeta). Pendiente de revisar logo y activar banner.`,
    });

    await base44.asServiceRole.entities.CollaborationPayment.update(recordId, {
      estado_pago: 'pagado',
      stripe_payment_intent: session.payment_intent || '',
      fecha_pago: new Date().toISOString(),
      sponsor_id: sponsor.id,
    });

    // Traza auditable en el Centro de Diagnóstico ("Registro de errores y eventos")
    try {
      await base44.asServiceRole.entities.UploadDiagnostic.create({
        event_type: 'diagnostic_report',
        context: 'collaborationConfirm',
        user_email: record.email || 'anónimo',
        page_path: '/Colabora',
        severity: 'info',
        extra_data: { fase: 'pago_confirmado', record_id: recordId, sponsor_id: sponsor.id, nombre_comercio: record.nombre_comercio, importe: record.importe },
      });
    } catch (e) {
      console.warn('[collaborationConfirm] log event failed:', e?.message);
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      // Email al colaborador
      await sendResendEmail(
        RESEND_API_KEY,
        record.email,
        `✅ ¡Gracias por colaborar con el CD Bustarviejo!`,
        `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:linear-gradient(135deg,#ea580c,#15803d);padding:32px 24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">¡Gracias por colaborar! 🧡💚</h1>
          </div>
          <div style="padding:28px 24px;">
            <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 16px;">Hola <strong>${record.contacto_nombre || record.nombre_comercio}</strong>,</p>
            <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 20px;">Hemos recibido tu pago correctamente. ¡Bienvenido como colaborador del <strong>CD Bustarviejo</strong>!</p>
            <div style="background:linear-gradient(135deg,#fff7ed,#fef3c7);border:2px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:20px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;width:130px;">🏪 Comercio</td><td style="padding:6px 0;font-weight:700;color:#1e293b;">${record.nombre_comercio}</td></tr>
                <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">📦 Colaboración</td><td style="padding:6px 0;color:#1e293b;font-weight:600;">${record.nivel_nombre}</td></tr>
                <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">💶 Importe</td><td style="padding:6px 0;font-weight:700;color:#c2410c;">${record.importe}€</td></tr>
              </table>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;">
              <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;"><strong>📍 ¿Qué pasa ahora?</strong><br/>Nuestro equipo revisará tu logo y activará tu banner en la app y la web del club en las próximas horas. ¡Pronto te verán todas las familias!</p>
            </div>
          </div>
        </div>`
      );
      // Email al club
      await sendResendEmail(
        RESEND_API_KEY,
        'info@cdbustarviejo.com',
        `💶 Nuevo colaborador pagado: ${record.nombre_comercio} (${record.importe}€)`,
        `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px 24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">💶 Nuevo colaborador pagado</h1>
          </div>
          <div style="padding:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:130px;">Comercio</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${record.nombre_comercio}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Colaboración</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${record.nivel_nombre}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Importe</td><td style="padding:8px 0;font-weight:700;color:#c2410c;">${record.importe}€</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Contacto</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${record.contacto_nombre || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 0;"><a href="mailto:${record.email}" style="color:#ea580c;">${record.email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Teléfono</td><td style="padding:8px 0;"><a href="tel:${record.telefono}" style="color:#ea580c;">${record.telefono || '—'}</a></td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Web</td><td style="padding:8px 0;">${record.website_url || '—'}</td></tr>
            </table>
            <div style="margin-top:16px;padding:12px;background:#fef9c3;border:1px solid #fde047;border-radius:8px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#854d0e;font-weight:700;">⚠️ Patrocinador creado como PENDIENTE. Revisa el logo y actívalo en Patrocinios para que aparezca el banner.</p>
            </div>
          </div>
        </div>`
      );
    }

    return Response.json({ ok: true, paid: true, sponsor_id: sponsor.id });
  } catch (error) {
    console.error('collaborationConfirm error:', error);
    return Response.json({ error: error.message || 'Error' }, { status: 500 });
  }
});