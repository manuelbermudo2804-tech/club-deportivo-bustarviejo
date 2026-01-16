import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webPush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { user_email, title, body, data, url } = await req.json();

    // Configurar VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json({ 
        error: 'VAPID keys no configuradas. Ejecuta generateVapidKeys y añade las claves a Environment variables.' 
      }, { status: 500 });
    }

    webPush.setVapidDetails(
      'mailto:cdbustarviejo@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Obtener suscripciones del usuario
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email,
      activa: true
    });

    if (subscriptions.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'Usuario no tiene notificaciones activadas' 
      });
    }

    const payload = JSON.stringify({
      title: title || 'CD Bustarviejo',
      body: body || '',
      icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
      badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg',
      data: data || {},
      url: url || '/'
    });

    const results = [];
    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          payload
        );
        results.push({ id: sub.id, success: true });
      } catch (error) {
        // Si la suscripción ya no es válida, desactivarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false });
        }
        results.push({ id: sub.id, success: false, error: error.message });
      }
    }

    return Response.json({ 
      success: true, 
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});