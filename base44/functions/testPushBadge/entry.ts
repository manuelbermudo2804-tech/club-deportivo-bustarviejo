import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
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

    const { endpoint, keys, badgeCount } = await req.json();

    if (!endpoint || !keys) {
      return Response.json({ error: 'Envía endpoint y keys de la suscripción push' }, { status: 400 });
    }

    const pushPayload = JSON.stringify({
      title: '🔔 CD Bustarviejo',
      body: `Tienes ${badgeCount || 5} notificaciones pendientes`,
      tag: 'badge-update',
      badgeCount: badgeCount || 5,
      data: { url: '/', type: 'badge_update' }
    });

    await webpush.sendNotification(
      { endpoint, keys: { auth: keys.auth, p256dh: keys.p256dh } },
      pushPayload
    );

    return Response.json({ 
      success: true, 
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