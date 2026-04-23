import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  'mailto:info@cdbustarviejo.com',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

async function sendEmail(to, subject, body) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: [to], subject, html: body })
  });
  if (!resp.ok) console.error(`[Email] Error ${resp.status}`);
}

async function sendPush(base44, email, title, body, url, tag) {
  const subs = await base44.asServiceRole.entities.PushSubscription.filter({ usuario_email: email, activa: true });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
        JSON.stringify({ title, body, url: url || '/CoachCallups', tag })
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false });
      }
    }
  }
}

function getMadridDate(daysFromNow = 0) {
  const madrid = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  madrid.setDate(madrid.getDate() + daysFromNow);
  return madrid.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = getMadridDate(0);
    const in2Days = getMadridDate(2);

    // Get all convocatorias
    let all = await base44.asServiceRole.entities.Convocatoria.list('-fecha_partido', 200);
    if (!Array.isArray(all)) all = [];

    // Filter: unpublished, with players, match in next 2 days, not cancelled/closed
    const drafts = all.filter(c =>
      !c.publicada &&
      (c.jugadores_convocados?.length > 0) &&
      c.fecha_partido >= today &&
      c.fecha_partido <= in2Days &&
      c.estado_convocatoria !== 'cancelada' &&
      !c.cerrada
    );

    // Deduplicate by categoria+rival (in case of duplicate RFFM drafts)
    const seen = new Set();
    const unique = drafts.filter(d => {
      const key = `${d.categoria}::${d.rival || d.titulo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Skip if already alerted today
    const pending = unique.filter(d => d.alerta_enviada_fecha !== today);

    console.log(`[Alert] ${pending.length} drafts need alerting (${unique.length} total urgent, ${drafts.length} raw)`);

    if (pending.length === 0) {
      return Response.json({ success: true, alerted: 0 });
    }

    // Get users once
    let users = await base44.asServiceRole.entities.User.list('-created_date', 200);
    if (!Array.isArray(users)) users = [];
    const coaches = users.filter(u => u.es_entrenador);

    let totalSent = 0;

    for (const draft of pending) {
      const days = Math.round((new Date(draft.fecha_partido) - new Date(today)) / 86400000);
      const daysText = days === 0 ? 'HOY' : days === 1 ? 'MAÑANA' : `pasado mañana`;
      const emoji = days === 0 ? '🚨' : '⚽';

      // Only notify the coach(es) of this category — not all admins
      const categoryCoaches = coaches.filter(u =>
        (u.categorias_entrena || []).includes(draft.categoria)
      );

      if (categoryCoaches.length === 0) {
        console.log(`[Alert] No coaches for ${draft.categoria}, skipping`);
        continue;
      }

      // Calcular hace cuánto se actualizó el borrador desde RFFM
      const lastUpdate = draft.updated_date ? new Date(draft.updated_date) : null;
      const now = new Date();
      let syncText = 'Datos sincronizados con la Federación';
      if (lastUpdate) {
        const diffH = Math.round((now - lastUpdate) / 3600000);
        if (diffH < 1) syncText = '🟢 Datos RFFM actualizados hace menos de 1 hora';
        else if (diffH < 3) syncText = `🟢 Datos RFFM actualizados hace ${diffH} h`;
        else if (diffH < 12) syncText = `🟡 Datos RFFM actualizados hace ${diffH} h`;
        else syncText = `⚠️ Datos RFFM actualizados hace ${diffH} h — verifica en la web de la Federación antes de publicar`;
      }

      for (const coach of categoryCoaches) {
        const title = `${emoji} [Entrenador] Convocatoria pendiente`;
        const pushBody = `${draft.categoria}: ${draft.rival || draft.titulo} es ${daysText}. Revisa y publica cuando esté lista.`;
        await sendPush(base44, coach.email, title, pushBody, '/CoachCallups', `draft-${draft.categoria}-${draft.fecha_partido}`);

        // Email de respaldo
        const emailHtml = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
          <div style="background:#ea580c;color:white;padding:20px;border-radius:12px;text-align:center;margin-bottom:16px">
            <div style="font-size:36px">${emoji}</div>
            <h2 style="margin:8px 0 0">Convocatoria pendiente</h2>
          </div>
          <p>Hola ${coach.full_name || 'entrenador/a'},</p>
          <p>El partido de <strong>${draft.categoria}</strong> contra <strong>${draft.rival || draft.titulo}</strong> es <strong>${daysText}</strong> y la convocatoria aún no está publicada.</p>
          <div style="background:#f1f5f9;border-left:4px solid #0ea5e9;padding:10px 12px;margin:12px 0;border-radius:6px;font-size:13px;color:#334155">
            ${syncText}
          </div>
          <p>Revísala y publícala cuando esté lista para que los padres puedan confirmar asistencia.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="https://app.cdbustarviejo.com/CoachCallups" style="background:#ea580c;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700">📋 Ver convocatorias</a>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center">Aviso automático · CD Bustarviejo</p>
        </div>`;
        await sendEmail(coach.email, `${emoji} ${draft.categoria}: convocatoria pendiente (${daysText})`, emailHtml);
        totalSent++;
      }

      // Mark as alerted today
      try {
        await base44.asServiceRole.entities.Convocatoria.update(draft.id, { alerta_enviada_fecha: today });
      } catch (e) {
        console.warn(`[Alert] Could not mark ${draft.id}:`, e.message);
      }
    }

    console.log(`[Alert] Sent ${totalSent} push notifications`);
    return Response.json({ success: true, alerted: totalSent });
  } catch (error) {
    console.error('[Alert] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});