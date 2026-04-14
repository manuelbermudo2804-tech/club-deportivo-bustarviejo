import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;">
<div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div>
<div style="margin-bottom:14px;"><a href="https://www.facebook.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Facebook">📘</a><a href="https://www.instagram.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Instagram">📸</a></div>
<div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div>
</div>`;

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
      html: html + SOCIAL_FOOTER
    })
  });
  const data = await response.json();
  if (!response.ok) {
    console.warn(`[submitSponsorInterest] Email to ${to} failed:`, data);
  } else {
    console.log(`[submitSponsorInterest] ✅ Email sent to ${to}, ID:`, data.id);
  }
  return { ok: response.ok, data };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { posicion, nombre_comercio, nombre_contacto, email, telefono } = await req.json();

    if (!posicion || !nombre_comercio || !nombre_contacto || !email || !telefono) {
      return Response.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    // Crear registro con service role (es página pública, no hay usuario autenticado)
    await base44.asServiceRole.entities.SponsorInterest.create({
      posicion,
      nombre_comercio,
      nombre_contacto,
      email,
      telefono,
      estado: 'pendiente'
    });

    // Contar interesados en esa posición
    const allInterests = await base44.asServiceRole.entities.SponsorInterest.filter({ posicion });
    const count = allInterests.length;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (RESEND_API_KEY) {
      // 1) Email al club
      try {
        await sendResendEmail(
          RESEND_API_KEY,
          'info@cdbustarviejo.com',
          `🏟️ Nuevo interesado en patrocinio: ${posicion}`,
          `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px 24px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:22px;">🏟️ Nuevo interesado en patrocinio</h1>
            </div>
            <div style="padding:24px;">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:13px;color:#9a3412;font-weight:700;">POSICIÓN SOLICITADA</p>
                <p style="margin:0;font-size:20px;font-weight:800;color:#c2410c;">${posicion}</p>
              </div>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;">Comercio</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${nombre_comercio}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Contacto</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${nombre_contacto}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#ea580c;font-weight:600;">${email}</a></td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Teléfono</td><td style="padding:8px 0;"><a href="tel:${telefono}" style="color:#ea580c;font-weight:600;">${telefono}</a></td></tr>
              </table>
              <div style="margin-top:16px;padding:12px;background:#f1f5f9;border-radius:8px;text-align:center;">
                <p style="margin:0;font-size:14px;color:#475569;">📊 Total interesados en <strong>"${posicion}"</strong>: <strong style="color:#ea580c;font-size:18px;">${count}</strong></p>
                ${count > 1 ? '<p style="margin:6px 0 0;color:#dc2626;font-weight:700;font-size:13px;">⚠️ Hay más de un interesado — se activará proceso de subasta</p>' : ''}
              </div>
            </div>
          </div>`
        );
      } catch (e) {
        console.warn('[submitSponsorInterest] Club email error:', e.message);
      }

      // 2) Email de confirmación al interesado
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
              <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 16px;">
                Hola <strong>${nombre_contacto}</strong>,
              </p>
              <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 20px;">
                Hemos recibido tu interés en patrocinar al <strong>CD Bustarviejo</strong>. Aquí tienes un resumen:
              </p>
              <div style="background:linear-gradient(135deg,#fff7ed,#fef3c7);border:2px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:20px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;width:120px;">📍 Posición</td><td style="padding:6px 0;font-weight:700;color:#c2410c;font-size:15px;">${posicion}</td></tr>
                  <tr><td style="padding:6px 0;color:#92400e;font-size:13px;font-weight:600;">🏪 Comercio</td><td style="padding:6px 0;color:#1e293b;font-weight:600;">${nombre_comercio}</td></tr>
                </table>
              </div>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">
                  <strong>📞 ¿Qué pasa ahora?</strong><br/>
                  Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo próximamente para concretar los detalles del patrocinio.
                </p>
              </div>
              <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">
                Si tienes cualquier duda, no dudes en escribirnos a 
                <a href="mailto:info@cdbustarviejo.com" style="color:#ea580c;font-weight:600;">info@cdbustarviejo.com</a>
                o llamarnos al <a href="tel:+34609082733" style="color:#ea580c;font-weight:600;">609 08 27 33</a>.
              </p>
            </div>
            <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#94a3b8;">Colaborar con el CD Bustarviejo = visibilidad real entre familias y deportistas 🧡💚</p>
            </div>
          </div>`
        );
      } catch (e) {
        console.warn('[submitSponsorInterest] Interesado email error:', e.message);
      }
    } else {
      console.warn('[submitSponsorInterest] RESEND_API_KEY not set, skipping emails');
    }

    return Response.json({ success: true, count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});