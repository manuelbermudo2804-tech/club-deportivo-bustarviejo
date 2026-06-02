import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!publicKey || !privateKey) {
      return Response.json({ error: 'Claves VAPID no configuradas' }, { status: 500 });
    }

    webpush.setVapidDetails('mailto:CDBUSTARVIEJO@GMAIL.COM', publicKey, privateKey);

    const { endpoint, keys, badgeCount, usuario_email, user_agent } = await req.json();

    if (!endpoint || !keys) {
      return Response.json({ error: 'Envía endpoint y keys de la suscripción push' }, { status: 400 });
    }

    // Crear registro de entrega ANTES de enviar (para correlación con SW)
    const deliveryId = crypto.randomUUID();
    const sentAt = new Date().toISOString();
    const title = '🔔 CD Bustarviejo';
    const tag = 'badge-update';

    try {
      await base44.asServiceRole.entities.PushDelivery.create({
        delivery_id: deliveryId,
        usuario_email: usuario_email || user.email || 'unknown',
        endpoint_hash: String(endpoint).slice(-24),
        user_agent: user_agent || '',
        title,
        tag,
        source: 'testPushBadge',
        sent_at: sentAt,
        delivered: false
      });
    } catch (e) {
      console.error('No se pudo crear PushDelivery:', e.message);
    }

    const pushPayload = JSON.stringify({
      title,
      body: `Tienes ${badgeCount || 5} notificaciones pendientes`,
      tag,
      badgeCount: badgeCount || 5,
      deliveryId,
      data: { url: '/', type: 'badge_update', deliveryId }
    });

    try {
      await webpush.sendNotification(
        { endpoint, keys: { auth: keys.auth, p256dh: keys.p256dh } },
        pushPayload,
        { urgency: 'high', TTL: 86400 }
      );
    } catch (sendError) {
      // Marcar error en el registro
      try {
        const matches = await base44.asServiceRole.entities.PushDelivery.filter({ delivery_id: deliveryId });
        if (matches[0]) {
          await base44.asServiceRole.entities.PushDelivery.update(matches[0].id, {
            send_error: sendError.message
          });
        }
      } catch {}
      throw sendError;
    }

    return Response.json({
      success: true,
      delivery_id: deliveryId,
      message: 'Push enviada correctamente. Mira el icono de la app.'
    });
  } catch (error) {
    console.error('Error test push:', error);
    return Response.json({
      error: error.message,
      statusCode: error.statusCode || null
    }, { status: 500 });
  }
});