import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Desglose TRANSPARENTE de puntos para el propio participante.
// Acceso por token mágico (no requiere login) — mismo patrón que porraGetByToken.
// Body: { token: 'xxx' }
// Reutiliza la misma lógica que porraAuditarPuntos pero filtrada por token.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!body.token) {
      return Response.json({ error: 'Falta token' }, { status: 400 });
    }

    const [configs, partidos, participantes, equipos] = await Promise.all([
      base44.asServiceRole.entities.PorraConfig.list(),
      base44.asServiceRole.entities.PorraPartido.list('', 200),
      base44.asServiceRole.entities.PorraParticipante.filter({ token_acceso: body.token }),
      base44.asServiceRole.entities.PorraEquipo.list('', 100),
    ]);

    const config = configs[0];
    const p = participantes[0];
    if (!config || !p) {
      return Response.json({ error: 'No encontrado' }, { status: 404 });
    }

    const equipoNombre = {};
    equipos.forEach(e => { equipoNombre[e.codigo] = `${e.bandera_emoji || ''} ${e.nombre}`.trim(); });
    const eq = (c) => c ? (equipoNombre[c] || c) : '—';

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
    const gruposPendientes = partidos.filter(m => m.fase === 'grupos' && !m.finalizado);

    const detalleGrupos = gruposFinalizados.map(m => {
      const pred = predGrupos[m.id];
      const acierta = pred && pred === m.resultado_real;
      return {
        id: m.id,
        grupo: m.grupo,
        numero: m.numero_partido,
        local: eq(m.equipo_local_codigo),
        visitante: eq(m.equipo_visitante_codigo),
        resultado_real: m.resultado_real,
        prediccion: pred || null,
        acierta,
        puntos: acierta ? ptsGrupo : 0,
      };
    }).sort((a, b) => (a.numero || 0) - (b.numero || 0));

    const ptsGrupos = detalleGrupos.filter(g => g.acierta).length * ptsGrupo;
    const grupos = {
      total_partidos_grupos: 72,
      partidos_jugados: gruposFinalizados.length,
      partidos_pendientes: gruposPendientes.length,
      aciertos: detalleGrupos.filter(g => g.acierta).length,
      fallos: detalleGrupos.filter(g => !g.acierta).length,
      puntos_por_acierto: ptsGrupo,
      puntos_total: ptsGrupos,
      detalle: detalleGrupos,
    };

    // ---------- MEJORES TERCEROS ----------
    // Cuentan en cuanto el admin ha cargado los terceros reales oficiales en config
    // (la fase de grupos ya ha terminado cuando se conocen los 8 mejores terceros).
    const tercerosReales = config?.mejores_terceros_reales || [];
    const tercerosPredichos = p.mejores_terceros || [];
    const tercerosAcertados = tercerosPredichos.filter(c => tercerosReales.includes(c));
    const tieneDatosTerceros = tercerosReales.length > 0;
    const mejoresTerceros = {
      hay_datos: tieneDatosTerceros,
      tus_predicciones: tercerosPredichos.map(c => ({ codigo: c, nombre: eq(c), acierta: tercerosReales.includes(c) })),
      reales: tercerosReales.map(c => ({ codigo: c, nombre: eq(c) })),
      num_aciertos: tercerosAcertados.length,
      puntos_por_acierto: ptsTercero,
      puntos_total: tercerosAcertados.length * ptsTercero,
    };

    // ---------- ELIMINATORIAS ----------
    const predElim = p.predicciones_eliminatorias || {};
    const fasesEliminatorias = ['16avos', '8vos', '4tos', 'semis', 'final'];

    const equiposRealesPorFase = (fase) => {
      const set = new Set();
      // Solo se consideran equipos "reales" de una fase cuando el admin ha marcado
      // sus partidos como finalizados. Así puede meter los equipos reales con
      // antelación sin que el desglose empiece a comparar/sumar antes de tiempo.
      partidos.forEach(m => {
        if (m.fase !== fase) return;
        if (!m.finalizado) return;
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

    const eliminatorias = {};
    let ptsElim = 0;
    fasesEliminatorias.forEach(fase => {
      const reales = equiposRealesPorFase(fase);
      const predichos = equiposPredichosPorFase(fase);
      const aciertos = [];
      const fallos = [];
      predichos.forEach(c => {
        if (reales.has(c)) aciertos.push({ codigo: c, nombre: eq(c) });
        else if (reales.size > 0) fallos.push({ codigo: c, nombre: eq(c) });
      });
      const ptsFase = aciertos.length * puntosPorFase[fase];
      ptsElim += ptsFase;
      eliminatorias[fase] = {
        hay_datos: reales.size > 0,
        puntos_por_acierto: puntosPorFase[fase],
        equipos_predichos: Array.from(predichos).map(c => ({ codigo: c, nombre: eq(c) })),
        equipos_reales: Array.from(reales).map(c => ({ codigo: c, nombre: eq(c) })),
        aciertos,
        fallos,
        num_aciertos: aciertos.length,
        puntos_total: ptsFase,
      };
    });

    // ---------- CAMPEÓN ----------
    const partidoFinal = partidos.find(m => m.fase === 'final');
    const predCampeon = partidoFinal ? predElim[partidoFinal.id] : null;
    const aciertaCampeon = !!config?.campeon_real && predCampeon === config.campeon_real;
    const campeon = {
      hay_datos: !!config?.campeon_real,
      tu_prediccion: predCampeon ? { codigo: predCampeon, nombre: eq(predCampeon) } : null,
      real: config?.campeon_real ? { codigo: config.campeon_real, nombre: eq(config.campeon_real) } : null,
      acierta: aciertaCampeon,
      puntos_por_acierto: config?.puntos_campeon ?? 25,
      puntos_total: aciertaCampeon ? (config?.puntos_campeon ?? 25) : 0,
    };

    // ---------- TERCER PUESTO ----------
    const partidoTercero = partidos.find(m => m.fase === 'tercer_puesto' && m.finalizado);
    const predTercero = p.prediccion_tercer_puesto || {};
    const ptsEqTercero = config?.puntos_tercer_puesto_equipo ?? 10;
    const ptsGanTercero = config?.puntos_tercer_puesto_ganador ?? 14;
    let ptsTercerPuesto = 0;
    const aciertosTercerPuesto = [];
    if (partidoTercero?.ganador_codigo) {
      [predTercero.equipo1, predTercero.equipo2].forEach(e => {
        if (e && (e === partidoTercero.equipo_local_codigo || e === partidoTercero.equipo_visitante_codigo)) {
          ptsTercerPuesto += ptsEqTercero;
          aciertosTercerPuesto.push({ tipo: 'equipo', codigo: e, nombre: eq(e), puntos: ptsEqTercero });
        }
      });
      if (predTercero.ganador && predTercero.ganador === partidoTercero.ganador_codigo) {
        ptsTercerPuesto += ptsGanTercero;
        aciertosTercerPuesto.push({ tipo: 'ganador', codigo: predTercero.ganador, nombre: eq(predTercero.ganador), puntos: ptsGanTercero });
      }
    }
    const tercerPuesto = {
      hay_datos: !!partidoTercero?.ganador_codigo,
      tu_prediccion: {
        equipo1: predTercero.equipo1 ? eq(predTercero.equipo1) : null,
        equipo2: predTercero.equipo2 ? eq(predTercero.equipo2) : null,
        ganador: predTercero.ganador ? eq(predTercero.ganador) : null,
      },
      real: partidoTercero ? {
        equipo1: eq(partidoTercero.equipo_local_codigo),
        equipo2: eq(partidoTercero.equipo_visitante_codigo),
        ganador: eq(partidoTercero.ganador_codigo),
      } : null,
      aciertos: aciertosTercerPuesto,
      puntos_total: ptsTercerPuesto,
    };

    // ---------- ESPECIALES ----------
    const ptsEsp = config?.puntos_prediccion_especial ?? 10;
    const predEsp = p.predicciones_especiales || {};
    const realEsp = config?.resultados_especiales_reales || {};
    const especialesLabels = {
      mejor_jugador: '⭐ Mejor Jugador',
      maximo_goleador: '⚽ Máximo Goleador (Bota de Oro)',
      mejor_portero: '🧤 Mejor Portero (Guante de Oro)',
      mejor_joven: '🌱 Mejor Jugador Joven',
    };
    const especiales = [];
    let ptsEspeciales = 0;
    Object.keys(especialesLabels).forEach(k => {
      const acierta = predEsp[k] && realEsp[k] && predEsp[k] === realEsp[k];
      if (acierta) ptsEspeciales += ptsEsp;
      especiales.push({
        clave: k,
        label: especialesLabels[k],
        tu_prediccion: predEsp[k] ? eq(predEsp[k]) : null,
        real: realEsp[k] ? eq(realEsp[k]) : null,
        hay_datos: !!realEsp[k],
        acierta: !!acierta,
        puntos: acierta ? ptsEsp : 0,
      });
    });

    // ---------- TOTAL ----------
    const total = ptsGrupos + mejoresTerceros.puntos_total + ptsElim + campeon.puntos_total + tercerPuesto.puntos_total + ptsEspeciales;

    return Response.json({
      participante: {
        nombre: p.nombre,
        alias: p.alias_equipo,
        puntos_total_guardado: p.puntos_total || 0,
      },
      resumen: {
        grupos: ptsGrupos,
        terceros: mejoresTerceros.puntos_total,
        eliminatorias: ptsElim,
        campeon: campeon.puntos_total,
        tercer_puesto: tercerPuesto.puntos_total,
        especiales: ptsEspeciales,
        total,
      },
      grupos,
      mejores_terceros: mejoresTerceros,
      eliminatorias,
      campeon,
      tercer_puesto: tercerPuesto,
      especiales,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});