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

    // Enviar email de notificación al admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'cdbustarviejo@gmail.com',
        subject: `📋 Nuevo contacto web: ${nombre}`,
        body: `
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
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
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