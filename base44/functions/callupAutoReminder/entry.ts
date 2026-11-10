import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

// Push a través del motor central (onPushTrigger): campana + registro de entrega.
async function enginePush(base44, emails, title, body, url, tag, extra = {}) {
  const list = [...new Set((emails || []).filter(Boolean))];
  if (!list.length) return { sent: 0, failed: 0 };
  const raw = new TextEncoder().encode(Deno.env.get('VAPID_PRIVATE_KEY') || '');
  const internal_key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', raw))).map(b => b.toString(16).padStart(2, '0')).join('');
  try {
    const res = await base44.asServiceRole.functions.invoke('onPushTrigger', { direct: { emails: list, title, body, url, tag, ...extra }, internal_key });
    return res?.data || { sent: 0, failed: 0 };
  } catch (e) { console.error('[push] motor central:', e.message); return { sent: 0, failed: 0 }; }
}

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


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fecha de mañana (zona horaria España - correcta con DST)
    function getMadridDate(daysFromNow = 0) {
      const now = new Date();
      const madrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
      madrid.setDate(madrid.getDate() + daysFromNow);
      return madrid.toISOString().slice(0, 10);
    }
    const tomorrowStr = getMadridDate(1);
    const todayStr = getMadridDate(0);

    // v2 — Ventana horaria razonable: solo avisamos por la tarde (16:00–21:00 Madrid).
    // El workflow corre cada hora, así evitamos avisos de madrugada.
    const madridHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }), 10);
    if (madridHour < 16 || madridHour > 21) {
      console.log(`[CallupReminder] Fuera de ventana horaria (${madridHour}h Madrid) — no se envía nada`);
      return Response.json({ success: true, skipped: 'outside_window', hour: madridHour });
    }

    console.log(`[CallupReminder] Buscando convocatorias para mañana: ${tomorrowStr}`);

    // Buscar convocatorias publicadas y activas para mañana
    let allCallupsRaw = await base44.asServiceRole.entities.Convocatoria.filter({ publicada: true });
    if (!Array.isArray(allCallupsRaw)) {
      if (typeof allCallupsRaw === 'string') {
        try { allCallupsRaw = JSON.parse(allCallupsRaw); } catch { allCallupsRaw = []; }
      } else {
        allCallupsRaw = allCallupsRaw?.results || allCallupsRaw?.items || [];
      }
    }
    if (!Array.isArray(allCallupsRaw)) allCallupsRaw = [];
    const tomorrowCallups = allCallupsRaw.filter(c => 
      c.fecha_partido === tomorrowStr && 
      c.estado_convocatoria === 'activa' &&
      !c.cerrada &&
      // Un solo recordatorio por convocatoria y día
      c.recordatorio_confirmacion_fecha !== todayStr
    );

    console.log(`[CallupReminder] Encontradas ${tomorrowCallups.length} convocatorias para mañana`);

    let totalPending = 0;
    let totalNotified = 0;

    // Cargar todos los Player una vez para resolver tutor_2 y acceso menor
    let allPlayers = [];
    try {
      allPlayers = await base44.asServiceRole.entities.Player.list();
      if (!Array.isArray(allPlayers)) allPlayers = [];
    } catch { allPlayers = []; }

    for (const callup of tomorrowCallups) {
      const jugadores = Array.isArray(callup.jugadores_convocados) ? callup.jugadores_convocados : [];
      const pendientes = jugadores.filter(j => !j.confirmacion || j.confirmacion === 'pendiente');

      console.log(`[CallupReminder] ${callup.titulo}: ${pendientes.length} pendientes de ${jugadores.length}`);

      for (const j of pendientes) {
        // Recopilar todos los emails relacionados con el jugador (padre, tutor_2, menor con acceso)
        const playerData = allPlayers.find(p => p.id === j.jugador_id);
        const emails = new Set();
        if (j.email_padre) emails.add(j.email_padre);
        if (playerData?.email_tutor_2) emails.add(playerData.email_tutor_2);
        if (!j.email_padre && j.email_jugador) emails.add(j.email_jugador);
        if (playerData?.acceso_menor_email && playerData?.acceso_menor_autorizado && !playerData?.acceso_menor_revocado) {
          emails.add(playerData.acceso_menor_email);
        }
        if (emails.size === 0) continue;

        const emailPadre = [...emails][0]; // mantener variable para compatibilidad

        totalPending++;

        // Enviar push a todos los emails relacionados
        const pushTitle = `⚠️ ¡Confirma la convocatoria!`;
        const pushBody = `${j.jugador_nombre}: ${callup.titulo} es MAÑANA a las ${callup.hora_partido || '??:??'}. Confirma asistencia.`;
        await enginePush(base44, [...emails], pushTitle, pushBody, '/ParentCallups',
          `callup-reminder-${callup.id}-${j.jugador_id || j.jugador_nombre}-${todayStr}`, { source: 'callupAutoReminder' });

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

        // Enviar email a todos los destinatarios (padre, tutor_2, menor con acceso)
        for (const e of emails) {
          await sendViaResend(e, `⚠️ ¡MAÑANA! Confirma convocatoria de ${j.jugador_nombre}`, emailHtml);
        }
        totalNotified++;
      }

      // Marcar la convocatoria como avisada hoy (aunque no hubiera pendientes)
      try {
        await base44.asServiceRole.entities.Convocatoria.update(callup.id, {
          recordatorio_confirmacion_fecha: todayStr
        });
      } catch (e) {
        console.error('[CallupReminder] No se pudo marcar recordatorio enviado:', e?.message);
      }
    }

    console.log(`[CallupReminder] Resultado: ${totalPending} pendientes, ${totalNotified} notificados`);
    return Response.json({ success: true, callups: tomorrowCallups.length, pending: totalPending, notified: totalNotified });
  } catch (error) {
    console.error('[CallupReminder] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});