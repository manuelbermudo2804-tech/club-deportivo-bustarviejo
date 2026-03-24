import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Para automaciones entity, se ejecuta sin autenticación de usuario final
    // El payload viene directamente de la automación

    let payload;
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const { 
      member_id, 
      email, 
      nombre_socio,
      event,
      data: eventData,
      old_data: oldEventData
    } = payload;

    // Detectar si viene de automación (evento) o llamada directa
    const isFromAutomation = event && eventData;
    
    // Si es de automación, extraer datos del evento
    let finalEmail, finalNombre, finalMemberId;
    
    if (isFromAutomation) {
      // Solo enviar si el estado cambió de algo diferente a "Pagado" → "Pagado"
      const estadoPagado = eventData.estado_pago === "Pagado";
      const estadoAntesEraOtro = !oldEventData || oldEventData.estado_pago !== "Pagado";
      
      if (!estadoPagado || !estadoAntesEraOtro) {
        // No es un cambio a "Pagado", ignorar
        console.log('[sendMembershipWelcome] ℹ️ Evento ignorado - estado_pago no cambió a "Pagado"');
        return Response.json({ success: true, ignored: true, reason: 'Estado no es Pagado' });
      }
      
      finalEmail = eventData.email;
      finalNombre = eventData.nombre_completo;
      finalMemberId = event.entity_id;
    } else {
      // Llamada directa (para compatibilidad)
      finalEmail = email;
      finalNombre = nombre_socio;
      finalMemberId = member_id;
    }
    
    if (!finalEmail || !finalMemberId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('[sendMembershipWelcome] ❌ RESEND_API_KEY not configured');
      return Response.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Obtener datos completos del socio para el email premium
    let memberData = {};
    try {
      const members = await base44.asServiceRole.entities.ClubMember.filter({ id: finalMemberId });
      if (members?.[0]) memberData = members[0];
    } catch {}

    const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';

    const nombre = memberData.nombre_completo || finalNombre || 'socio/a';
    const numeroSocio = memberData.numero_socio || '';
    const temporada = memberData.temporada || '';
    const dni = memberData.dni || '';

    const row = (label, value, bg) => `<tr><td style="background:${bg};padding:10px 16px;border-bottom:1px solid #e0e0e0;font-size:11px;color:#888888;font-weight:600;text-transform:uppercase;width:120px">${label}</td><td style="background:${bg};padding:10px 16px;border-bottom:1px solid #e0e0e0;font-size:15px;color:#1a1a1a;font-weight:700">${value}</td></tr>`;
    let carnetRows = row('NOMBRE', nombre, '#f8f8f8');
    if (numeroSocio) carnetRows += row('Nº SOCIO', numeroSocio, '#ffffff');
    carnetRows += row('TEMPORADA', temporada, numeroSocio ? '#f8f8f8' : '#ffffff');
    if (dni) carnetRows += row('DNI', dni, numeroSocio ? '#ffffff' : '#f8f8f8');

    const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:#ea580c;padding:30px 24px;text-align:center">
<img src="${LOGO_URL}" alt="CD Bustarviejo" width="70" height="70" style="border-radius:14px;border:3px solid rgba(255,255,255,0.4);display:block;margin:0 auto 12px"/>
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">🎉 ¡BIENVENIDO AL CLUB!</h1>
<p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px">CD Bustarviejo</p>
</div>
<div style="padding:28px 24px">
<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">¡Gracias por tu apoyo al CD Bustarviejo! Hemos confirmado tu pago y nos complace darte la bienvenida como <strong style="color:#ea580c">socio oficial</strong> para la temporada <strong>${temporada}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border:2px solid #ea580c;border-collapse:separate;overflow:hidden"><tr><td colspan="2" style="background:#ea580c;padding:12px 16px;color:#ffffff;font-size:16px;font-weight:700;text-align:center">CARNET DE SOCIO — CD BUSTARVIEJO</td></tr>${carnetRows}<tr><td colspan="2" style="background:#16a34a;padding:10px 16px;color:#ffffff;font-size:13px;font-weight:700;text-align:center">✅ SOCIO VERIFICADO</td></tr></table>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#f0fdf4;border-left:4px solid #22c55e"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>💚 ¡Gracias por formar parte de nuestra familia!</strong></p><p style="margin:4px 0;font-size:13px;color:#333333">Tu contribución es fundamental para el desarrollo de más de 200 jóvenes deportistas de Bustarviejo.</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#eff6ff;border-left:4px solid #3b82f6"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>📲 Guarda este email</strong> como comprobante de tu membresía.</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong><br/><span style="font-size:12px;color:#64748b">Tu club de siempre 💚</span></p>
</div>
<div style="background:#333333;padding:20px 24px;text-align:center"><p style="margin:4px 0;font-size:12px;color:#cccccc">📧 <a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none">cdbustarviejo@gmail.com</a> · <a href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES" style="color:#fb923c;text-decoration:none">C.D.BUSTARVIEJO@HOTMAIL.ES</a></p><p style="margin:10px 0 4px;font-size:12px;color:#cccccc">© ${new Date().getFullYear()} CD Bustarviejo · Todos los derechos reservados</p></div>
</div></body></html>`;

    console.log('[sendMembershipWelcome] 📧 Enviando email de bienvenida a:', email);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'noreply@cdbustarviejo.com',
        to: [finalEmail],
        subject: '🎉 ¡Bienvenido a CD Bustarviejo! Tu membresía está activada',
        html: welcomeHtml
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[sendMembershipWelcome] ❌ Error Resend:', {
        status: response.status,
        data: data
      });
      return Response.json({ 
        error: 'Failed to send email', 
        details: data
      }, { status: response.status });
    }

    console.log('[sendMembershipWelcome] ✅ Email de bienvenida enviado correctamente a:', finalEmail);
    
    // Marcar en el registro que se envió el email de bienvenida (solo si hay acceso al service role)
    try {
      const base44Service = base44.asServiceRole || base44;
      await base44Service.entities.ClubMember.update(finalMemberId, {
        email_bienvenida_enviado: true,
        fecha_email_bienvenida: new Date().toISOString()
      });
      console.log('[sendMembershipWelcome] ✅ Flag actualizado en ClubMember');
    } catch (updateError) {
      console.log('[sendMembershipWelcome] ℹ️ Info: No se pudo actualizar flag de email:', updateError.message);
    }

    return Response.json({ 
      success: true, 
      id: data.id,
      message: 'Welcome email sent successfully'
    });

  } catch (error) {
    console.error('[sendMembershipWelcome] Error:', error);
    return Response.json({ 
      error: error.message || 'Error sending welcome email' 
    }, { status: 500 });
  }
});