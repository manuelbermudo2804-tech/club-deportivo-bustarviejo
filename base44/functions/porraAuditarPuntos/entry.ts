import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// AUDITORÍA TRANSPARENTE de los puntos de un participante.
// Devuelve un desglose partido a partido para que el admin pueda verificar
// matemáticamente que el cálculo es correcto. NO modifica nada en BD.
//
// Body: { participante_id: 'xxx' }
// Solo admin.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.participante_id) {
      return Response.json({ error: 'Falta participante_id' }, { status: 400 });
    }

    const [configs, partidos, participantes] = await Promise.all([
      base44.asServiceRole.entities.PorraConfig.list(),
      base44.asServiceRole.entities.PorraPartido.list('', 200),
      base44.asServiceRole.entities.PorraParticipante.filter({ id: body.participante_id }),
    ]);

    const config = configs[0];
    const p = participantes[0];
    if (!config || !p) {
      return Response.json({ error: 'No encontrado' }, { status: 404 });
    }

    const ptsGrupo = config?.puntos_resultado_grupo ?? 3;
    const ptsTercero = config?.puntos_mejor_tercero ?? 10;
    const puntosPorFase = {
      '16avos': config?.puntos_16avos ?? 4,
      '8vos':   config?.puntos_8vos   ?? 6,
      '4tos':   config?.puntos_4tos   ?? 10,
      'semis':  config?.puntos_semis  ?? 14,
      'final':  config?.puntos_final  ?? 20,
    };

    // ---------- GRUPOS ----------
    const predGrupos = p.predicciones_grupos || {};
    const gruposFinalizados = partidos.filter(m => m.fase === 'grupos' && m.finalizado && m.resultado_real);
    const gruposAcertados = [];
    const gruposFallados = [];
    gruposFinalizados.forEach(m => {
      const pred = predGrupos[m.id];
      const item = {
        partido_id: m.id,
        grupo: m.grupo,
        numero: m.numero_partido,
        local: m.equipo_local_codigo,
        visitante: m.equipo_visitante_codigo,
        resultado_real: m.resultado_real,
        prediccion: pred || '(sin predicción)',
      };
      if (pred && pred === m.resultado_real) {
        gruposAcertados.push(item);
      } else {
        gruposFallados.push(item);
      }
    });

    // ---------- MEJORES TERCEROS ----------
    const tercerosReales = config?.mejores_terceros_reales || [];
    const tercerosPredichos = p.mejores_terceros || [];
    const tercerosAcertados = tercerosPredichos.filter(c => tercerosReales.includes(c));

    // ---------- ELIMINATORIAS (modelo "equipo que llega a esa fase") ----------
    const predElim = p.predicciones_eliminatorias || {};
    const fasesEliminatorias = ['16avos', '8vos', '4tos', 'semis', 'final'];

    const equiposRealesPorFase = (fase) => {
      const set = new Set();
      partidos.forEach(m => {
        if (m.fase !== fase) return;
        if (m.equipo_local_codigo) set.add(m.equipo_local_codigo);
        if (m.equipo_visitante_codigo) set.add(m.equipo_visitante_codigo);
      });
      return set;
    };

    const equiposPredichosPorFase = (fase) => {
      const set = new Set();
      if (fase === '16avos') {
        const clasif = p.clasificacion_grupos || {};
        Object.values(clasif).forEach(arr => {
          if (Array.isArray(arr)) {
            if (arr[0]) set.add(arr[0]);
            if (arr[1]) set.add(arr[1]);
          }
        });
        (p.mejores_terceros || []).forEach(c => { if (c) set.add(c); });
        return set;
      }
      const faseAnterior = { '8vos': '16avos', '4tos': '8vos', 'semis': '4tos', 'final': 'semis' }[fase];
      if (!faseAnterior) return set;
      partidos.forEach(m => {
        if (m.fase !== faseAnterior) return;
        const ganadorPredicho = predElim[m.id];
        if (ganadorPredicho) set.add(ganadorPredicho);
      });
      return set;
    };

    const desgloseEliminatorias = {};
    fasesEliminatorias.forEach(fase => {
      const reales = equiposRealesPorFase(fase);
      const predichos = equiposPredichosPorFase(fase);
      const aciertos = [];
      predichos.forEach(c => { if (reales.has(c)) aciertos.push(c); });
      desgloseEliminatorias[fase] = {
        equipos_reales_en_fase: Array.from(reales).sort(),
        equipos_predichos_por_usuario: Array.from(predichos).sort(),
        equipos_acertados: aciertos.sort(),
        puntos_por_acierto: puntosPorFase[fase],
        puntos_obtenidos: aciertos.length * puntosPorFase[fase],
        hay_datos_reales: reales.size > 0,
      };
    });

    // ---------- CAMPEÓN ----------
    let campeon = { puntos: 0, detalle: 'Sin campeón_real configurado' };
    if (config?.campeon_real) {
      const partidoFinal = partidos.find(m => m.fase === 'final');
      const predFinal = partidoFinal ? predElim[partidoFinal.id] : null;
      const acierta = predFinal === config.campeon_real;
      campeon = {
        campeon_real: config.campeon_real,
        prediccion_usuario: predFinal,
        acierta,
        puntos: acierta ? (config?.puntos_campeon ?? 25) : 0,
      };
    }

    // ---------- TERCER PUESTO ----------
    let tercerPuesto = { puntos: 0, detalle: 'Sin partido de tercer puesto finalizado' };
    const partidoTercero = partidos.find(m => m.fase === 'tercer_puesto' && m.finalizado);
    if (partidoTercero?.ganador_codigo) {
      const predTercero = p.prediccion_tercer_puesto || {};
      const ptsEquipo = config?.puntos_tercer_puesto_equipo ?? 10;
      const ptsGanador = config?.puntos_tercer_puesto_ganador ?? 14;
      let puntos = 0;
      [predTercero.equipo1, predTercero.equipo2].forEach(e => {
        if (e && (e === partidoTercero.equipo_local_codigo || e === partidoTercero.equipo_visitante_codigo)) {
          puntos += ptsEquipo;
        }
      });
      if (predTercero.ganador && predTercero.ganador === partidoTercero.ganador_codigo) {
        puntos += ptsGanador;
      }
      tercerPuesto = { prediccion: predTercero, real: partidoTercero, puntos };
    }

    // ---------- ESPECIALES ----------
    const ptsEsp = config?.puntos_prediccion_especial ?? 10;
    const predEsp = p.predicciones_especiales || {};
    const realEsp = config?.resultados_especiales_reales || {};
    const especiales = {};
    let totalEspeciales = 0;
    ['mejor_jugador', 'maximo_goleador', 'mejor_portero', 'mejor_joven'].forEach(k => {
      const acierta = predEsp[k] && realEsp[k] && predEsp[k] === realEsp[k];
      if (acierta) totalEspeciales += ptsEsp;
      especiales[k] = {
        prediccion: predEsp[k] || null,
        real: realEsp[k] || null,
        acierta: !!acierta,
        puntos: acierta ? ptsEsp : 0,
      };
    });

    // ---------- TOTALES ----------
    const ptsGrupos = gruposAcertados.length * ptsGrupo;
    const ptsTerceros = tercerosAcertados.length * ptsTercero;
    const ptsElim = Object.values(desgloseEliminatorias).reduce((s, f) => s + f.puntos_obtenidos, 0);

    const totalCalculado = ptsGrupos + ptsTerceros + ptsElim + campeon.puntos + tercerPuesto.puntos + totalEspeciales;

    return Response.json({
      participante: {
        id: p.id,
        nombre: p.nombre,
        alias: p.alias_equipo,
      },
      resumen: {
        puntos_grupos_calculado: ptsGrupos,
        puntos_grupos_guardado: p.puntos_grupos || 0,
        puntos_terceros_calculado: ptsTerceros,
        puntos_terceros_guardado: p.puntos_terceros || 0,
        puntos_eliminatorias_calculado: ptsElim,
        puntos_eliminatorias_guardado: p.puntos_eliminatorias || 0,
        puntos_campeon_calculado: campeon.puntos,
        puntos_campeon_guardado: p.puntos_campeon || 0,
        puntos_tercer_puesto_calculado: tercerPuesto.puntos,
        puntos_tercer_puesto_guardado: p.puntos_tercer_puesto || 0,
        puntos_especiales_calculado: totalEspeciales,
        puntos_especiales_guardado: p.puntos_especiales || 0,
        total_calculado: totalCalculado,
        total_guardado: p.puntos_total || 0,
        coincide: totalCalculado === (p.puntos_total || 0),
      },
      grupos: {
        partidos_grupos_finalizados: gruposFinalizados.length,
        aciertos: gruposAcertados.length,
        fallos: gruposFallados.length,
        sin_prediccion: gruposFallados.filter(x => x.prediccion === '(sin predicción)').length,
        puntos_por_acierto: ptsGrupo,
        detalle_aciertos: gruposAcertados,
        detalle_fallos: gruposFallados,
      },
      mejores_terceros: {
        terceros_reales_configurados: tercerosReales,
        terceros_predichos_usuario: tercerosPredichos,
        aciertos: tercerosAcertados,
        num_aciertos: tercerosAcertados.length,
        puntos_por_acierto: ptsTercero,
        puntos_total: ptsTerceros,
      },
      eliminatorias: desgloseEliminatorias,
      campeon,
      tercer_puesto: tercerPuesto,
      especiales,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});