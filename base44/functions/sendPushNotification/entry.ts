import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

// Configurar web-push con las claves VAPID
webpush.setVapidDetails(
  'mailto:CDBUSTARVIEJO@GMAIL.COM',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { usuario_email, titulo, cuerpo, url, tag, requireInteraction } = payload;

    if (!usuario_email || !titulo || !cuerpo) {
      return Response.json(
        { error: 'Faltan parámetros: usuario_email, titulo, cuerpo' },
        { status: 400 }
      );
    }

    // Obtener suscripciones activas del usuario
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      usuario_email,
      activa: true
    });

    if (subscriptions.length === 0) {
      return Response.json(
        { message: 'Usuario no tiene suscripciones push activas', sent: 0 },
        { status: 200 }
      );
    }

    // Enviar a todas las suscripciones del usuario
    const results = [];
    for (const sub of subscriptions) {
      const deliveryId = crypto.randomUUID();
      const sentAt = new Date().toISOString();

      try {
        // Registrar envío antes de enviar
        try {
          await base44.asServiceRole.entities.PushDelivery.create({
            delivery_id: deliveryId,
            usuario_email,
            endpoint_hash: String(sub.endpoint).slice(-24),
            user_agent: sub.user_agent || '',
            title: titulo,
            tag: tag || 'notification',
            source: 'sendPushNotification',
            sent_at: sentAt,
            delivered: false
          });
        } catch (e) {
          console.error('No se pudo crear PushDelivery:', e.message);
        }

        // Normalizar claves a base64url (sin padding, con -/_) — algunas suscripciones
        // antiguas se guardaron en base64 estándar (con +, /, =) y eso hace que web-push
        // cifre mal el payload: FCM acepta ("sent") pero el navegador lo descarta en silencio.
        const toBase64Url = (k) => (k || '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: toBase64Url(sub.auth_key || (sub.keys && sub.keys.auth)),
            p256dh: toBase64Url(sub.p256dh_key || (sub.keys && sub.keys.p256dh))
          }
        };

        const payload_json = JSON.stringify({
          title: titulo,
          body: cuerpo,
          tag: tag || 'notification',
          badgeCount: payload.badgeCount || 1,
          requireInteraction: requireInteraction || false,
          deliveryId,
          data: {
            url: url || '/',
            timestamp: sentAt,
            deliveryId
          }
        });

        await webpush.sendNotification(pushSubscription, payload_json, {
          urgency: 'high',
          TTL: 86400
        });
        results.push({ email: usuario_email, delivery_id: deliveryId, status: 'sent' });
      } catch (error) {
        console.error(`Error enviando a ${usuario_email}:`, error.message);

        // Marcar error en registro
        try {
          const matches = await base44.asServiceRole.entities.PushDelivery.filter({ delivery_id: deliveryId });
          if (matches[0]) {
            await base44.asServiceRole.entities.PushDelivery.update(matches[0].id, {
              send_error: error.message
            });
          }
        } catch {}

        // Endpoint muerto → desactivar (mantener histórico, no borrar)
        if (error.statusCode === 410 || error.statusCode === 404) {
          try { await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false }); } catch {}
        }

        results.push({ email: usuario_email, delivery_id: deliveryId, status: 'error', error: error.message });
      }
    }

    return Response.json({
      success: true,
      sent: results.filter(r => r.status === 'sent').length,
      total: results.length,
      results
    });
  } catch (error) {
    console.error('Error en sendPushNotification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});