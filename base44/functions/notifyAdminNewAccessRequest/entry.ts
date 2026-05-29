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
          data: { url: '/AdminAccessCodes?tab=bandeja', timestamp: new Date().toISOString() }
        });
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          try { await base44.asServiceRole.entities.PushSubscription.delete(sub.id); } catch {}
        }
      }
    }

    // SIEMPRE enviar email al admin como respaldo (push puede fallar / estar caducado)
    let emailSent = false;
    try {
      const telefono = data.telefono || '—';
      const whatsapp = data.prefiere_whatsapp ? '✅ Sí, prefiere WhatsApp' : '—';
      await base44.asServiceRole.functions.invoke('sendEmail', {
        to: ADMIN_EMAIL,
        subject: `🔔 Nueva solicitud de acceso: ${nombre}`,
        html: `
          <h2>Nueva solicitud de código de acceso</h2>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Teléfono:</strong> ${telefono}</p>
          <p><strong>Categoría:</strong> ${categoria}</p>
          <p><strong>WhatsApp:</strong> ${whatsapp}</p>
          <p><strong>Nombre jugador:</strong> ${data.nombre_jugador || '—'}</p>
          <hr>
          <p>👉 <a href="https://app.base44.com/apps/6992c6be619d2da592897991/AdminAccessCodes?tab=bandeja">Abrir bandeja de solicitudes</a></p>
        `
      });
      emailSent = true;
    } catch (e) {
      console.error('Error enviando email admin:', e);
    }

    return Response.json({ success: true, sent, emailSent });
  } catch (error) {
    console.error('Error notifyAdminNewAccessRequest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});