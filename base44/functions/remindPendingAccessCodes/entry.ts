import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CD Bustarviejo <noreply@cdbustarviejo.com>';
const APP_URL = 'https://app.cdbustarviejo.com';

async function sendWithResend(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error enviando email');
  }
  return data;
}

function buildReminderEmail({ code, nombreDestino, diasDesdeEnvio }) {
  const isFirstReminder = diasDesdeEnvio <= 2; // recordatorio suave día +1
  const titulo = isFirstReminder
    ? '👋 ¿Has visto nuestra invitación?'
    : '⏰ Tu código sigue esperándote';

  const intro = isFirstReminder
    ? `Hace un par de días pediste acceso a la app del <strong>CD Bustarviejo</strong> y te enviamos un código, pero vemos que aún no lo has usado. Te dejamos por aquí el código otra vez por si se te ha colado el primer email entre tantos correos.`
    : `Pediste acceso a la app del <strong>CD Bustarviejo</strong> hace unos días pero todavía no has entrado. <strong>Tu código sigue activo</strong> — entra cuando puedas, son 2 minutos y desbloqueas toda la gestión deportiva de tu hijo/a desde el móvil.`;

  const colorBanner = isFirstReminder ? '#ea580c' : '#dc2626';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:${colorBanner};padding:28px 24px;text-align:center;border-radius:16px 16px 0 0;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" width="64" height="64" style="border:3px solid #fff;border-radius:12px;display:block;margin:0 auto 12px;"/>
    <div style="font-size:22px;font-weight:bold;color:#fff;">CD BUSTARVIEJO</div>
    <div style="font-size:13px;color:#fff;margin-top:6px;font-weight:bold;">${titulo}</div>
  </td></tr>
  <tr><td style="background:#fff;padding:28px;">
    <p style="font-size:17px;color:#1e293b;margin:0 0 12px;">${nombreDestino ? `Hola <strong>${nombreDestino}</strong>,` : 'Hola,'}</p>
    <p style="font-size:15px;color:#475569;line-height:24px;margin:0 0 20px;">${intro}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="background:#1e293b;padding:28px 20px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:3px;margin-bottom:10px;">🔑 Tu código de acceso</div>
        <div style="font-family:'Courier New',monospace;font-size:40px;font-weight:bold;color:#f97316;letter-spacing:10px;margin-bottom:10px;">${code}</div>
        <div style="font-size:11px;color:#94a3b8;">🔒 Vinculado a tu email</div>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #bbf7d0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="background:#f0fdf4;padding:16px 20px;font-size:14px;color:#166534;line-height:24px;">
        <strong>1.</strong> Pulsa el botón verde de abajo<br/>
        <strong>2.</strong> Regístrate con <strong>este mismo email</strong><br/>
        <strong>3.</strong> Introduce el código: <strong style="color:#ea580c;">${code}</strong><br/>
        <strong>4.</strong> ¡Listo! Ya tendrás acceso completo
      </td></tr>
    </table>

    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="border-radius:10px;background:#16a34a;text-align:center;">
        <a href="${APP_URL}" target="_blank" style="display:inline-block;background:#16a34a;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:10px;">
          Activar mi código ahora →
        </a>
      </td></tr>
    </table>

    <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:18px;">
      ¿Algún problema con el código? Escríbenos a <a href="mailto:cdbustarviejo@gmail.com" style="color:#ea580c;text-decoration:none;">cdbustarviejo@gmail.com</a>
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px;border-radius:0 0 16px 16px;text-align:center;font-size:11px;color:#94a3b8;">
    CD Bustarviejo &bull; <a href="mailto:cdbustarviejo@gmail.com" style="color:#ea580c;text-decoration:none;">cdbustarviejo@gmail.com</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cualquiera puede invocar si es admin, o si es invocación automatizada (scheduled)
    // Las automations corren con permisos de servicio.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Solo recordatorios para códigos de tipo padre_nuevo (los que pidieron acceso ellos mismos)
    const pendingCodes = await base44.asServiceRole.entities.AccessCode.filter({
      estado: 'pendiente',
      tipo: 'padre_nuevo'
    });

    const now = new Date();
    let sent = 0;
    let skipped = 0;
    const details = [];

    for (const code of pendingCodes) {
      if (!code.fecha_envio) { skipped++; continue; }

      const fechaEnvio = new Date(code.fecha_envio);
      const msDesdeEnvio = now.getTime() - fechaEnvio.getTime();
      const diasDesdeEnvio = Math.floor(msDesdeEnvio / (1000 * 60 * 60 * 24));

      // Solo enviamos en día +1 y día +3 (ventana exacta)
      const enviarDia1 = diasDesdeEnvio === 1;
      const enviarDia3 = diasDesdeEnvio === 3;
      if (!enviarDia1 && !enviarDia3) { skipped++; continue; }

      // Reutilizamos avisos_expiracion_enviados con claves distintas para no duplicar
      const avisos = code.avisos_expiracion_enviados || [];
      const avisoKey = enviarDia1 ? 'r_d1' : 'r_d3';
      if (avisos.includes(avisoKey)) { skipped++; continue; }

      try {
        const html = buildReminderEmail({
          code: code.codigo,
          nombreDestino: code.nombre_destino,
          diasDesdeEnvio
        });
        const subject = enviarDia1
          ? `👋 CD Bustarviejo - ¿Has visto tu código? (${code.codigo})`
          : `⏰ CD Bustarviejo - Tu código sigue esperándote (${code.codigo})`;
        await sendWithResend(code.email, subject, html);

        await base44.asServiceRole.entities.AccessCode.update(code.id, {
          avisos_expiracion_enviados: [...avisos, avisoKey]
        });

        sent++;
        details.push({ email: code.email, nombre: code.nombre_destino, dia: diasDesdeEnvio });
        console.log(`[remindPendingAccessCodes] ✅ Recordatorio día+${diasDesdeEnvio} a ${code.email}`);
      } catch (err) {
        console.error(`[remindPendingAccessCodes] Error con ${code.email}:`, err.message);
      }
    }

    console.log(`[remindPendingAccessCodes] Resumen: ${sent} enviados, ${skipped} omitidos de ${pendingCodes.length} pendientes`);
    return Response.json({ success: true, sent, skipped, checked: pendingCodes.length, details });
  } catch (error) {
    console.error('[remindPendingAccessCodes] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});