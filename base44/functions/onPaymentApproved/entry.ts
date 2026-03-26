import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:CDBUSTARVIEJO@GMAIL.COM', VAPID_PUBLIC, VAPID_PRIVATE);
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendWithResend(to, subject, html) {
  if (!RESEND_API_KEY) { console.error('[onPaymentApproved] RESEND_API_KEY not set'); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: [to], subject, html })
  });
  if (!resp.ok) console.error(`[onPaymentApproved] Resend error ${resp.status}:`, await resp.text().catch(() => ''));
}

function buildApprovalEmail(jugadorNombre, mes, temporada, cantidad) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1);">
  <div style="background:#16a34a;padding:24px;text-align:center;color:#fff;">
    <div style="font-size:36px;margin-bottom:8px;">✅</div>
    <h1 style="margin:0;font-size:22px;">Pago Aprobado</h1>
    <p style="margin:8px 0 0;opacity:.9;font-size:14px;">${jugadorNombre}</p>
  </div>
  <div style="padding:24px;text-align:center;">
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      El pago de <strong>${cantidad}€</strong> de <strong>${jugadorNombre}</strong> (${mes}${temporada ? ` - ${temporada}` : ''}) ha sido <strong style="color:#16a34a;">aprobado</strong> por el club.
    </p>
    <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#166534;font-weight:bold;">¡Gracias por tu colaboración! 💚</p>
    </div>
    <a href="https://app.cdbustarviejo.com/ParentPayments" style="display:inline-block;background:#ea580c;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:10px;margin-top:8px;">
      Ver Mis Pagos →
    </a>
  </div>
  <div style="background:#333;padding:16px;text-align:center;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">CD Bustarviejo — Deporte, Valores y Familia</p>
  </div>
</div></body></html>`;
}

/**
 * Entity automation handler: triggered when a Payment record is updated.
 * Detects "En revisión" → "Pagado" transitions and notifies the family.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    // Only process update events
    if (event?.type !== 'update') {
      return Response.json({ skipped: true, reason: 'not an update event' });
    }

    // Only process "En revisión" → "Pagado" transitions
    const oldEstado = old_data?.estado;
    const newEstado = data?.estado;

    if (oldEstado !== 'En revisión' || newEstado !== 'Pagado') {
      return Response.json({ skipped: true, reason: `transition ${oldEstado} → ${newEstado} not relevant` });
    }

    console.log(`[onPaymentApproved] Detected approval: ${data.jugador_nombre} (${data.mes}) ${data.cantidad}€`);

    // Get player to find parent emails
    if (!data.jugador_id) {
      console.warn('[onPaymentApproved] No jugador_id on payment');
      return Response.json({ skipped: true, reason: 'no jugador_id' });
    }

    const players = await base44.asServiceRole.entities.Player.filter({ id: data.jugador_id });
    const player = players?.[0];
    if (!player) {
      console.warn('[onPaymentApproved] Player not found:', data.jugador_id);
      return Response.json({ skipped: true, reason: 'player not found' });
    }

    // Collect unique parent emails
    const emails = [];
    if (player.email_padre?.trim()) emails.push(player.email_padre.trim().toLowerCase());
    if (player.email_tutor_2?.trim()) {
      const t2 = player.email_tutor_2.trim().toLowerCase();
      if (!emails.includes(t2)) emails.push(t2);
    }

    if (emails.length === 0) {
      console.warn('[onPaymentApproved] No parent emails for player:', player.nombre);
      return Response.json({ skipped: true, reason: 'no parent emails' });
    }

    // Send email and create app notification for each parent
    const html = buildApprovalEmail(
      data.jugador_nombre || player.nombre,
      data.mes || '',
      data.temporada || '',
      data.cantidad || 0
    );

    for (const email of emails) {
      // App notification
      try {
        await base44.asServiceRole.entities.AppNotification.create({
          usuario_email: email,
          titulo: '✅ Pago Aprobado',
          mensaje: `El pago de ${data.cantidad}€ de ${data.jugador_nombre} (${data.mes}) ha sido aprobado. ¡Gracias!`,
          tipo: 'pago_aprobado',
          prioridad: 'normal',
          enlace: 'ParentPayments',
          url_accion: '/ParentPayments',
          vista: false
        });
      } catch (notifErr) {
        console.error('[onPaymentApproved] Error creating notification:', notifErr.message);
      }

      // Email
      try {
        await sendWithResend(
          email,
          `✅ Pago Aprobado - ${data.jugador_nombre}`,
          html
        );
        console.log('[onPaymentApproved] Email sent to:', email);
      } catch (emailErr) {
        console.error('[onPaymentApproved] Error sending email:', emailErr.message);
      }
    }

    // Push notification
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      try {
        const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({ activa: true });
        const targetSubs = allSubs.filter(s => emails.includes(s.usuario_email));
        for (const sub of targetSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
              JSON.stringify({
                title: '✅ Pago Aprobado',
                body: `El pago de ${data.cantidad}€ de ${data.jugador_nombre} (${data.mes}) ha sido aprobado`,
                tag: `payment-approved-${event.entity_id}`,
                badgeCount: 1, renotify: true, requireInteraction: false,
                data: { url: '/ParentPayments', timestamp: new Date().toISOString() }
              }),
              { urgency: 'high', TTL: 86400 }
            );
          } catch (pushErr) {
            if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
              try { await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false }); } catch {}
            }
          }
        }
      } catch (pushGroupErr) {
        console.error('[onPaymentApproved] Push error:', pushGroupErr.message);
      }
    }

    return Response.json({ success: true, notified: emails });
  } catch (error) {
    console.error('[onPaymentApproved] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});