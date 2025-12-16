import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const { token, formData } = await req.json();
    
    if (!token || !formData) {
      return Response.json({ 
        error: 'Token y datos del formulario requeridos' 
      }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    // Buscar la invitación
    const invitations = await base44.asServiceRole.entities.SecondParentInvitation.filter({ token });
    
    if (invitations.length === 0) {
      return Response.json({ 
        error: 'Invitación no encontrada' 
      }, { status: 404 });
    }
    
    const invitation = invitations[0];
    
    if (invitation.estado !== 'pendiente') {
      return Response.json({ 
        error: 'Esta invitación ya fue procesada' 
      }, { status: 400 });
    }
    
    // 1. Actualizar la invitación como aceptada
    await base44.asServiceRole.entities.SecondParentInvitation.update(invitation.id, {
      estado: 'aceptada',
      fecha_aceptacion: new Date().toISOString(),
      datos_completados: formData
    });
    
    // 2. Actualizar el jugador con los datos del segundo progenitor
    const players = await base44.asServiceRole.entities.Player.filter({ id: invitation.jugador_id });
    if (players.length > 0) {
      await base44.asServiceRole.entities.Player.update(invitation.jugador_id, {
        nombre_tutor_2: formData.nombre_completo,
        telefono_tutor_2: formData.telefono,
      });
    }
    
    // 3. Enviar email de confirmación
    const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
    
    await base44.asServiceRole.functions.invoke('sendEmail', {
      to: invitation.email_destino,
      subject: "✅ Registro completado - CD Bustarviejo",
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f1f5f9;">
<table cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr>
<td bgcolor="#ea580c" style="padding:30px;text-align:center;">
<img src="${CLUB_LOGO_URL}" alt="CD Bustarviejo" width="80" height="80" style="width:80px;height:80px;border-radius:12px;border:3px solid #ffffff;">
<h1 style="color:#ffffff;margin:15px 0 5px 0;font-size:26px;">CD BUSTARVIEJO</h1>
</td>
</tr>
<tr>
<td style="padding:30px;">
<h2 style="color:#16a34a;text-align:center;">✅ ¡Registro Completado!</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;">
Hola <strong>${formData.nombre_completo}</strong>,
</p>
<p style="color:#475569;font-size:15px;line-height:1.6;">
Tu registro como segundo progenitor de <strong>${invitation.jugador_nombre}</strong> se ha completado correctamente.
</p>
<p style="color:#475569;font-size:15px;line-height:1.6;">
Ahora puedes acceder a la aplicación del club con tu cuenta y ver toda la información de tu hijo/a.
</p>
<table align="center" style="margin:25px auto;">
<tr>
<td bgcolor="#ea580c" style="border-radius:8px;">
<a href="https://app.cdbustarviejo.com" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 35px;font-weight:bold;">ACCEDER A LA APP →</a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td bgcolor="#1e293b" style="padding:20px;text-align:center;">
<p style="color:#64748b;font-size:12px;margin:0;">cdbustarviejo@gmail.com</p>
</td>
</tr>
</table>
</body>
</html>`
    });
    
    // 4. Notificar al primer progenitor
    if (invitation.invitado_por_email) {
      await base44.asServiceRole.functions.invoke('sendEmail', {
        to: invitation.invitado_por_email,
        subject: `${formData.nombre_completo} ha completado su registro`,
        html: `<p>Hola ${invitation.invitado_por_nombre || ''},</p><p>${formData.nombre_completo} ha completado su registro como segundo progenitor de ${invitation.jugador_nombre}.</p><p>Ahora puede acceder a la aplicación del club con su propia cuenta.</p><p>Saludos,<br>CD Bustarviejo</p>`
      });
    }
    
    return Response.json({ 
      success: true,
      email: invitation.email_destino
    });
    
  } catch (error) {
    console.error('Error completing registration:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});