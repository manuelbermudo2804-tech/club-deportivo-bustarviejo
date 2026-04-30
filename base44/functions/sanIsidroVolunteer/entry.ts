import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Configuración de turnos (espejo de components/sanisidro/turnosConfig.js)
const TURNOS = {
  turno_1: { plazas: 6,  forzarCompleto: false, label: 'Turno 1 (11:00 - 13:00)' },
  turno_2: { plazas: 7,  forzarCompleto: false, label: 'Turno 2 (13:00 - 16:00)' },
  turno_3: { plazas: 7,  forzarCompleto: true,  label: 'Turno 3 (16:00 - 19:00)' },
  turno_4: { plazas: 7,  forzarCompleto: false, label: 'Turno 4 (19:00 - cierre)' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { nombre, telefono, turno, notas } = body;

    if (!nombre || !telefono) {
      return Response.json({ error: 'Nombre y teléfono son obligatorios' }, { status: 400 });
    }
    if (!turno || !TURNOS[turno]) {
      return Response.json({ error: 'Debes seleccionar un turno válido' }, { status: 400 });
    }

    // Validar teléfono español
    const cleanPhone = (p) => (p || '').replace(/[\s\-().+]/g, '').replace(/^34/, '');
    const phone = cleanPhone(telefono);
    const FAKE = [/^(\d)\1{8}$/, /^123456789$/, /^987654321$/, /^000000000$/];
    if (phone.length !== 9 || !/^[679]/.test(phone) || FAKE.some(p => p.test(phone))) {
      return Response.json({ error: 'El teléfono no es válido. Introduce un número español real.' }, { status: 400 });
    }

    const config = TURNOS[turno];

    // Validar cupo del turno
    const todos = await base44.asServiceRole.entities.SanIsidroVoluntario.list('-created_date', 1000);
    const ocupadas = todos.filter(v => v.turno === turno && v.estado !== 'descartado').length;

    if (config.forzarCompleto) {
      return Response.json({ error: `${config.label} está completo` }, { status: 409 });
    }
    if (ocupadas >= config.plazas) {
      return Response.json({ error: `${config.label} está completo. Elige otro turno.` }, { status: 409 });
    }

    const record = await base44.asServiceRole.entities.SanIsidroVoluntario.create({
      nombre,
      telefono,
      turno,
      notas: notas || '',
      estado: 'pendiente'
    });

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});