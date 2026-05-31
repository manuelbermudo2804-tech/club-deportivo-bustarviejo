import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
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

    // Enviar a todas las suscripciones EN PARALELO con timeout de 10s
    const results = await Promise.all(subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key || (sub.keys && sub.keys.auth),
            p256dh: sub.p256dh_key || (sub.keys && sub.keys.p256dh)
          }
        };

        const payload_json = JSON.stringify({
          title: titulo,
          body: cuerpo,
          tag: tag || `notif-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          badgeCount: payload.badgeCount || 1,
          requireInteraction: requireInteraction || false,
          data: {
            url: url || '/',
            timestamp: new Date().toISOString()
          }
        });

        await Promise.race([
          webpush.sendNotification(pushSubscription, payload_json),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))
        ]);
        return { email: usuario_email, status: 'sent', endpoint: sub.endpoint };
      } catch (error) {
        console.error(`Error enviando a ${usuario_email}:`, error.message);
        
        // Endpoint muerto → eliminar de la BD (no acumular inactivos)
        if (error.statusCode === 410 || error.statusCode === 404) {
          try { await base44.asServiceRole.entities.PushSubscription.delete(sub.id); } catch {}
        }
        
        return { email: usuario_email, status: 'error', error: error.message, endpoint: sub.endpoint };
      }
    }));

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