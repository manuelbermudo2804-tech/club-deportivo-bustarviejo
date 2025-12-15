import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  console.log('🚀 createUserAndSendInvitation function called');
  
  try {
    const base44 = createClientFromRequest(req);

    // Verificar autenticación
    const user = await base44.auth.me();
    console.log('👤 User authenticated:', user?.email);
    
    if (!user || user.role !== 'admin') {
      console.error('❌ Unauthorized access attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const { email, full_name, invitationType, invitationData } = body;

    if (!email || !full_name) {
      console.error('❌ Missing required fields:', { email, full_name });
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('📧 Preparing invitation email for:', email);

    // Enviar invitación por email usando Core.SendEmail
    console.log('📧 Preparing to send email, type:', invitationType);
    
    try {
      let emailSubject = '';
      let emailBody = '';

      if (invitationType === 'second_parent') {
        console.log('👨‍👩‍👧 Generating second parent email...');
        const { token, validationUrl, invitedByName, playerName } = invitationData;
        emailSubject = `👋 ${invitedByName} te invita a unirte al CD Bustarviejo`;
        emailBody = generateSecondParentEmail(full_name, invitedByName, playerName, validationUrl);
      } else if (invitationType === 'admin_invitation') {
        console.log('📧 Generating admin invitation email...');
        const { token, validationUrl, message } = invitationData;
        emailSubject = '📧 Invitación al CD Bustarviejo';
        emailBody = generateAdminInvitationEmail(full_name, validationUrl, message);
      } else {
        console.error('❌ Invalid invitation type:', invitationType);
        return Response.json({ error: 'Invalid invitation type' }, { status: 400 });
      }

      console.log('📨 Sending email to:', email);
      
      // Usar la función sendEmail que usa Resend
      await base44.asServiceRole.functions.invoke('sendEmail', {
        to: email,
        subject: emailSubject,
        html: emailBody
      });

      console.log('✅ Email sent successfully');
      return Response.json({ success: true, message: 'Invitation sent successfully' });
    } catch (error) {
      console.error('❌ Error sending email:', error);
      console.error('Error stack:', error.stack);
      return Response.json({ error: 'Failed to send invitation email', details: error.message, stack: error.stack }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in createUserAndSendInvitation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

function generateSecondParentEmail(nombreDestino, nombreInvitador, nombreJugador, validationUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;background-color:#f1f5f9;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

<tr>
<td bgcolor="#ea580c" style="padding:30px;text-align:center;">
<img src="${CLUB_LOGO_URL}" alt="CD Bustarviejo" width="80" height="80" style="width:80px;height:80px;border-radius:12px;border:3px solid #ffffff;display:block;margin:0 auto;">
<h1 style="color:#ffffff;margin:15px 0 5px 0;font-size:26px;font-family:Arial,Helvetica,sans-serif;">CD BUSTARVIEJO</h1>
<p style="color:#fed7aa;margin:0;font-size:14px;">Club Deportivo</p>
</td>
</tr>

<tr>
<td bgcolor="#ffffff" style="padding:30px;">
<h2 style="color:#1e293b;margin:0 0 15px 0;font-size:22px;text-align:center;font-family:Arial,Helvetica,sans-serif;">👋 ¡Te han invitado!</h2>

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
Hola <strong>${nombreDestino}</strong>,
</p>

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
<strong style="color:#ea580c;">${nombreInvitador}</strong> te ha invitado a unirte a la aplicación del CD Bustarviejo como <strong>segundo progenitor</strong> de <strong>${nombreJugador}</strong>.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:25px;">
<tr>
<td bgcolor="#f0fdf4" style="padding:15px;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;">
<p style="color:#166534;font-size:14px;margin:0;"><strong>✅ ¿Qué podrás hacer?</strong></p>
<ul style="color:#166534;font-size:13px;margin:10px 0 0 0;padding-left:20px;">
<li>Acceso completo a toda la información de tu hijo/a</li>
<li>Ver convocatorias y confirmar asistencia</li>
<li>Hacer pagos de cuotas y equipación</li>
<li>Chatear con entrenadores y coordinador</li>
<li>Ver calendario, documentos y galería</li>
</ul>
</td>
</tr>
</table>

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 25px 0;text-align:center;">
Para completar tu registro, haz clic en el botón:
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 25px auto;">
<tr>
<td bgcolor="#ea580c" style="border-radius:8px;">
<a href="${validationUrl}" target="_blank" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 35px;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;">COMPLETAR REGISTRO →</a>
</td>
</tr>
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
<tr>
<td bgcolor="#fef3c7" style="padding:15px;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
<p style="color:#92400e;font-size:13px;margin:0;">⏰ <strong>Este enlace es válido durante 30 días.</strong></p>
</td>
</tr>
</table>

<p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Si no esperabas este email, puedes ignorarlo.</p>
</td>
</tr>

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

function generateAdminInvitationEmail(nombreDestino, validationUrl, mensajePersonalizado) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;background-color:#f1f5f9;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

<tr>
<td bgcolor="#ea580c" style="padding:30px;text-align:center;">
<img src="${CLUB_LOGO_URL}" alt="CD Bustarviejo" width="80" height="80" style="width:80px;height:80px;border-radius:12px;border:3px solid #ffffff;display:block;margin:0 auto;">
<h1 style="color:#ffffff;margin:15px 0 5px 0;font-size:26px;font-family:Arial,Helvetica,sans-serif;">CD BUSTARVIEJO</h1>
<p style="color:#fed7aa;margin:0;font-size:14px;">Club Deportivo</p>
</td>
</tr>

<tr>
<td bgcolor="#ffffff" style="padding:30px;">
<h2 style="color:#1e293b;margin:0 0 15px 0;font-size:22px;text-align:center;font-family:Arial,Helvetica,sans-serif;">📧 ¡Bienvenido/a!</h2>

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
Hola <strong>${nombreDestino || 'familiar'}</strong>,
</p>

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
Has sido invitado/a a formar parte de la aplicación del <strong>CD Bustarviejo</strong>.
</p>

${mensajePersonalizado ? `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:25px;">
<tr>
<td bgcolor="#f0f9ff" style="padding:15px;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;">
<p style="color:#1e40af;font-size:14px;margin:0;white-space:pre-wrap;">${mensajePersonalizado}</p>
</td>
</tr>
</table>
` : ''}

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 25px 0;text-align:center;">
Para completar tu registro, haz clic en el botón:
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 25px auto;">
<tr>
<td bgcolor="#ea580c" style="border-radius:8px;">
<a href="${validationUrl}" target="_blank" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 35px;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;">COMPLETAR REGISTRO →</a>
</td>
</tr>
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
<tr>
<td bgcolor="#fef3c7" style="padding:15px;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
<p style="color:#92400e;font-size:13px;margin:0;">⏰ <strong>Este enlace es válido durante 30 días.</strong></p>
</td>
</tr>
</table>

<p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Si no esperabas este email, puedes ignorarlo.</p>
</td>
</tr>

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