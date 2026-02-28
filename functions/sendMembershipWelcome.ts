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

    const welcomeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; }
            .header { background: linear-gradient(135deg, #ea580c 0%, #22c55e 100%); color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 10px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 40px 20px; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #ea580c; font-size: 20px; margin-top: 0; }
            .benefits { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 15px 0; }
            .benefits ul { margin: 10px 0; padding-left: 20px; }
            .benefits li { margin: 8px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #22c55e 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
            .contact { background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡Bienvenido a la Familia CD Bustarviejo!</h1>
              <p>Tu membresía está activada</p>
            </div>

            <div class="content">
              <div class="section">
                <p>Estimado/a <strong>${nombre_socio || 'miembro'}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.8;">
                  Queremos expresarte nuestro <strong>más sincero agradecimiento</strong> por haber confiado en CD Bustarviejo y convertirte en socio del club. <br><br>
                  Tu apoyo es fundamental para que podamos seguir creciendo como comunidad deportiva y brindando las mejores oportunidades a nuestros jugadores.
                </p>
              </div>

              <div class="section">
                <h2>✨ Tu Membresía Está Activa</h2>
                <p>A partir de hoy, formas parte de una comunidad comprometida con el deporte y los valores del club. Accede a todos los beneficios de ser socio:</p>
                
                <div class="benefits">
                  <ul>
                    <li>✅ <strong>Apoyo directo al club</strong> y a nuestros deportistas</li>
                    <li>✅ <strong>Participación en actividades</strong> especiales</li>
                    <li>✅ <strong>Comunicación directa</strong> con la junta directiva</li>
                    <li>✅ <strong>Sentido de pertenencia</strong> a nuestra comunidad deportiva</li>
                  </ul>
                </div>
              </div>

              <div class="contact">
                <p><strong>¿Preguntas o sugerencias?</strong></p>
                <p>No dudes en contactarnos:<br>
                📧 <a href="mailto:cdbustarviejo@outlook.es">cdbustarviejo@outlook.es</a><br>
                🏢 CD Bustarviejo - Club Deportivo de Bustarviejo
                </p>
              </div>


            </div>

            <div class="footer">
              <p style="margin: 0;">© 2026 CD Bustarviejo - Todos los derechos reservados</p>
              <p style="margin: 5px 0 0 0;">Este es un correo automático del sistema de membresías. No responder a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

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