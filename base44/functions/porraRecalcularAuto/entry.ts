import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint disparado por automation de entidad cuando se actualiza un PorraPartido
// o PorraConfig (resultados/campeón). Recalcula puntos de todos los pagados.
// NO requiere auth admin porque lo dispara el sistema, no un usuario.
// Replica la lógica de porraCalcularPuntos pero sin la guardia de admin.

function calcularPuntosParticipante(participante, partidos, config) {
  const pts = { grupos: 0, terceros: 0, eliminatorias: 0, tercer_puesto: 0, campeon: 0, especiales: 0 };
  const partidosFinalizados = partidos.filter(p => p.finalizado);

  const ptsGrupo = config?.puntos_resultado_grupo ?? 1;
  const predGrupos = participante.predicciones_grupos || {};
  partidosFinalizados.forEach(p => {
    if (p.fase === 'grupos' && p.resultado_real && predGrupos[p.id] === p.resultado_real) {
      pts.grupos += ptsGrupo;
    }
  });

  const ptsTercero = config?.puntos_mejor_tercero ?? 10;
  const tercerosReales = config?.mejores_terceros_reales || [];
  const tercerosPredichos = participante.mejores_terceros || [];
  if (tercerosReales.length > 0 && tercerosPredichos.length > 0) {
    tercerosPredichos.forEach(c => { if (tercerosReales.includes(c)) pts.terceros += ptsTercero; });
  }

  const predElim = participante.predicciones_eliminatorias || {};
  const puntosPorFase = {
    '16avos': config?.puntos_16avos ?? 4,
    '8vos':   config?.puntos_8vos   ?? 6,
    '4tos':   config?.puntos_4tos   ?? 10,
    'semis':  config?.puntos_semis  ?? 14,
    'final':  config?.puntos_final  ?? 20,
  };

  const equiposRealesPorFase = (fase) => {
    const set = new Set();
    partidos.forEach(p => {
      if (p.fase !== fase) return;
      if (p.equipo_local_codigo) set.add(p.equipo_local_codigo);
      if (p.equipo_visitante_codigo) set.add(p.equipo_visitante_codigo);
    });
    return set;
  };

  const equiposPredichosPorFase = (fase) => {
    const set = new Set();
    if (fase === '16avos') {
      const clasif = participante.clasificacion_grupos || {};
      Object.values(clasif).forEach(arr => {
        if (Array.isArray(arr)) {
          if (arr[0]) set.add(arr[0]);
          if (arr[1]) set.add(arr[1]);
        }
      });
      (participante.mejores_terceros || []).forEach(c => { if (c) set.add(c); });
      return set;
    }
    const faseAnterior = { '8vos': '16avos', '4tos': '8vos', 'semis': '4tos', 'final': 'semis' }[fase];
    if (!faseAnterior) return set;
    partidos.forEach(p => {
      if (p.fase !== faseAnterior) return;
      const ganadorPredicho = predElim[p.id];
      if (ganadorPredicho) set.add(ganadorPredicho);
    });
    return set;
  };

  ['16avos', '8vos', '4tos', 'semis', 'final'].forEach(fase => {
    const reales = equiposRealesPorFase(fase);
    if (reales.size === 0) return;
    const predichos = equiposPredichosPorFase(fase);
    predichos.forEach(c => { if (reales.has(c)) pts.eliminatorias += puntosPorFase[fase]; });
  });

  if (config?.campeon_real) {
    const partidoFinal = partidos.find(p => p.fase === 'final');
    if (partidoFinal && predElim[partidoFinal.id] === config.campeon_real) {
      pts.campeon = config?.puntos_campeon ?? 25;
    }
  }

  const partidoTercero = partidosFinalizados.find(p => p.fase === 'tercer_puesto');
  if (partidoTercero?.ganador_codigo) {
    const predTercero = participante.prediccion_tercer_puesto || {};
    const ptsEquipo = config?.puntos_tercer_puesto_equipo ?? 10;
    const ptsGanador = config?.puntos_tercer_puesto_ganador ?? 14;
    [predTercero.equipo1, predTercero.equipo2].forEach(e => {
      if (e && (e === partidoTercero.equipo_local_codigo || e === partidoTercero.equipo_visitante_codigo)) {
        pts.tercer_puesto += ptsEquipo;
      }
    });
    if (predTercero.ganador && predTercero.ganador === partidoTercero.ganador_codigo) {
      pts.tercer_puesto += ptsGanador;
    }
  }

  const ptsEsp = config?.puntos_prediccion_especial ?? 10;
  const predEsp = participante.predicciones_especiales || {};
  const realEsp = config?.resultados_especiales_reales || {};
  ['mejor_jugador', 'maximo_goleador', 'mejor_portero', 'mejor_joven'].forEach(k => {
    if (predEsp[k] && realEsp[k] && predEsp[k] === realEsp[k]) pts.especiales += ptsEsp;
  });

  const total = pts.grupos + pts.terceros + pts.eliminatorias + pts.tercer_puesto + pts.campeon + pts.especiales;
  return {
    puntos_grupos: pts.grupos,
    puntos_terceros: pts.terceros,
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

    const [configs, partidos, pagados] = await Promise.all([
      base44.asServiceRole.entities.PorraConfig.list(),
      base44.asServiceRole.entities.PorraPartido.list('', 200),
      base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' }),
    ]);

    const config = configs[0];
    if (!config) return Response.json({ skip: true, reason: 'sin config' });

    let actualizados = 0;
    // Procesar en paralelo por lotes de 20 — escala bien hasta 1.000+ participantes
    const BATCH = 20;
    for (let i = 0; i < pagados.length; i += BATCH) {
      const slice = pagados.slice(i, i + BATCH);
      await Promise.all(slice.map(async (p) => {
        try {
          const nuevos = calcularPuntosParticipante(p, partidos, config);
          await base44.asServiceRole.entities.PorraParticipante.update(p.id, nuevos);
          actualizados++;
        } catch (e) {
          console.error('[porraRecalcularAuto] error participante', p.id, e?.message);
        }
      }));
    }

    // Actualizar posiciones globales preservando posicion_anterior para mostrar ▲▼
    const recargados = await base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' });
    const ordenados = recargados.sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0));
    const cambios = [];
    for (let i = 0; i < ordenados.length; i++) {
      const nuevaPos = i + 1;
      const posActual = ordenados[i].posicion_ranking;
      if (posActual !== nuevaPos) {
        cambios.push({ id: ordenados[i].id, posActual, nuevaPos });
      }
    }
    const BATCH_POS = 20;
    for (let i = 0; i < cambios.length; i += BATCH_POS) {
      const slice = cambios.slice(i, i + BATCH_POS);
      await Promise.all(slice.map(async (c) => {
        try {
          await base44.asServiceRole.entities.PorraParticipante.update(c.id, {
            posicion_anterior: c.posActual || c.nuevaPos,
            posicion_ranking: c.nuevaPos,
          });
        } catch {}
      }));
    }

    return Response.json({ success: true, actualizados, total: pagados.length });
  } catch (error) {
    console.error('[porraRecalcularAuto] error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});