// Envía un email de confirmación al inscrito de una landing del constructor de páginas
// y opcionalmente notifica a los admins del club.
// Endpoint público (sin auth) — sólo acepta envíos vinculados a una LandingSubmission real.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px 16px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;">
<div style="color:#cbd5e1;font-size:13px;font-weight:600;margin-bottom:16px;">Síguenos en nuestras redes</div>
<table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
<td style="padding:4px;"><a href="https://www.cdbustarviejo.com" style="text-decoration:none;"><img src="https://img.icons8.com/color/96/000000/domain.png" alt="Web" width="44" height="44" style="display:block;border:0;" /></a></td>
<td style="padding:4px;"><a href="https://www.instagram.com/cdbustarviejo" style="text-decoration:none;"><img src="https://img.icons8.com/color/96/000000/instagram-new.png" alt="Instagram" width="44" height="44" style="display:block;border:0;" /></a></td>
<td style="padding:4px;"><a href="https://es-es.facebook.com/ilustrisimo.deportivobustarviejo" style="text-decoration:none;"><img src="https://img.icons8.com/color/96/000000/facebook-new.png" alt="Facebook" width="44" height="44" style="display:block;border:0;" /></a></td>
<td style="padding:4px;"><a href="https://t.me/cdbustarviejo" style="text-decoration:none;"><img src="https://img.icons8.com/color/96/000000/telegram-app.png" alt="Telegram" width="44" height="44" style="display:block;border:0;" /></a></td>
</tr></table>
<div style="color:#94a3b8;font-size:12px;line-height:1.6;margin-top:16px;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div>
</div>`;

async function resendSend({ apiKey, to, subject, html }) {
  const finalHtml = html.includes('www.cdbustarviejo.com')
    ? html
    : (html.includes('</body>') ? html.replace('</body>', SOCIAL_FOOTER + '</body>') : html + SOCIAL_FOOTER);

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
      html: finalHtml,
    })
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function buildUserEmail({ nombre, tituloLanding, mensajePersonalizado, color }) {
  const safeColor = color || '#ea580c';
  const intro = (mensajePersonalizado && mensajePersonalizado.trim())
    ? mensajePersonalizado
    : `Hemos recibido correctamente tu inscripción en <strong>${tituloLanding}</strong>. Nos pondremos en contacto contigo en breve con los siguientes pasos.`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
<div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
  <div style="background:linear-gradient(135deg, ${safeColor}, #15803d);padding:32px 24px;text-align:center;">
    <div style="font-size:42px;margin-bottom:8px;">✅</div>
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">¡Inscripción recibida!</h1>
  </div>
  <div style="padding:32px 24px;color:#0f172a;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hola <strong>${nombre || 'amigo/a'}</strong>,</p>
    <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 20px;">${intro}</p>
    <div style="background:#f8fafc;border-left:4px solid ${safeColor};padding:16px;border-radius:6px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#475569;">Si necesitas algo, responde a este correo o escríbenos a <a href="mailto:info@cdbustarviejo.com" style="color:${safeColor};text-decoration:none;">info@cdbustarviejo.com</a>.</p>
    </div>
    <p style="font-size:14px;color:#64748b;margin:20px 0 0;">¡Un saludo deportivo!<br><strong>Equipo CD Bustarviejo</strong></p>
  </div>
</div>
</body></html>`;
}

function buildAdminEmail({ nombre, email, telefono, tituloLanding, slug, datos }) {
  const filas = Object.entries(datos || {})
    .filter(([k]) => !k.endsWith('_count') && !['nombre', 'email', 'telefono'].includes(k))
    .slice(0, 40)
    .map(([k, v]) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;font-size:12px;">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;">${typeof v === 'object' ? JSON.stringify(v) : String(v)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
<div style="max-width:640px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
  <div style="background:#0f172a;padding:20px 24px;">
    <h1 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">📥 Nueva inscripción en "${tituloLanding}"</h1>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:12px;">Constructor de páginas · /l/${slug}</p>
  </div>
  <div style="padding:24px;color:#0f172a;">
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:14px;">
      <tr><td style="padding:6px 10px;font-weight:600;color:#475569;width:35%;">Nombre</td><td style="padding:6px 10px;color:#0f172a;">${nombre || '—'}</td></tr>
      <tr><td style="padding:6px 10px;font-weight:600;color:#475569;">Email</td><td style="padding:6px 10px;color:#0f172a;">${email || '—'}</td></tr>
      <tr><td style="padding:6px 10px;font-weight:600;color:#475569;">Teléfono</td><td style="padding:6px 10px;color:#0f172a;">${telefono || '—'}</td></tr>
    </table>
    ${filas ? `<h3 style="font-size:13px;color:#64748b;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Datos del formulario</h3>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">${filas}</table>` : ''}
  </div>
</div>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const { submissionId } = await req.json();
    if (!submissionId) {
      return Response.json({ error: 'submissionId requerido' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Recuperar la submission y la landing (con permisos de service role)
    const submission = await base44.asServiceRole.entities.LandingSubmission.get(submissionId);
    if (!submission) {
      return Response.json({ error: 'Submission no encontrada' }, { status: 404 });
    }

    const landing = await base44.asServiceRole.entities.LandingPage.get(submission.landing_page_id);
    const cfg = landing?.config || {};
    const formCfg = cfg.formulario || {};
    const tituloLanding = cfg.hero?.titulo || landing?.nombre || 'CD Bustarviejo';
    const color = cfg.branding?.color_principal || '#ea580c';

    const result = { user_email: null, admin_email: null };

    // 1) Email al inscrito
    if (submission.email) {
      const html = buildUserEmail({
        nombre: submission.nombre,
        tituloLanding,
        mensajePersonalizado: formCfg.email_confirmacion_texto,
        color,
      });
      const subject = formCfg.email_confirmacion_asunto || `Confirmación de inscripción · ${tituloLanding}`;
      const r = await resendSend({ apiKey: RESEND_API_KEY, to: submission.email, subject, html });
      result.user_email = { ok: r.ok, status: r.status, id: r.data?.id, error: r.ok ? null : (r.data?.message || r.data?.error) };
    }

    // 2) Notificación al admin (si está configurada en el formulario)
    const adminEmails = (formCfg.notificar_emails_admin || '')
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e && /@/.test(e));
    if (adminEmails.length > 0) {
      const html = buildAdminEmail({
        nombre: submission.nombre,
        email: submission.email,
        telefono: submission.telefono,
        tituloLanding,
        slug: submission.landing_slug,
        datos: submission.datos,
      });
      const subject = `📥 Nueva inscripción · ${tituloLanding}`;
      const results = [];
      for (const to of adminEmails) {
        const r = await resendSend({ apiKey: RESEND_API_KEY, to, subject, html });
        results.push({ to, ok: r.ok, status: r.status, error: r.ok ? null : (r.data?.message || r.data?.error) });
      }
      result.admin_email = results;
    }

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('[sendLandingConfirmation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});