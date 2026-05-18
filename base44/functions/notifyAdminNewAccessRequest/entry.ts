import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

// Email del admin que recibe las notificaciones de nuevas solicitudes
const ADMIN_EMAIL = 'manuelbermudo2804@gmail.com';

webpush.setVapidDetails(
  'mailto:CDBUSTARVIEJO@GMAIL.COM',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const data = body?.data || {};

    if (!data || !data.email) {
      return Response.json({ skipped: true, reason: 'No data' });
    }

    const nombre = data.nombre_progenitor || 'Alguien';
    const categoria = data.categoria || '';
    const titulo = '🔔 Nueva solicitud de acceso';
    const cuerpo = `${nombre} (${categoria}) está esperando código.`;

    // Buscar suscripciones push del admin
    const subs = await base44.asServiceRole.entities.PushSubscription.filter({
      usuario_email: ADMIN_EMAIL,
      activa: true
    });

    if (subs.length === 0) {
      return Response.json({ sent: 0, reason: 'Admin sin suscripciones push' });
    }

    let sent = 0;
    for (const sub of subs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key || (sub.keys && sub.keys.auth),
            p256dh: sub.p256dh_key || (sub.keys && sub.keys.p256dh)
          }
        };
        const payload = JSON.stringify({
          title: titulo,
          body: cuerpo,
          tag: 'access-request',
          requireInteraction: true,
          data: { url: '/AdminAccessCodes', timestamp: new Date().toISOString() }
        });
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          try { await base44.asServiceRole.entities.PushSubscription.delete(sub.id); } catch {}
        }
      }
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    console.error('Error notifyAdminNewAccessRequest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});