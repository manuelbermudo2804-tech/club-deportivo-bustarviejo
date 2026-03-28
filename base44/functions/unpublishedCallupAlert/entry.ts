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
        JSON.stringify({ title, body, url: url || '/CoachCallups', tag: `unpublished-callup-${Date.now()}` })
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false });
      }
    }
  }
}

// Get Madrid date string (YYYY-MM-DD) for today and upcoming days
function getMadridDate(daysFromNow = 0) {
  const now = new Date();
  // Spain is UTC+1 (CET) or UTC+2 (CEST)
  const madrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  madrid.setDate(madrid.getDate() + daysFromNow);
  return madrid.toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  const today = new Date(getMadridDate(0));
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = getMadridDate(0);
    const in3Days = getMadridDate(3);

    console.log(`[UnpublishedAlert] Checking drafts for matches between ${today} and ${in3Days}`);

    // Get all unpublished, active convocatorias
    let allConvocatorias = await base44.asServiceRole.entities.Convocatoria.list('-created_date', 200);
    if (!Array.isArray(allConvocatorias)) {
      console.log(`[UnpublishedAlert] Convocatoria.list returned non-array:`, typeof allConvocatorias, JSON.stringify(allConvocatorias).slice(0, 200));
      allConvocatorias = [];
    }
    console.log(`[UnpublishedAlert] Total convocatorias: ${allConvocatorias.length}`);
    const drafts = allConvocatorias.filter(c => c.publicada === false || c.publicada === null || c.publicada === undefined);
    console.log(`[UnpublishedAlert] Unpublished drafts: ${drafts.length}`);
    console.log(`[UnpublishedAlert] Draft dates: ${drafts.map(d => d.fecha_partido + ' ' + d.titulo).join(', ')}`);
    console.log(`[UnpublishedAlert] Date range: ${today} to ${in3Days}`);
    
    // Filter: match date is within next 3 days (including today) and not cancelled
    // NOTE: We DO include cerrada=true drafts if they were never published,
    // because that means the match happened without anyone being notified
    const urgentDrafts = drafts.filter(d => {
      if (d.estado_convocatoria === 'cancelada') return false;
      const fecha = d.fecha_partido;
      if (!fecha) return false;
      return fecha >= today && fecha <= in3Days;
    });

    console.log(`[UnpublishedAlert] Found ${urgentDrafts.length} urgent unpublished drafts`);

    if (urgentDrafts.length === 0) {
      return Response.json({ success: true, message: 'No urgent drafts found', alerted: 0 });
    }

    // Get all coaches
    let allUsersRaw = await base44.asServiceRole.entities.User.list('-created_date', 200);
    if (!Array.isArray(allUsersRaw)) allUsersRaw = [];
    const allUsers = allUsersRaw.filter(u => u.es_entrenador);
    // Also get admins
    const admins = allUsersRaw.filter(u => u.role === 'admin');
    console.log(`[UnpublishedAlert] Coaches: ${allUsers.length}, Admins: ${admins.length}`);

    let totalAlerted = 0;

    for (const draft of urgentDrafts) {
      const categoria = draft.categoria;
      const days = daysUntil(draft.fecha_partido);
      const daysText = days === 0 ? 'HOY' : days === 1 ? 'MAÑANA' : `en ${days} días`;
      const urgencyEmoji = days === 0 ? '🚨' : days === 1 ? '⚠️' : '📋';

      // Find coaches for this category
      const coaches = allUsers.filter(u => {
        const cats = u.categorias_entrena || [];
        return cats.includes(categoria);
      });

      // Combine coaches + admins (deduplicate by email)
      const recipientEmails = new Set();
      const recipients = [];
      
      for (const coach of coaches) {
        if (!recipientEmails.has(coach.email)) {
          recipientEmails.add(coach.email);
          recipients.push(coach);
        }
      }
      for (const admin of admins) {
        if (!recipientEmails.has(admin.email)) {
          recipientEmails.add(admin.email);
          recipients.push(admin);
        }
      }

      console.log(`[UnpublishedAlert] ${draft.titulo} (${categoria}) - ${daysText} - Alerting ${recipients.length} people`);

      for (const recipient of recipients) {
        // Send push notification
        const pushTitle = `${urgencyEmoji} Convocatoria sin publicar`;
        const pushBody = `${draft.titulo} es ${daysText} y NO está publicada. Los padres no lo saben.`;
        await sendPush(base44, recipient.email, pushTitle, pushBody, '/CoachCallups');

        // Send email
        const emailHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,${days === 0 ? '#dc2626,#b91c1c' : days === 1 ? '#ea580c,#c2410c' : '#d97706,#b45309'});padding:28px 24px;text-align:center;">
  <div style="font-size:48px;margin-bottom:8px;">${urgencyEmoji}</div>
  <div style="color:#fff;font-size:22px;font-weight:800;">CONVOCATORIA SIN PUBLICAR</div>
  <div style="color:rgba(255,255,255,0.9);font-size:14px;margin-top:6px;">El partido es <strong>${daysText}</strong></div>
</td></tr>
<tr><td style="padding:24px;">
  <p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola ${recipient.full_name || 'entrenador/a'},</p>
  <p style="color:#334155;font-size:14px;margin:0 0 16px;">Hay un partido próximo con la convocatoria <strong>sin publicar</strong>. Los padres y jugadores <strong>no pueden verla</strong> hasta que se publique.</p>
  
  <div style="background:${days === 0 ? '#fef2f2' : '#fff7ed'};border-radius:12px;padding:16px;margin-bottom:16px;border:2px solid ${days === 0 ? '#fecaca' : '#fed7aa'};">
    <div style="font-weight:800;color:${days === 0 ? '#dc2626' : '#c2410c'};font-size:17px;margin-bottom:10px;">⚽ ${draft.titulo}</div>
    <div style="color:#334155;font-size:14px;line-height:1.8;">
      🏷️ <strong>${categoria}</strong><br>
      📅 ${draft.fecha_partido} · ⏰ ${draft.hora_partido || 'Sin hora'}<br>
      📍 ${draft.ubicacion || 'Sin ubicación'}${draft.local_visitante ? ` (${draft.local_visitante})` : ''}<br>
      👥 ${(draft.jugadores_convocados || []).length} jugadores en borrador
    </div>
  </div>

  ${days === 0 ? `<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:12px;padding:14px;margin-bottom:16px;text-align:center;">
    <div style="font-size:16px;font-weight:800;color:#dc2626;">🚨 ¡EL PARTIDO ES HOY!</div>
    <div style="font-size:13px;color:#991b1b;margin-top:4px;">Publica la convocatoria urgentemente para que los padres sepan los detalles.</div>
  </div>` : ''}

  <div style="text-align:center;margin:24px 0;">
    <a href="https://app.cdbustarviejo.com/CoachCallups" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#c2410c);color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;">📋 PUBLICAR CONVOCATORIA</a>
  </div>
  
  <p style="color:#64748b;font-size:12px;text-align:center;margin:0;">Este aviso es automático. Se envía cuando hay partidos próximos con convocatoria pendiente de publicar.</p>
</td></tr>
</table></td></tr></table></body></html>`;

        const subjectLine = days === 0 
          ? `🚨 ¡HOY! Convocatoria sin publicar: ${draft.titulo}`
          : days === 1 
            ? `⚠️ ¡MAÑANA! Convocatoria sin publicar: ${draft.titulo}`
            : `📋 Convocatoria sin publicar (${daysText}): ${draft.titulo}`;

        await sendViaResend(recipient.email, subjectLine, emailHtml);
        totalAlerted++;
      }
    }

    console.log(`[UnpublishedAlert] Done. Alerted ${totalAlerted} recipients for ${urgentDrafts.length} drafts`);
    return Response.json({ success: true, urgentDrafts: urgentDrafts.length, alerted: totalAlerted });
  } catch (error) {
    console.error('[UnpublishedAlert] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});