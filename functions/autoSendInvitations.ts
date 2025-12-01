import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const DEFAULT_APP_URL = "https://club-gestion-bustarviejo-1fb134d6.base44.app";
const TRACKING_BASE_URL = "https://club-gestion-bustarviejo-1fb134d6.base44.app/api/emailTracking";

function generateEmailBody(linkUrl, invitationId) {
  const trackingPixelUrl = invitationId ? `${TRACKING_BASE_URL}?id=${invitationId}&action=open` : '';
  const trackingClickUrl = invitationId ? `${TRACKING_BASE_URL}?id=${invitationId}&action=click&redirect=${encodeURIComponent(linkUrl)}` : linkUrl;
  const finalLinkUrl = invitationId ? trackingClickUrl : linkUrl;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;background-color:#f1f5f9;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

<!-- Header naranja -->
<tr>
<td bgcolor="#ea580c" style="padding:30px;text-align:center;">
<img src="${CLUB_LOGO_URL}" alt="CD Bustarviejo" width="80" height="80" style="width:80px;height:80px;border-radius:12px;border:3px solid #ffffff;display:block;margin:0 auto;">
<h1 style="color:#ffffff;margin:15px 0 5px 0;font-size:26px;font-family:Arial,Helvetica,sans-serif;">CD BUSTARVIEJO</h1>
<p style="color:#fed7aa;margin:0;font-size:14px;">Club Deportivo</p>
</td>
</tr>

<!-- Contenido -->
<tr>
<td bgcolor="#ffffff" style="padding:30px;">
<h2 style="color:#1e293b;margin:0 0 15px 0;font-size:22px;text-align:center;font-family:Arial,Helvetica,sans-serif;">🎉 ¡Bienvenido a la App!</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 25px 0;text-align:center;">
Te invitamos a usar la <strong style="color:#ea580c;">aplicación oficial</strong> del club para gestionar todo sobre tus jugadores.
</p>

<!-- Features -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:25px;background-color:#f8fafc;border-radius:8px;">
<tr>
<td style="padding:15px;width:50%;text-align:center;border-bottom:1px solid #e2e8f0;">
<span style="font-size:28px;">📋</span><br>
<span style="color:#475569;font-size:13px;font-weight:bold;">Convocatorias</span>
</td>
<td style="padding:15px;width:50%;text-align:center;border-bottom:1px solid #e2e8f0;">
<span style="font-size:28px;">💳</span><br>
<span style="color:#475569;font-size:13px;font-weight:bold;">Pagos</span>
</td>
</tr>
<tr>
<td style="padding:15px;width:50%;text-align:center;">
<span style="font-size:28px;">💬</span><br>
<span style="color:#475569;font-size:13px;font-weight:bold;">Chat</span>
</td>
<td style="padding:15px;width:50%;text-align:center;">
<span style="font-size:28px;">📅</span><br>
<span style="color:#475569;font-size:13px;font-weight:bold;">Calendario</span>
</td>
</tr>
</table>

<!-- Mensaje automático -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:25px;">
<tr>
<td bgcolor="#fef3c7" style="padding:15px;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
<p style="color:#92400e;font-size:14px;margin:0;">💬 Un familiar ha solicitado que te enviemos esta invitación para que puedas registrarte en la app del club.</p>
</td>
</tr>
</table>

<!-- Boton -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 20px auto;">
<tr>
<td bgcolor="#ea580c" style="border-radius:8px;">
<a href="${finalLinkUrl}" target="_blank" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 35px;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;">ACCEDER A LA APP →</a>
</td>
</tr>
</table>

${invitationId ? `<!-- Pixel de tracking -->
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />` : ''}

<p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Haz clic en el botón para empezar</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td bgcolor="#1e293b" style="padding:20px;text-align:center;">
<p style="color:#94a3b8;font-size:13px;margin:0 0 5px 0;">⚽ 🏀</p>
<p style="color:#64748b;font-size:12px;margin:0;">cdbustarviejo@gmail.com</p>
</td>
</tr>

</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Obtener todas las solicitudes de invitación pendientes
    const pendingRequests = await base44.asServiceRole.entities.InvitationRequest.filter({
      estado: "pendiente"
    });

    if (pendingRequests.length === 0) {
      return Response.json({ 
        success: true, 
        message: "No hay solicitudes pendientes",
        processed: 0 
      });
    }

    let sent = 0;
    let errors = 0;
    const results = [];

    for (const request of pendingRequests) {
      const email = request.email_jugador;
      
      if (!email) {
        results.push({ id: request.id, status: "error", reason: "Sin email" });
        errors++;
        continue;
      }

      try {
        // Crear registro de invitación para tracking
        const invitationRecord = await base44.asServiceRole.entities.EmailInvitation.create({
          email_destinatario: email,
          nombre_destinatario: request.nombre_jugador,
          asunto: "¡Bienvenido a la App del CD Bustarviejo! 📱⚽",
          estado: "enviada",
          enviado_por: "sistema@cdbustarviejo.com",
          enviado_por_nombre: "Sistema Automático",
          solicitud_id: request.id,
          mensaje_personalizado: `Invitación solicitada por ${request.solicitado_por_nombre}`,
          abierta: false,
          clicada: false
        });

        // Enviar email con tracking
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: email,
          subject: "¡Bienvenido a la App del CD Bustarviejo! 📱⚽",
          body: generateEmailBody(DEFAULT_APP_URL, invitationRecord.id)
        });

        // Marcar solicitud como enviada
        await base44.asServiceRole.entities.InvitationRequest.update(request.id, {
          estado: "enviada",
          fecha_envio: new Date().toISOString()
        });

        sent++;
        results.push({ id: request.id, email, status: "sent" });

      } catch (error) {
        console.error(`Error enviando a ${email}:`, error);
        
        // Registrar error
        await base44.asServiceRole.entities.EmailInvitation.create({
          email_destinatario: email,
          nombre_destinatario: request.nombre_jugador,
          asunto: "¡Bienvenido a la App del CD Bustarviejo! 📱⚽",
          estado: "error",
          error_mensaje: error.message || "Error desconocido",
          enviado_por: "sistema@cdbustarviejo.com",
          enviado_por_nombre: "Sistema Automático",
          solicitud_id: request.id,
          abierta: false,
          clicada: false
        });

        errors++;
        results.push({ id: request.id, email, status: "error", reason: error.message });
      }

      // Pequeña pausa entre envíos para no saturar
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return Response.json({
      success: true,
      message: `Procesadas ${pendingRequests.length} solicitudes`,
      sent,
      errors,
      results
    });

  } catch (error) {
    console.error("Error en autoSendInvitations:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});