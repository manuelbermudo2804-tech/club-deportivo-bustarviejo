import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { modalidad, nombre_responsable, telefono_responsable, email_responsable,
            jugador_nombre, nombre_equipo, jugador_1, jugador_2, jugador_3, notas } = body;

    if (!modalidad || !nombre_responsable || !telefono_responsable) {
      return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const data = {
      modalidad,
      nombre_responsable,
      telefono_responsable,
    };
    if (email_responsable) data.email_responsable = email_responsable;
    if (jugador_nombre) data.jugador_nombre = jugador_nombre;
    if (nombre_equipo) data.nombre_equipo = nombre_equipo;
    if (jugador_1) data.jugador_1 = jugador_1;
    if (jugador_2) data.jugador_2 = jugador_2;
    if (jugador_3) data.jugador_3 = jugador_3;
    if (notas) data.notas = notas;

    const record = await base44.asServiceRole.entities.SanIsidroRegistration.create(data);

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});