import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY");

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

    const { 
      messageContent, 
      senderName, 
      groupId, 
      prioridad,
      recipientEmails 
    } = await req.json();

    if (!messageContent || !recipientEmails || recipientEmails.length === 0) {
      return Response.json({ error: 'Message content and recipients required' }, { status: 400 });
    }

    // Verificar si las notificaciones push están activas
    const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.list();
    const activeConfig = seasonConfigs.find(c => c.activa === true);
    
    if (activeConfig?.notificaciones_push_activas === false) {
      console.log('⏸️ Notificaciones push desactivadas por admin');
      return Response.json({ 
        success: true, 
        message: 'Push notifications disabled by admin',
        sent: 0 
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return Response.json({ error: 'VAPID keys not configured', sent: 0 });
    }

    // Obtener usuarios destinatarios con push habilitado
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUsers = allUsers.filter(u => 
      recipientEmails.includes(u.email) && 
      u.fcm_token && 
      u.push_enabled &&
      u.email !== user.email // No enviar al remitente
    );

    if (targetUsers.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No hay usuarios con push habilitado',
        sent: 0 
      });
    }

    const prioridadEmoji = prioridad === "Urgente" ? "🔴" : 
                          prioridad === "Importante" ? "🟠" : "💬";

    const payload = JSON.stringify({
      title: `${prioridadEmoji} ${senderName || 'CD Bustarviejo'}`,
      body: messageContent.substring(0, 150) + (messageContent.length > 150 ? "..." : ""),
      icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
      url: "https://club-gestion-bustarviejo-1fb134d6.base44.app/ParentChat",
      data: {
        tipo: "chat",
        groupId: groupId,
        prioridad: prioridad
      }
    });

    let sent = 0;
    let failed = 0;

    for (const targetUser of targetUsers) {
      try {
        const subscription = typeof targetUser.fcm_token === 'string' 
          ? JSON.parse(targetUser.fcm_token) 
          : targetUser.fcm_token;

        await webpush.sendNotification(subscription, payload);
        sent++;
        console.log(`✅ Chat push enviado a ${targetUser.email}`);
      } catch (err) {
        failed++;
        console.error(`❌ Error push a ${targetUser.email}:`, err.message);
        
        // Limpiar token inválido
        if (err.statusCode === 410 || err.statusCode === 404) {
          await base44.asServiceRole.entities.User.update(targetUser.id, {
            fcm_token: null,
            push_enabled: false
          });
        }
      }
    }

    return Response.json({
      success: true,
      sent,
      failed,
      total: targetUsers.length
    });

  } catch (error) {
    console.error('Chat push error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});