import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Web Push con VAPID (más simple y directo que FCM para web)
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const FIREBASE_PRIVATE_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY");
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL");

async function sendWebPushNotification(subscription, payload) {
  try {
    const subscriptionData = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
    
    const response = await fetch(subscriptionData.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400'
      },
      body: JSON.stringify(payload)
    });

    return { success: response.ok, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, recipientEmails, data, url } = await req.json();

    if (!title || !body) {
      return Response.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Obtener usuarios con push habilitado
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let targetUsers = allUsers;
    if (recipientEmails && recipientEmails.length > 0) {
      targetUsers = allUsers.filter(u => recipientEmails.includes(u.email));
    }

    // Filtrar usuarios con fcm_token (que en realidad es la subscription de Web Push)
    const usersWithPush = targetUsers.filter(u => u.fcm_token && u.push_enabled);

    const results = {
      sent: 0,
      failed: 0,
      noToken: targetUsers.length - usersWithPush.length,
      errors: []
    };

    const payload = {
      title,
      body,
      icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
      badge: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
      url: url || "https://club-gestion-bustarviejo-1fb134d6.base44.app",
      data: data || {}
    };

    // Enviar a cada usuario
    for (const targetUser of usersWithPush) {
      try {
        const result = await sendWebPushNotification(targetUser.fcm_token, payload);

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ email: targetUser.email, error: result.error || `Status: ${result.status}` });
          
          // Si el endpoint ya no es válido (410 Gone), limpiar el token
          if (result.status === 410 || result.status === 404) {
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              fcm_token: null,
              push_enabled: false
            });
          }
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ email: targetUser.email, error: err.message });
      }
    }

    // Registrar notificación enviada
    await base44.asServiceRole.entities.PushNotification.create({
      titulo: title,
      mensaje: body,
      enviado_por: user.email,
      destinatarios: recipientEmails?.length ? `Específicos: ${recipientEmails.length}` : 'Todos',
      enviados: results.sent,
      fallidos: results.failed,
      fecha_envio: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: `Notificación enviada a ${results.sent} usuarios`,
      totalTargeted: targetUsers.length,
      withPushEnabled: usersWithPush.length,
      ...results
    });

  } catch (error) {
    console.error('Web Push error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});