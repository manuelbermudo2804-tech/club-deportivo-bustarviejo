import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público: carga participante + config + equipos + partidos usando token mágico.
// No requiere autenticación — el token es el mecanismo de acceso.
// Body: { token: string }
// Respuesta: { participante, config, equipos, partidos } o { error }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.token;

    if (!token || typeof token !== 'string') {
      return Response.json({ error: 'Token no válido' }, { status: 400 });
    }

    const [parts, configs, equipos, partidos] = await Promise.all([
      base44.asServiceRole.entities.PorraParticipante.filter({ token_acceso: token }),
      base44.asServiceRole.entities.PorraConfig.list(),
      base44.asServiceRole.entities.PorraEquipo.list('grupo', 100),
      base44.asServiceRole.entities.PorraPartido.list('numero_partido', 200),
    ]);

    const participante = parts[0];
    if (!participante) {
      return Response.json({ error: 'Porra no encontrada' }, { status: 404 });
    }
    if (participante.estado_pago !== 'pagado') {
      return Response.json({ error: 'Pago pendiente' }, { status: 402 });
    }

    return Response.json({
      participante,
      config: configs[0] || null,
      equipos,
      partidos,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});