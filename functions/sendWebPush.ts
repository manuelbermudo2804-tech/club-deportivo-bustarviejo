import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY"); // Usamos este secret para la clave privada VAPID

// Configurar VAPID
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:cdbustarviejo@gmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
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

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    // Obtener usuarios con push habilitado
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let targetUsers = allUsers;
    if (recipientEmails && recipientEmails.length > 0) {
      targetUsers = allUsers.filter(u => recipientEmails.includes(u.email));
    }

    // Filtrar usuarios con fcm_token (subscription de Web Push)
    const usersWithPush = targetUsers.filter(u => u.fcm_token && u.push_enabled);

    const results = {
      sent: 0,
      failed: 0,
      noToken: targetUsers.length - usersWithPush.length,
      errors: []
    };

    const payload = JSON.stringify({
      title,
      body,
      icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
      badge: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
      url: url || "https://club-gestion-bustarviejo-1fb134d6.base44.app",
      data: data || {}
    });

    // Enviar a cada usuario
    for (const targetUser of usersWithPush) {
      try {
        const subscription = typeof targetUser.fcm_token === 'string' 
          ? JSON.parse(targetUser.fcm_token) 
          : targetUser.fcm_token;

        await webpush.sendNotification(subscription, payload);
        results.sent++;
        console.log(`✅ Push enviado a ${targetUser.email}`);
      } catch (err) {
        results.failed++;
        results.errors.push({ email: targetUser.email, error: err.message });
        console.error(`❌ Error enviando a ${targetUser.email}:`, err.message);
        
        // Si el endpoint ya no es válido (410 Gone o 404), limpiar el token
        if (err.statusCode === 410 || err.statusCode === 404) {
          await base44.asServiceRole.entities.User.update(targetUser.id, {
            fcm_token: null,
            push_enabled: false
          });
        }
      }
    }

    // Registrar notificación enviada
    try {
      await base44.asServiceRole.entities.PushNotification.create({
        titulo: title,
        mensaje: body,
        enviado_por: user.email,
        destinatarios: recipientEmails?.length ? `Específicos: ${recipientEmails.length}` : 'Todos',
        enviados: results.sent,
        fallidos: results.failed,
        fecha_envio: new Date().toISOString()
      });
    } catch (logErr) {
      console.log('Error logging notification:', logErr);
    }

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