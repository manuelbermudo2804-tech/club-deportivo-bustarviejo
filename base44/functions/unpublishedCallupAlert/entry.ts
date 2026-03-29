import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  'mailto:info@cdbustarviejo.com',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

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

      for (const coach of categoryCoaches) {
        const title = `${emoji} Convocatoria pendiente`;
        const body = `${draft.categoria}: ${draft.rival || draft.titulo} es ${daysText}. Revisa y publica cuando esté lista.`;
        await sendPush(base44, coach.email, title, body, '/CoachCallups', `draft-${draft.categoria}-${draft.fecha_partido}`);
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