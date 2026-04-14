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

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});