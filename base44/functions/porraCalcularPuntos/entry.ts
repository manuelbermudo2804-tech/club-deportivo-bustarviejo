import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Recalcula los puntos de TODOS los participantes según los resultados reales
// Se puede invocar manualmente desde el admin o automáticamente al actualizar un PorraPartido
// Body opcional: { participante_id?: 'xxx' } para recalcular solo uno

// Lógica de puntos (simplificada y balanceada):
// - Grupos: 1 pt por cada acierto 1/X/2 (máx 72)
// - Mejores terceros: 3 pts por cada equipo acertado (máx 24)
// - 16avos: 2 pts, 8vos: 3, 4tos: 5, semis: 7, final: 10
// - Campeón: 15 pts extra
// - Tercer puesto: 5 pts por equipo + 7 pts si acierta ganador
// - Especiales (4): 5 pts cada uno

function calcularPuntosParticipante(participante, partidos, config) {
  const pts = {
    grupos: 0,
    terceros: 0,
    eliminatorias: 0,
    tercer_puesto: 0,
    campeon: 0,
    especiales: 0,
  };

  const partidosFinalizados = partidos.filter(p => p.finalizado);

  // 1) Puntos de grupos (1/X/2)
  const ptsGrupo = config?.puntos_resultado_grupo ?? 1;
  const predGrupos = participante.predicciones_grupos || {};
  partidosFinalizados.forEach(p => {
    if (p.fase === 'grupos' && p.resultado_real && predGrupos[p.id] === p.resultado_real) {
      pts.grupos += ptsGrupo;
    }
  });

  // 2) Mejores terceros (3 pts por cada acierto)
  const ptsTercero = config?.puntos_mejor_tercero ?? 3;
  const tercerosReales = config?.mejores_terceros_reales || [];
  const tercerosPredichos = participante.mejores_terceros || [];
  if (tercerosReales.length > 0 && tercerosPredichos.length > 0) {
    tercerosPredichos.forEach(codigo => {
      if (tercerosReales.includes(codigo)) {
        pts.terceros += ptsTercero;
      }
    });
  }

  // 3) Puntos de eliminatorias (acertar ganador real de cada partido)
  const predElim = participante.predicciones_eliminatorias || {};
  const puntosPorFase = {
    '16avos': config?.puntos_16avos ?? 2,
    '8vos': config?.puntos_8vos ?? 3,
    '4tos': config?.puntos_4tos ?? 5,
    'semis': config?.puntos_semis ?? 7,
    'final': config?.puntos_final ?? 10,
  };
  partidosFinalizados.forEach(p => {
    if (puntosPorFase[p.fase] && p.ganador_codigo && predElim[p.id] === p.ganador_codigo) {
      pts.eliminatorias += puntosPorFase[p.fase];
    }
  });

  // 4) Campeón — puntúa contra config.campeon_real
  // ROBUSTO: busca el partido final aunque no esté finalizado; si la predicción del usuario
  // para ese partido coincide con el campeón real configurado por el admin → puntos.
  if (config?.campeon_real) {
    const partidoFinal = partidos.find(p => p.fase === 'final');
    if (partidoFinal && predElim[partidoFinal.id] === config.campeon_real) {
      pts.campeon = config?.puntos_campeon ?? 15;
    }
    // Fallback: si por alguna razón no hay partido final en BD pero el usuario sí
    // tiene una predicción guardada con la clave "final" o similar, no asignamos puntos
    // (no podemos asociarla de forma segura). Esto es defensivo, no debería ocurrir
    // si el admin generó los partidos correctamente.
  }

  // 5) Tercer puesto
  const partidoTercero = partidosFinalizados.find(p => p.fase === 'tercer_puesto');
  if (partidoTercero?.ganador_codigo) {
    const predTercero = participante.prediccion_tercer_puesto || {};
    const ptsEquipo = config?.puntos_tercer_puesto_equipo ?? 5;
    const ptsGanador = config?.puntos_tercer_puesto_ganador ?? 7;
    [predTercero.equipo1, predTercero.equipo2].forEach(e => {
      if (e && (e === partidoTercero.equipo_local_codigo || e === partidoTercero.equipo_visitante_codigo)) {
        pts.tercer_puesto += ptsEquipo;
      }
    });
    if (predTercero.ganador && predTercero.ganador === partidoTercero.ganador_codigo) {
      pts.tercer_puesto += ptsGanador;
    }
  }

  // 6) Especiales
  const ptsEsp = config?.puntos_prediccion_especial ?? 5;
  const predEsp = participante.predicciones_especiales || {};
  const realEsp = config?.resultados_especiales_reales || {};
  ['mejor_jugador', 'maximo_goleador', 'mejor_portero', 'mejor_joven'].forEach(k => {
    if (predEsp[k] && realEsp[k] && predEsp[k] === realEsp[k]) {
      pts.especiales += ptsEsp;
    }
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
    const body = await req.json().catch(() => ({}));

    // Solo admin puede recalcular puntos (evita DoS y manipulación)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

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

    for (const p of todos) {
      try {
        const nuevos = calcularPuntosParticipante(p, partidos, config);
        await base44.asServiceRole.entities.PorraParticipante.update(p.id, nuevos);
        actualizados++;
      } catch (e) {
        errores.push({ id: p.id, error: e.message });
      }
    }

    // Recalcular posiciones globales — guardamos posicion_anterior para mostrar ▲▼ en el ranking
    const recargados = await base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' });
    const ordenados = recargados.sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0));
    for (let i = 0; i < ordenados.length; i++) {
      const nuevaPos = i + 1;
      const posActual = ordenados[i].posicion_ranking;
      if (posActual !== nuevaPos) {
        try {
          await base44.asServiceRole.entities.PorraParticipante.update(ordenados[i].id, {
            posicion_anterior: posActual || nuevaPos, // si nunca tuvo posición, no se mueve
            posicion_ranking: nuevaPos,
          });
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