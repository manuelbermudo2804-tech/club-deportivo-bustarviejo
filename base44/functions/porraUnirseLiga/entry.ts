import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Une a un participante a una mini-liga existente usando su código
// Body: { token_acceso, codigo }
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token_acceso, codigo } = body;

    if (!token_acceso || !codigo) {
      return Response.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const codigoLimpio = codigo.trim().toUpperCase();

    // Verificar participante
    const participantes = await base44.asServiceRole.entities.PorraParticipante.filter({ token_acceso });
    const participante = participantes[0];
    if (!participante) {
      return Response.json({ error: 'Participante no encontrado' }, { status: 404 });
    }

    // Buscar la liga
    const ligas = await base44.asServiceRole.entities.PorraLiga.filter({ codigo: codigoLimpio });
    const liga = ligas[0];
    if (!liga) {
      return Response.json({ error: 'Código de liga no válido' }, { status: 404 });
    }

    // Ya está en la liga
    const ligasActuales = participante.mini_liga_codigos || [];
    if (ligasActuales.includes(codigoLimpio)) {
      return Response.json({ success: true, liga, mensaje: 'Ya estabas en esta liga' });
    }

    // Comprobar límite
    if (liga.max_participantes && (liga.participantes_emails?.length || 0) >= liga.max_participantes) {
      return Response.json({ error: 'La liga está completa' }, { status: 403 });
    }

    // Añadir a la liga
    const nuevosEmails = [...(liga.participantes_emails || []), participante.email];
    await base44.asServiceRole.entities.PorraLiga.update(liga.id, {
      participantes_emails: [...new Set(nuevosEmails)],
    });

    // Añadir al participante
    await base44.asServiceRole.entities.PorraParticipante.update(participante.id, {
      mini_liga_codigos: [...ligasActuales, codigoLimpio],
    });

    return Response.json({ success: true, liga, mensaje: '¡Te has unido a la liga!' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});