import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  'mailto:info@cdbustarviejo.com',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;"><div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div><div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div></div>`;

async function sendViaResend(to, subject, html) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return;
  const finalHtml = html.includes('www.cdbustarviejo.com') ? html : html + SOCIAL_FOOTER;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: [to], subject, html: finalHtml })
  });
  if (!resp.ok) console.error(`[RESEND] Error ${resp.status}:`, await resp.text().catch(() => ''));
}

async function sendPush(base44, email, title, body, url) {
  const subs = await base44.asServiceRole.entities.PushSubscription.filter({ usuario_email: email, activa: true });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
        JSON.stringify({ title, body, url: url || '/ParentCallups', tag: `callup-reminder-${Date.now()}` })
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false });
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fecha de mañana (zona horaria España)
    const now = new Date();
    const madridOffset = 1; // CET +1 (CEST +2 en verano, pero simplificamos)
    const utcHours = now.getUTCHours();
    // Calcular fecha en Madrid
    const madridNow = new Date(now.getTime() + madridOffset * 60 * 60 * 1000);
    const tomorrow = new Date(madridNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10); // YYYY-MM-DD

    console.log(`[CallupReminder] Buscando convocatorias para mañana: ${tomorrowStr}`);

    // Buscar convocatorias publicadas y activas para mañana
    const allCallups = await base44.asServiceRole.entities.Convocatoria.filter({ publicada: true });
    const tomorrowCallups = allCallups.filter(c => 
      c.fecha_partido === tomorrowStr && 
      c.estado_convocatoria === 'activa' &&
      !c.cerrada
    );

    console.log(`[CallupReminder] Encontradas ${tomorrowCallups.length} convocatorias para mañana`);

    let totalPending = 0;
    let totalNotified = 0;

    for (const callup of tomorrowCallups) {
      const jugadores = Array.isArray(callup.jugadores_convocados) ? callup.jugadores_convocados : [];
      const pendientes = jugadores.filter(j => !j.confirmacion || j.confirmacion === 'pendiente');

      console.log(`[CallupReminder] ${callup.titulo}: ${pendientes.length} pendientes de ${jugadores.length}`);

      for (const j of pendientes) {
        const emailPadre = j.email_padre;
        if (!emailPadre) continue;

        totalPending++;

        // Enviar push
        const pushTitle = `⚠️ ¡Confirma la convocatoria!`;
        const pushBody = `${j.jugador_nombre}: ${callup.titulo} es MAÑANA a las ${callup.hora_partido || '??:??'}. Confirma asistencia.`;
        await sendPush(base44, emailPadre, pushTitle, pushBody, '/ParentCallups');

        // Enviar email
        const emailHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">⚠️</div>
  <div style="color:#fff;font-size:20px;font-weight:800;">¡EL PARTIDO ES MAÑANA!</div>
  <div style="color:rgba(255,255,255,0.9);font-size:13px;margin-top:4px;">Aún no has confirmado la asistencia</div>
</td></tr>
<tr><td style="padding:24px;">
  <p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
  <p style="color:#334155;font-size:14px;margin:0 0 16px;"><strong>${j.jugador_nombre}</strong> está convocado/a y necesitamos tu confirmación:</p>
  <div style="background:#fff7ed;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa;">
    <div style="font-weight:800;color:#c2410c;font-size:17px;margin-bottom:8px;">⚽ ${callup.titulo}</div>
    <div style="color:#9a3412;font-size:14px;line-height:1.8;">
      📅 ${callup.fecha_partido}<br>
      ⏰ Partido: ${callup.hora_partido || 'Por confirmar'}${callup.hora_concentracion ? `<br>🏃 Concentración: ${callup.hora_concentracion}` : ''}<br>
      📍 ${callup.ubicacion || 'Por confirmar'}${callup.local_visitante ? ` (${callup.local_visitante})` : ''}
    </div>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="https://app.cdbustarviejo.com/ParentCallups" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#c2410c);color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;">✅ CONFIRMAR AHORA</a>
  </div>
  <p style="color:#64748b;font-size:12px;text-align:center;margin:0;">Si no puedes asistir, entra también para indicarlo.</p>
</td></tr>
</table></td></tr></table></body></html>`;

        await sendViaResend(emailPadre, `⚠️ ¡MAÑANA! Confirma convocatoria de ${j.jugador_nombre}`, emailHtml);
        totalNotified++;
      }
    }

    console.log(`[CallupReminder] Resultado: ${totalPending} pendientes, ${totalNotified} notificados`);
    return Response.json({ success: true, callups: tomorrowCallups.length, pending: totalPending, notified: totalNotified });
  } catch (error) {
    console.error('[CallupReminder] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});