import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { nombre, telefono, disponibilidad_manana, disponibilidad_tarde, notas } = body;

    if (!nombre || !telefono) {
      return Response.json({ error: 'Nombre y teléfono son obligatorios' }, { status: 400 });
    }

    const record = await base44.asServiceRole.entities.SanIsidroVoluntario.create({
      nombre,
      telefono,
      disponibilidad_manana: !!disponibilidad_manana,
      disponibilidad_tarde: !!disponibilidad_tarde,
      notas: notas || '',
      estado: 'pendiente'
    });

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});