import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Recalcula los puntos de TODOS los participantes según los resultados reales
// Se puede invocar:
// - Manualmente desde el admin
// - Automáticamente cuando se actualiza un PorraPartido (trigger)
// Body opcional: { participante_id?: 'xxx' } para recalcular solo uno

// Lógica de puntos:
// - Grupos: 3 pts por cada acierto 1/X/2
// - 16avos: 4 pts por equipo clasificado
// - 8vos: 6 pts
// - 4tos: 10 pts
// - Semis: 14 pts
// - Final: 20 pts (acertar quién juega la final)
// - Campeón: 25 pts extra
// - Tercer puesto: 10 pts por equipo + 14 pts si acierta ganador
// - Especiales (4): 10 pts cada uno

function calcularPuntosParticipante(participante, partidos, config) {
  const pts = {
    grupos: 0,
    eliminatorias: 0,
    tercer_puesto: 0,
    campeon: 0,
    especiales: 0,
  };

  const partidosFinalizados = partidos.filter(p => p.finalizado);

  // 1) Puntos de grupos (1/X/2)
  const ptsGrupo = config?.puntos_resultado_grupo ?? 3;
  const predGrupos = participante.predicciones_grupos || {};
  partidosFinalizados.forEach(p => {
    if (p.fase === 'grupos' && p.resultado_real && predGrupos[p.id] === p.resultado_real) {
      pts.grupos += ptsGrupo;
    }
  });

  // 2) Puntos de eliminatorias (acertar equipos que avanzan a cada fase)
  // Estrategia simple: por cada eliminatoria finalizada, si el participante eligió al ganador real
  const predElim = participante.predicciones_eliminatorias || {};
  const puntosPorFase = {
    '16avos': config?.puntos_16avos ?? 4,
    '8vos': config?.puntos_8vos ?? 6,
    '4tos': config?.puntos_4tos ?? 10,
    'semis': config?.puntos_semis ?? 14,
    'final': config?.puntos_final ?? 20,
  };
  partidosFinalizados.forEach(p => {
    if (puntosPorFase[p.fase] && p.ganador_codigo && predElim[p.id] === p.ganador_codigo) {
      pts.eliminatorias += puntosPorFase[p.fase];
    }
  });

  // 3) Campeón (ganador del partido de la final)
  const partidoFinal = partidosFinalizados.find(p => p.fase === 'final');
  if (partidoFinal?.ganador_codigo && config?.campeon_real === partidoFinal.ganador_codigo) {
    if (predElim[partidoFinal.id] === config.campeon_real) {
      pts.campeon = config?.puntos_campeon ?? 25;
    }
  }

  // 4) Tercer puesto
  const partidoTercero = partidosFinalizados.find(p => p.fase === 'tercer_puesto');
  if (partidoTercero?.ganador_codigo) {
    const predTercero = participante.prediccion_tercer_puesto || {};
    const ptsEquipo = config?.puntos_tercer_puesto_equipo ?? 10;
    const ptsGanador = config?.puntos_tercer_puesto_ganador ?? 14;
    // 10 pts por cada equipo acertado
    [predTercero.equipo1, predTercero.equipo2].forEach(e => {
      if (e && (e === partidoTercero.equipo_local_codigo || e === partidoTercero.equipo_visitante_codigo)) {
        pts.tercer_puesto += ptsEquipo;
      }
    });
    // 14 pts si acertó el ganador
    if (predTercero.ganador && predTercero.ganador === partidoTercero.ganador_codigo) {
      pts.tercer_puesto += ptsGanador;
    }
  }

  // 5) Especiales
  const ptsEsp = config?.puntos_prediccion_especial ?? 10;
  const predEsp = participante.predicciones_especiales || {};
  const realEsp = config?.resultados_especiales_reales || {};
  ['mejor_jugador', 'maximo_goleador', 'mejor_portero', 'mejor_joven'].forEach(k => {
    if (predEsp[k] && realEsp[k] && predEsp[k] === realEsp[k]) {
      pts.especiales += ptsEsp;
    }
  });

  const total = pts.grupos + pts.eliminatorias + pts.tercer_puesto + pts.campeon + pts.especiales;

  return {
    puntos_grupos: pts.grupos,
    puntos_eliminatorias: pts.eliminatorias,
    puntos_tercer_puesto: pts.tercer_puesto,
    puntos_campeon: pts.campeon,
    puntos_especiales: pts.especiales,
    puntos_total: total,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Cargar config, partidos y participantes
    const [configs, partidos, todos] = await Promise.all([
      base44.asServiceRole.entities.PorraConfig.list(),
      base44.asServiceRole.entities.PorraPartido.list('', 200),
      body.participante_id
        ? base44.asServiceRole.entities.PorraParticipante.filter({ id: body.participante_id })
        : base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' }),
    ]);

    const config = configs[0];
    if (!config) {
      return Response.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    let actualizados = 0;
    const errores = [];

    // Procesar en bloques de 20 para no saturar
    for (const p of todos) {
      try {
        const nuevos = calcularPuntosParticipante(p, partidos, config);
        await base44.asServiceRole.entities.PorraParticipante.update(p.id, nuevos);
        actualizados++;
      } catch (e) {
        errores.push({ id: p.id, error: e.message });
      }
    }

    // Recalcular posiciones globales
    const recargados = await base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' });
    const ordenados = recargados.sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0));
    for (let i = 0; i < ordenados.length; i++) {
      if (ordenados[i].posicion_ranking !== i + 1) {
        try {
          await base44.asServiceRole.entities.PorraParticipante.update(ordenados[i].id, { posicion_ranking: i + 1 });
        } catch {}
      }
    }

    return Response.json({
      success: true,
      total_participantes: todos.length,
      actualizados,
      errores: errores.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});