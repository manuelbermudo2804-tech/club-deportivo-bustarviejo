import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const cors = { 'Access-Control-Allow-Origin': '*' };

  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const required = ['nickname', 'nombre', 'email', 'telefono', 'campeon', 'subcampeon', 'maximo_goleador', 'seleccion_sorpresa'];
    for (const f of required) {
      if (!body[f] || String(body[f]).trim() === '') {
        return Response.json({ success: false, error: `Falta el campo: ${f}` }, { status: 400, headers: cors });
      }
    }

    const nickname = String(body.nickname).trim();
    const email = String(body.email).trim().toLowerCase();

    // Verificar config: ¿está abierto?
    const configs = await base44.asServiceRole.entities.FantasyMundialConfig.list();
    const config = configs?.[0];
    if (config && config.abierto === false) {
      return Response.json({ success: false, error: 'Las inscripciones están cerradas' }, { status: 403, headers: cors });
    }
    if (config?.fecha_limite && new Date(config.fecha_limite) < new Date()) {
      return Response.json({ success: false, error: 'La fecha límite ha pasado' }, { status: 403, headers: cors });
    }

    // Comprobar nickname/email duplicado
    const existingNick = await base44.asServiceRole.entities.FantasyMundial.filter({ nickname });
    if (existingNick.length > 0) {
      return Response.json({ success: false, error: 'Ese nickname ya está en uso' }, { status: 409, headers: cors });
    }
    const existingEmail = await base44.asServiceRole.entities.FantasyMundial.filter({ email });
    if (existingEmail.length > 0) {
      return Response.json({ success: false, error: 'Ya hay una inscripción con ese email' }, { status: 409, headers: cors });
    }

    const entry = await base44.asServiceRole.entities.FantasyMundial.create({
      nickname,
      nombre: String(body.nombre).trim(),
      email,
      telefono: String(body.telefono).trim(),
      campeon: body.campeon,
      subcampeon: body.subcampeon,
      semifinalistas: Array.isArray(body.semifinalistas) ? body.semifinalistas : [],
      maximo_goleador: body.maximo_goleador,
      seleccion_sorpresa: body.seleccion_sorpresa,
      resultado_final_local: body.resultado_final_local ?? null,
      resultado_final_visitante: body.resultado_final_visitante ?? null,
      acepta_bases: true,
      estado_pago: 'pendiente',
      puntos_total: 0,
      predicciones_acertadas: 0,
      user_agent: body.user_agent || '',
    });

    return Response.json({ success: true, entry }, { headers: cors });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500, headers: cors });
  }
});