import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { posicion, nombre_comercio, nombre_contacto, email, telefono } = await req.json();

    if (!posicion || !nombre_comercio || !nombre_contacto || !email || !telefono) {
      return Response.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    // Crear registro con service role (es página pública, no hay usuario autenticado)
    await base44.asServiceRole.entities.SponsorInterest.create({
      posicion,
      nombre_comercio,
      nombre_contacto,
      email,
      telefono,
      estado: 'pendiente'
    });

    // Contar interesados en esa posición
    const allInterests = await base44.asServiceRole.entities.SponsorInterest.filter({ posicion });
    const count = allInterests.length;

    // Intentar enviar email al club (no bloquea si falla)
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'info@cdbustarviejo.com',
        subject: `🏟️ Nuevo interesado en patrocinio: ${posicion}`,
        body: `
          <h2>Nuevo interés en patrocinio de camiseta</h2>
          <p><strong>Posición:</strong> ${posicion}</p>
          <p><strong>Comercio:</strong> ${nombre_comercio}</p>
          <p><strong>Contacto:</strong> ${nombre_contacto}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Teléfono:</strong> ${telefono}</p>
          <hr/>
          <p>📊 <strong>Total de interesados en "${posicion}": ${count}</strong></p>
          ${count > 1 ? '<p style="color: #ea580c; font-weight: bold;">⚠️ Hay más de un interesado — se activará proceso de subasta.</p>' : ''}
        `
      });
    } catch (emailErr) {
      console.warn('Email notification failed (non-blocking):', emailErr.message);
    }

    return Response.json({ success: true, count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});