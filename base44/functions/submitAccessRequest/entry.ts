import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, nombre_progenitor, categoria, nombre_jugador } = await req.json();

    if (!email || !nombre_progenitor || !categoria) {
      return Response.json({ error: 'Email, nombre y categoría son obligatorios' }, { status: 400 });
    }

    // Check for duplicate pending requests
    const existing = await base44.asServiceRole.entities.AccessRequest.filter({
      email: email.toLowerCase(),
      estado: 'pendiente',
    });

    if (existing.length > 0) {
      return Response.json({ error: 'Ya tienes una solicitud pendiente. Te enviaremos el código pronto.' }, { status: 400 });
    }

    // Create the request
    await base44.asServiceRole.entities.AccessRequest.create({
      email: email.toLowerCase(),
      nombre_progenitor,
      categoria,
      nombre_jugador: nombre_jugador || '',
      estado: 'pendiente',
    });

    // Notify admins via email
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const admins = allUsers.filter(u => u.role === 'admin').map(u => u.email).filter(Boolean);
        
        if (admins.length > 0) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
              to: admins,
              subject: `📬 Nueva solicitud de código: ${nombre_progenitor}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
                  <div style="background:linear-gradient(to right,#ea580c,#16a34a);padding:16px;border-radius:12px 12px 0 0">
                    <h2 style="color:white;margin:0">📬 Nueva solicitud de código de acceso</h2>
                  </div>
                  <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px">
                    <p><strong>Progenitor:</strong> ${nombre_progenitor}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Categoría:</strong> ${categoria}</p>
                    ${nombre_jugador ? `<p><strong>Jugador:</strong> ${nombre_jugador}</p>` : ''}
                    <p style="margin-top:16px;color:#64748b;font-size:13px">Ve a Códigos de Acceso → Solicitudes para enviarle el código.</p>
                  </div>
                </div>`
            })
          });
        }
      }
    } catch (emailErr) {
      console.error('Error sending admin notification:', emailErr);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});