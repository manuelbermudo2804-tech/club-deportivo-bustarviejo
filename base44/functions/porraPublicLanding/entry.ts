import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint PÚBLICO (sin auth) para la landing web.
// Devuelve: config, equipos y stats agregadas (participantes pagados + bote).
// Diseñado para que los visitantes anónimos NO necesiten saltarse RLS.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [configs, equipos, participantesPagados] = await Promise.all([
      base44.asServiceRole.entities.PorraConfig.list(),
      base44.asServiceRole.entities.PorraEquipo.list('grupo', 100),
      base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' }),
    ]);

    const config = configs[0] || null;
    const precio = Number(config?.precio_entrada || 15);
    const aporteClub = Number(config?.aporte_inicial_club) || 0;
    const totalParticipantes = participantesPagados.length;

    // No exponer datos sensibles (emails, tokens, predicciones) — solo lo necesario para la landing
    return Response.json({
      config: config ? {
        activa: !!config.activa,
        estado: config.estado,
        nombre_torneo: config.nombre_torneo,
        precio_entrada: precio,
        comision_club_porcentaje: config.comision_club_porcentaje,
        destino_comision_club: config.destino_comision_club,
        permitir_mini_ligas: !!config.permitir_mini_ligas,
        permitir_multiples_porras: !!config.permitir_multiples_porras,
        mostrar_ranking_publico: config.mostrar_ranking_publico !== false,
        fecha_limite_predicciones: config.fecha_limite_predicciones,
        fecha_inicio_mundial: config.fecha_inicio_mundial,
        aporte_inicial_club: aporteClub,
      } : null,
      equipos: equipos.map(e => ({
        codigo: e.codigo,
        nombre: e.nombre,
        bandera_emoji: e.bandera_emoji,
        grupo: e.grupo,
        confederacion: e.confederacion,
        es_anfitrion: e.es_anfitrion,
        orden_grupo: e.orden_grupo,
      })),
      stats: {
        total_participantes: totalParticipantes,
        bote: totalParticipantes * precio + aporteClub,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});