import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Función para enviar push cuando hay un nuevo mensaje de chat
// Llamar desde el frontend cuando se envía un mensaje importante

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

    const payload = {
      title: `${prioridadEmoji} ${senderName || 'CD Bustarviejo'}`,
      body: messageContent.substring(0, 150) + (messageContent.length > 150 ? "..." : ""),
      icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
      url: "https://club-gestion-bustarviejo-1fb134d6.base44.app/ParentChat",
      data: {
        tipo: "chat",
        groupId: groupId,
        prioridad: prioridad
      }
    };

    let sent = 0;
    let failed = 0;

    for (const targetUser of targetUsers) {
      try {
        const subscriptionData = typeof targetUser.fcm_token === 'string' 
          ? JSON.parse(targetUser.fcm_token) 
          : targetUser.fcm_token;

        const response = await fetch(subscriptionData.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          sent++;
        } else {
          failed++;
          // Limpiar token inválido
          if (response.status === 410 || response.status === 404) {
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              fcm_token: null,
              push_enabled: false
            });
          }
        }
      } catch (err) {
        failed++;
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