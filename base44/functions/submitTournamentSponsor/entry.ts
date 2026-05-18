import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TORNEO_LABELS = {
  padel: '🎾 Torneo de Pádel',
  futbol_sala: '⚽ Torneo de Fútbol Sala',
  pack_ambos: '🔥 Pack Ambos Torneos (Pádel + Fútbol Sala)'
};

const TORNEO_PRECIOS = {
  padel: '400 €',
  futbol_sala: '400 €',
  pack_ambos: '700 €'
};

async function sendResendEmail(apiKey, to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
      to: [to],
      subject,
      html
    })
  });
  const data = await response.json();
  if (!response.ok) {
    console.warn(`[submitTournamentSponsor] Email to ${to} failed:`, data);
  }
  return { ok: response.ok, data };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { torneo, nombre_empresa, nombre_contacto, email, telefono, mensaje } = await req.json();

    if (!torneo || !nombre_empresa || !nombre_contacto || !email || !telefono) {
      return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (!TORNEO_LABELS[torneo]) {
      return Response.json({ error: 'Torneo no válido' }, { status: 400 });
    }

    await base44.asServiceRole.entities.TournamentSponsorInterest.create({
      torneo,
      nombre_empresa,
      nombre_contacto,
      email,
      telefono,
      mensaje: mensaje || '',
      estado: 'pendiente'
    });

    const torneoLabel = TORNEO_LABELS[torneo];
    const precio = TORNEO_PRECIOS[torneo];
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (RESEND_API_KEY) {
      // Email al club
      try {
        await sendResendEmail(
          RESEND_API_KEY,
          'info@cdbustarviejo.com',
          `🏆 Interés patrocinio torneo: ${nombre_empresa}`,
          `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px 24px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:22px;">🏆 Nuevo interesado · Patrocinio Torneos</h1>
            </div>
            <div style="padding:24px;">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:13px;color:#9a3412;font-weight:700;">TORNEO SOLICITADO</p>
                <p style="margin:0;font-size:18px;font-weight:800;color:#c2410c;">${torneoLabel}</p>
                <p style="margin:6px 0 0;font-size:14px;color:#9a3412;">Precio: <strong>${precio}</strong></p>
              </div>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;">Empresa</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${nombre_empresa}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Contacto</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${nombre_contacto}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#ea580c;font-weight:600;">${email}</a></td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Teléfono</td><td style="padding:8px 0;"><a href="tel:${telefono}" style="color:#ea580c;font-weight:600;">${telefono}</a></td></tr>
                ${mensaje ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">Mensaje</td><td style="padding:8px 0;color:#1e293b;">${mensaje.replace(/\n/g, '<br/>')}</td></tr>` : ''}
              </table>
            </div>
          </div>`
        );
      } catch (e) {
        console.warn('[submitTournamentSponsor] Club email error:', e.message);
      }

      // Email de confirmación al interesado
      try {
        await sendResendEmail(
          RESEND_API_KEY,
          email,
          `✅ Hemos recibido tu interés · CD Bustarviejo`,
          `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:linear-gradient(135deg,#ea580c,#15803d);padding:32px 24px;text-align:center;">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" style="width:70px;height:70px;border-radius:50%;border:3px solid #fff;margin-bottom:12px;" />
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">¡Gracias por tu interés!</h1>
              <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Tu solicitud ha sido registrada correctamente</p>
            </div>
            <div style="padding:28px 24px;">
              <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 16px;">Hola <strong>${nombre_contacto}</strong>,</p>
              <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 20px;">
                Hemos recibido tu interés en ser <strong>Patrocinador Oficial</strong> del <strong>CD Bustarviejo</strong>. Aquí tienes un resumen:
              </p>
              <div style="background:linear-gradient(135deg,#fff7ed,#fef3c7);border:2px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:20px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;width:120px;">🏆 Torneo</td><td style="padding:6px 0;font-weight:700;color:#c2410c;font-size:15px;">${torneoLabel}</td></tr>
                  <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">💰 Precio</td><td style="padding:6px 0;color:#1e293b;font-weight:700;">${precio}</td></tr>
                  <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">🏪 Empresa</td><td style="padding:6px 0;color:#1e293b;font-weight:600;">${nombre_empresa}</td></tr>
                </table>
              </div>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">
                  <strong>📞 ¿Qué pasa ahora?</strong><br/>
                  Nos pondremos en contacto contigo en breve para concretar los detalles del patrocinio y reservar la plaza exclusiva.
                </p>
              </div>
              <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">
                Si tienes cualquier duda: 
                <a href="mailto:info@cdbustarviejo.com" style="color:#ea580c;font-weight:600;">info@cdbustarviejo.com</a>
                · <a href="tel:+34609082733" style="color:#ea580c;font-weight:600;">609 08 27 33</a>.
              </p>
            </div>
            <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#94a3b8;">Tu marca, en los torneos del CD Bustarviejo 🧡💚</p>
            </div>
          </div>`
        );
      } catch (e) {
        console.warn('[submitTournamentSponsor] Confirmation email error:', e.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[submitTournamentSponsor] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});