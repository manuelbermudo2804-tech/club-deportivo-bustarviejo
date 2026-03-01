import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { nombre, edad, telefono, email, deporte, futbol_femenino, categoria, experiencia, disponibilidad, mensaje } = body;

    if (!nombre) {
      return Response.json({ error: 'El nombre es obligatorio' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Crear registro en la entidad ContactForm usando service role (webhook público)
    const record = await base44.asServiceRole.entities.ContactForm.create({
      nombre: nombre || '',
      edad: edad || '',
      telefono: telefono || '',
      email: email || '',
      deporte: deporte || '',
      futbol_femenino: futbol_femenino || '',
      categoria: categoria || '',
      experiencia: experiencia || '',
      disponibilidad: disponibilidad || '',
      mensaje: mensaje || '',
      estado: 'nuevo',
    });

    // Enviar email de notificación al admin via Resend
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(to right, #ea580c, #16a34a); padding: 20px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0;">📋 Nuevo Contacto desde la Web</h2>
            </div>
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; font-weight: bold; color: #475569;">Nombre:</td><td style="padding: 8px;">${nombre}</td></tr>
                ${edad ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Edad:</td><td style="padding: 8px;">${edad}</td></tr>` : ''}
                ${telefono ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Teléfono:</td><td style="padding: 8px;">${telefono}</td></tr>` : ''}
                ${email ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Email:</td><td style="padding: 8px;">${email}</td></tr>` : ''}
                ${deporte ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Deporte:</td><td style="padding: 8px;">${deporte}</td></tr>` : ''}
                ${futbol_femenino ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Fútbol femenino:</td><td style="padding: 8px;">${futbol_femenino}</td></tr>` : ''}
                ${categoria ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Categoría:</td><td style="padding: 8px;">${categoria}</td></tr>` : ''}
                ${experiencia ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Experiencia:</td><td style="padding: 8px;">${experiencia}</td></tr>` : ''}
                ${disponibilidad ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Disponibilidad:</td><td style="padding: 8px;">${disponibilidad}</td></tr>` : ''}
                ${mensaje ? `<tr><td style="padding: 8px; font-weight: bold; color: #475569;">Mensaje:</td><td style="padding: 8px;">${mensaje}</td></tr>` : ''}
              </table>
              <p style="margin-top: 16px; color: #64748b; font-size: 13px;">Puedes gestionar este contacto desde la app en Contactos Web.</p>
            </div>
          </div>`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
            to: ['cdbustarviejo@gmail.com'],
            subject: `📋 Nuevo contacto web: ${nombre}`,
            html: emailHtml
          })
        });
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
    }

    // Enviar email de confirmación al contacto
    if (email) {
      try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          const confirmHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(to right, #ea580c, #16a34a); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 8px;">
                <h2 style="color: white; margin: 0;">¡Gracias por contactar con nosotros!</h2>
              </div>
              <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #1e293b; font-size: 16px;">Hola <strong>${nombre}</strong>,</p>
                <p style="color: #475569;">Hemos recibido tu solicitud de información correctamente. Un miembro de nuestro club se pondrá en contacto contigo lo antes posible.</p>
                <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; font-weight: bold;">Resumen de tu solicitud:</p>
                  ${deporte ? `<p style="margin: 4px 0; color: #334155;">⚽ Deporte: <strong>${deporte}</strong></p>` : ''}
                  ${categoria ? `<p style="margin: 4px 0; color: #334155;">📋 Categoría: <strong>${categoria}</strong></p>` : ''}
                  ${disponibilidad ? `<p style="margin: 4px 0; color: #334155;">🕐 Disponibilidad: <strong>${disponibilidad}</strong></p>` : ''}
                </div>
                <p style="color: #475569;">Mientras tanto, puedes seguirnos en nuestras redes sociales:</p>
                <p style="text-align: center; font-size: 20px;">
                  <a href="https://www.cdbustarviejo.com" style="text-decoration: none;">🌍</a>&nbsp;&nbsp;
                  <a href="https://www.instagram.com/cdbustarviejo/" style="text-decoration: none;">📸</a>&nbsp;&nbsp;
                  <a href="https://www.facebook.com/cdbustarviejo/" style="text-decoration: none;">👍</a>&nbsp;&nbsp;
                  <a href="https://x.com/CDBustarviejo" style="text-decoration: none;">🐦</a>
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Club Deportivo Bustarviejo · Desde 1989</p>
              </div>
            </div>`;
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
              to: [email],
              subject: '¡Gracias por contactar con CD Bustarviejo! ⚽',
              html: confirmHtml
            })
          });
        }
      } catch (confirmError) {
        console.error('Error sending confirmation email:', confirmError);
      }
    }

    return Response.json({ success: true, id: record.id }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
});