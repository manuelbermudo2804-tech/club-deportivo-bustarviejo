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

    const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9}
.ctn{max-width:600px;margin:0 auto;background:#fff;border-radius:0 0 16px 16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.hdr{background:linear-gradient(135deg,#ea580c,#22c55e);padding:30px 24px;text-align:center}
.hdr img{width:70px;height:70px;border-radius:14px;border:3px solid rgba(255,255,255,0.4);object-fit:cover;margin-bottom:12px}
.hdr h1{color:#fff;margin:0;font-size:24px;font-weight:800}
.hdr p{color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px}
.body{padding:28px 24px}
.body p{margin:12px 0;font-size:15px;line-height:1.7;color:#334155}
.body strong{color:#0f172a}
.carnet{background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px;padding:22px;margin:20px 0;border:2px solid #ea580c;box-shadow:0 8px 24px rgba(0,0,0,0.2)}
.carnet-row{display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:14px;margin-bottom:14px}
.carnet-logo{width:56px;height:56px;border-radius:10px;border:2px solid #ea580c;object-fit:cover}
.carnet-title{color:#fff;font-size:16px;font-weight:700;flex:1;text-align:center}
.carnet-title span{display:block;font-size:12px;color:#22c55e;font-weight:600;margin-top:2px}
.carnet-data p{margin:7px 0;font-size:13px;color:#e2e8f0}.carnet-data strong{color:#fb923c}
.carnet-badge{text-align:center;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.15)}
.badge{display:inline-block;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;padding:6px 18px;border-radius:8px;font-weight:700;font-size:13px}
.info-box{border-radius:12px;padding:16px;margin:18px 0}
.info-green{background:#f0fdf4;border-left:4px solid #22c55e}
.info-blue{background:#eff6ff;border-left:4px solid #3b82f6}
.info-box p{margin:4px 0;font-size:13px}
.ftr{background:#1e293b;padding:20px 24px;text-align:center}
.ftr p{margin:4px 0;font-size:12px;color:#94a3b8}
.ftr a{color:#fb923c;text-decoration:none}
</style></head><body><div class="ctn">
<div class="hdr"><img src="${LOGO_URL}" alt="CD Bustarviejo"/><h1>🎉 ¡BIENVENIDO AL CLUB!</h1><p>CD Bustarviejo</p></div>
<div class="body">
<p>Estimado/a <strong>${nombre}</strong>,</p>
<p>¡Gracias por tu apoyo al CD Bustarviejo! Hemos confirmado tu pago y nos complace darte la bienvenida como <strong style="color:#ea580c">socio oficial</strong> para la temporada <strong>${temporada}</strong>.</p>
<div class="carnet"><div class="carnet-row"><img src="${LOGO_URL}" alt="Logo" class="carnet-logo"/><div class="carnet-title">CARNET DE SOCIO<span>CD BUSTARVIEJO</span></div></div><div class="carnet-data"><p><strong>NOMBRE:</strong> ${nombre}</p>${numeroSocio ? `<p><strong>Nº SOCIO:</strong> ${numeroSocio}</p>` : ''}<p><strong>TEMPORADA:</strong> ${temporada}</p>${dni ? `<p><strong>DNI:</strong> ${dni}</p>` : ''}</div><div class="carnet-badge"><span class="badge">✅ SOCIO VERIFICADO</span></div></div>
<div class="info-box info-green"><p><strong>💚 ¡Gracias por formar parte de nuestra familia!</strong></p><p>Tu contribución es fundamental para el desarrollo de más de 200 jóvenes deportistas de Bustarviejo.</p></div>
<div class="info-box info-blue"><p><strong>📲 Guarda este email</strong> como comprobante de tu membresía.</p></div>
<p>Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong><br/><span style="font-size:12px;color:#64748b">Tu club de siempre 💚</span></p>
</div>
<div class="ftr"><p>📧 <a href="mailto:cdbustarviejo@gmail.com">cdbustarviejo@gmail.com</a> · <a href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES">C.D.BUSTARVIEJO@HOTMAIL.ES</a></p><p style="margin-top:10px">© ${new Date().getFullYear()} CD Bustarviejo · Todos los derechos reservados</p></div>
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