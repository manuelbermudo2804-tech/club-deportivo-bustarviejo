import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';
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

// Ventanas de recordatorio: matches cuya hora_inicio cae entre [target-1h, target+1h] desde ahora
// Se ejecuta cada hora. Cada match cae como máximo una vez en cada ventana → sin duplicados.
const WINDOWS = [
  { hours: 72, label: '-72h', emoji: '📅', urgency: 'Recordatorio', subjectPrefix: 'Recordatorio' },
  { hours: 24, label: '-24h', emoji: '⚠️', urgency: '¡MAÑANA!', subjectPrefix: '⚠️ MAÑANA' },
  { hours: 6,  label: '-6h',  emoji: '🚨', urgency: '¡HOY EN POCAS HORAS!', subjectPrefix: '🚨 HOY' },
];

function getMatchTimestamp(callup) {
  const fecha = callup.fecha_partido;
  if (!fecha) return null;
  const hora = (callup.hora_concentracion || callup.hora_partido || '12:00').slice(0, 5);
  // Madrid TZ: aproximación +01:00/+02:00. Las ventanas son ±1h, así que el DST no descuadra.
  const month = parseInt(fecha.slice(5, 7), 10);
  const isDST = month >= 4 && month <= 10; // aprox
  const offset = isDST ? '+02:00' : '+01:00';
  const t = Date.parse(`${fecha}T${hora}:00${offset}`);
  return isNaN(t) ? null : t;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = Date.now();

    // Buscar TODAS las convocatorias publicadas y activas (futuras)
    let allCallupsRaw = await base44.asServiceRole.entities.Convocatoria.filter({ publicada: true });
    if (!Array.isArray(allCallupsRaw)) {
      if (typeof allCallupsRaw === 'string') {
        try { allCallupsRaw = JSON.parse(allCallupsRaw); } catch { allCallupsRaw = []; }
      } else {
        allCallupsRaw = allCallupsRaw?.results || allCallupsRaw?.items || [];
      }
    }
    if (!Array.isArray(allCallupsRaw)) allCallupsRaw = [];

    // Para cada callup, determinar si cae en alguna ventana AHORA
    const callupsByWindow = []; // { callup, window }
    for (const c of allCallupsRaw) {
      if (c.estado_convocatoria !== 'activa' || c.cerrada) continue;
      const matchTs = getMatchTimestamp(c);
      if (!matchTs || matchTs < now) continue;
      const hoursUntil = (matchTs - now) / 3600000;
      for (const w of WINDOWS) {
        if (Math.abs(hoursUntil - w.hours) <= 1) {
          callupsByWindow.push({ callup: c, window: w });
          break;
        }
      }
    }

    console.log(`[CallupReminder] ${callupsByWindow.length} convocatorias en ventana de recordatorio`);

    let totalPending = 0;
    let totalNotified = 0;

    let allPlayers = [];
    try {
      allPlayers = await base44.asServiceRole.entities.Player.list();
      if (!Array.isArray(allPlayers)) allPlayers = [];
    } catch { allPlayers = []; }

    for (const { callup, window } of callupsByWindow) {
      const jugadores = Array.isArray(callup.jugadores_convocados) ? callup.jugadores_convocados : [];
      const pendientes = jugadores.filter(j => !j.confirmacion || j.confirmacion === 'pendiente');

      console.log(`[CallupReminder] [${window.label}] ${callup.titulo}: ${pendientes.length} pendientes de ${jugadores.length}`);

      for (const j of pendientes) {
        const playerData = allPlayers.find(p => p.id === j.jugador_id);
        const emails = new Set();
        if (j.email_padre) emails.add(j.email_padre);
        if (playerData?.email_tutor_2) emails.add(playerData.email_tutor_2);
        if (!j.email_padre && j.email_jugador) emails.add(j.email_jugador);
        if (playerData?.acceso_menor_email && playerData?.acceso_menor_autorizado && !playerData?.acceso_menor_revocado) {
          emails.add(playerData.acceso_menor_email);
        }
        if (emails.size === 0) continue;

        totalPending++;

        const pushTitle = `${window.emoji} ${window.urgency} Confirma convocatoria`;
        const pushBody = `${j.jugador_nombre}: ${callup.titulo} (${callup.fecha_partido} ${callup.hora_partido || ''}). Confirma asistencia.`;
        for (const e of emails) {
          await sendPush(base44, e, pushTitle, pushBody, '/ParentCallups');
        }

        const emailHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">${window.emoji}</div>
  <div style="color:#fff;font-size:20px;font-weight:800;">${window.urgency}</div>
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

        for (const e of emails) {
          await sendViaResend(e, `${window.subjectPrefix} Confirma convocatoria de ${j.jugador_nombre}`, emailHtml);
        }
        totalNotified++;
      }
    }

    console.log(`[CallupReminder] Resultado: ${totalPending} pendientes, ${totalNotified} notificados`);
    return Response.json({ success: true, callups: callupsByWindow.length, pending: totalPending, notified: totalNotified });
  } catch (error) {
    console.error('[CallupReminder] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});