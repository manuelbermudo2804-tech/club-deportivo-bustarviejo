import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Crea una mini-liga para que un participante invite a sus amigos a competir
// Body: { token_acceso, nombre, descripcion? }
// Genera un código único de 6 caracteres y añade al creador como primer miembro
function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token_acceso, nombre, descripcion } = body;

    if (!token_acceso || !nombre) {
      return Response.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }
    if (nombre.length < 3 || nombre.length > 40) {
      return Response.json({ error: 'El nombre debe tener entre 3 y 40 caracteres' }, { status: 400 });
    }

    // Verificar participante
    const participantes = await base44.asServiceRole.entities.PorraParticipante.filter({ token_acceso });
    const participante = participantes[0];
    if (!participante) {
      return Response.json({ error: 'Participante no encontrado' }, { status: 404 });
    }
    if (participante.estado_pago !== 'pagado') {
      return Response.json({ error: 'Debes completar el pago primero' }, { status: 403 });
    }

    // Generar código único (reintenta hasta 5 veces si colisiona)
    let codigo = null;
    for (let intento = 0; intento < 5; intento++) {
      const candidato = generarCodigo();
      const existentes = await base44.asServiceRole.entities.PorraLiga.filter({ codigo: candidato });
      if (existentes.length === 0) { codigo = candidato; break; }
    }
    if (!codigo) {
      return Response.json({ error: 'No se pudo generar código único, prueba de nuevo' }, { status: 500 });
    }

    // Crear liga
    const liga = await base44.asServiceRole.entities.PorraLiga.create({
      nombre: nombre.trim(),
      codigo,
      descripcion: descripcion?.trim() || '',
      creador_email: participante.email,
      creador_nombre: participante.nombre,
      participantes_emails: [participante.email],
      publica: true,
    });

    // Añadir el código a las mini-ligas del participante
    const ligasActuales = participante.mini_liga_codigos || [];
    if (!ligasActuales.includes(codigo)) {
      await base44.asServiceRole.entities.PorraParticipante.update(participante.id, {
        mini_liga_codigos: [...ligasActuales, codigo],
      });
    }

    return Response.json({ success: true, liga, codigo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});