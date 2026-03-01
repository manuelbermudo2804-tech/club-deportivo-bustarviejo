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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const body = await req.json();
    const { nombre, email, telefono, categoria_interes, mensaje, origen } = body;

    if (!nombre || !email) {
      return Response.json(
        { error: 'nombre y email son obligatorios' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use service role to create the contact (webhook is unauthenticated)
    const base44 = createClientFromRequest(req);
    
    const contact = await base44.asServiceRole.entities.ContactRequest.create({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono || '',
      categoria_interes: categoria_interes || '',
      mensaje: mensaje || '',
      origen: origen || 'web',
      estado: 'nuevo',
    });

    // Send notification email to admin
    try {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (RESEND_API_KEY) {
        // Get admin users to notify
        const users = await base44.asServiceRole.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');
        
        for (const admin of admins.slice(0, 3)) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'CD Bustarviejo <noreply@base44.app>',
              to: admin.email,
              subject: `📩 Nuevo contacto web: ${nombre}`,
              html: `
                <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                  <div style="background:linear-gradient(135deg,#ea580c,#16a34a);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                    <h1 style="color:white;margin:0;font-size:20px;">📩 Nuevo Contacto Web</h1>
                  </div>
                  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 12px 12px;">
                    <p style="margin:0 0 8px;"><strong>👤 Nombre:</strong> ${nombre}</p>
                    <p style="margin:0 0 8px;"><strong>📧 Email:</strong> ${email}</p>
                    ${telefono ? `<p style="margin:0 0 8px;"><strong>📱 Teléfono:</strong> ${telefono}</p>` : ''}
                    ${categoria_interes ? `<p style="margin:0 0 8px;"><strong>⚽ Categoría:</strong> ${categoria_interes}</p>` : ''}
                    ${mensaje ? `<p style="margin:12px 0 0;padding:12px;background:#f8fafc;border-radius:8px;"><em>"${mensaje}"</em></p>` : ''}
                    <p style="margin:16px 0 0;color:#64748b;font-size:12px;">Gestiona este contacto desde la app → Contactos Web</p>
                  </div>
                </div>
              `,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.error('Error sending notification email:', emailErr);
    }

    return Response.json(
      { success: true, id: contact.id, message: 'Contacto recibido correctamente' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('contactWebhook error:', error);
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
});