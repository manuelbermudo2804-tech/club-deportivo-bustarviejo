import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

// Email de respaldo si por algún motivo no hay admins en BD
const FALLBACK_ADMIN_EMAIL = 'manuelbermudo2804@gmail.com';

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

    // Obtener TODOS los admins (con fallback al email fijo si no hay ninguno)
    let adminEmails = [];
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      adminEmails = admins.map(a => a.email).filter(Boolean);
    } catch (e) { console.error('Error obteniendo admins:', e); }
    if (adminEmails.length === 0) adminEmails = [FALLBACK_ADMIN_EMAIL];

    // Buscar suscripciones push de TODOS los admins
    let subs = [];
    for (const adminEmail of adminEmails) {
      try {
        const s = await base44.asServiceRole.entities.PushSubscription.filter({
          usuario_email: adminEmail,
          activa: true
        });
        subs = subs.concat(s);
      } catch {}
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
          data: { url: '/AdminAccessCodes?tab=bandeja', timestamp: new Date().toISOString() }
        });
        // TTL 24h: aunque Chrome Android esté en Doze/ahorro de batería, FCM guarda el
        // push y lo entrega cuando el dispositivo se reactive. Con TTL=60 se descartaba.
        await webpush.sendNotification(pushSubscription, payload, { urgency: 'high', TTL: 86400 });
        sent++;
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          try { await base44.asServiceRole.entities.PushSubscription.delete(sub.id); } catch {}
        }
      }
    }

    // SIEMPRE enviar email a TODOS los admins como respaldo (push puede fallar / estar caducado)
    let emailSent = 0;
    const telefono = data.telefono || '—';
    const whatsapp = data.prefiere_whatsapp ? '✅ Sí, prefiere WhatsApp' : '—';
    for (const adminEmail of adminEmails) {
      try {
        await base44.asServiceRole.functions.invoke('sendEmail', {
          to: adminEmail,
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
        emailSent++;
      } catch (e) {
        console.error(`Error enviando email a ${adminEmail}:`, e);
      }
    }

    return Response.json({ success: true, sent, emailSent, adminCount: adminEmails.length });
  } catch (error) {
    console.error('Error notifyAdminNewAccessRequest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});