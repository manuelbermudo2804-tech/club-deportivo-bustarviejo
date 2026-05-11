import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Devuelve el ranking público o filtrado por mini-liga
// Body: { codigo_liga?: 'XXXXXX', limite?: 100 }
//
// 🏅 REGLAS DE DESEMPATE (en cascada, se aplican a TODOS los puestos):
// 1. Más puntos totales
// 2. ¿Acertó al campeón? (puntos_campeon > 0)
// 3. Más puntos en el tramo final (final + semis + 3er puesto)
// 4. Más puntos en predicciones especiales
// 5. Más puntos en cuartos + octavos + 16avos (resto de eliminatorias)
// 6. Más puntos en fase de grupos (1X2)
// 7. Fecha de inscripción más temprana (created_date)
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { codigo_liga, limite = 100 } = body;

    const configs = await base44.asServiceRole.entities.PorraConfig.list();
    const config = configs[0];

    const todos = await base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' });

    let filtrados = todos;
    let liga = null;

    if (codigo_liga) {
      const codigoLimpio = codigo_liga.trim().toUpperCase();
      const ligas = await base44.asServiceRole.entities.PorraLiga.filter({ codigo: codigoLimpio });
      liga = ligas[0];
      if (!liga) {
        return Response.json({ error: 'Liga no encontrada' }, { status: 404 });
      }
      filtrados = todos.filter(p => (p.mini_liga_codigos || []).includes(codigoLimpio));
    } else {
      if (config && config.mostrar_ranking_publico === false) {
        return Response.json({ ranking: [], total: 0, oculto: true });
      }
    }

    // Helper: puntos del tramo final (estimado a partir de los breakdowns disponibles)
    // puntos_eliminatorias incluye TODAS las eliminatorias. Para separar el "tramo final"
    // usamos: puntos_campeon + puntos_tercer_puesto.
    // Es la mejor aproximación con los campos guardados actualmente.
    const tramoFinal = (p) => (p.puntos_campeon || 0) + (p.puntos_tercer_puesto || 0);

    // Comparador con las 7 reglas de desempate
    const comparar = (a, b) => {
      // 1. Puntos totales
      const dTotal = (b.puntos_total || 0) - (a.puntos_total || 0);
      if (dTotal !== 0) return dTotal;

      // 2. Acertó campeón
      const aCampeon = (a.puntos_campeon || 0) > 0 ? 1 : 0;
      const bCampeon = (b.puntos_campeon || 0) > 0 ? 1 : 0;
      if (bCampeon !== aCampeon) return bCampeon - aCampeon;

      // 3. Tramo final (campeón + 3er puesto)
      const dFinal = tramoFinal(b) - tramoFinal(a);
      if (dFinal !== 0) return dFinal;

      // 4. Especiales
      const dEsp = (b.puntos_especiales || 0) - (a.puntos_especiales || 0);
      if (dEsp !== 0) return dEsp;

      // 5. Resto de eliminatorias
      const dElim = (b.puntos_eliminatorias || 0) - (a.puntos_eliminatorias || 0);
      if (dElim !== 0) return dElim;

      // 6. Grupos (incluye mejores terceros también)
      const aGrupos = (a.puntos_grupos || 0) + (a.puntos_terceros || 0);
      const bGrupos = (b.puntos_grupos || 0) + (b.puntos_terceros || 0);
      if (bGrupos !== aGrupos) return bGrupos - aGrupos;

      // 7. Fecha de inscripción más temprana gana
      const fA = a.created_date ? new Date(a.created_date).getTime() : Infinity;
      const fB = b.created_date ? new Date(b.created_date).getTime() : Infinity;
      return fA - fB;
    };

    // Detectar motivo de desempate frente al participante anterior
    const motivoDesempate = (a, b) => {
      if (!b) return null;
      if ((a.puntos_total || 0) !== (b.puntos_total || 0)) return null; // no hay empate
      const aCampeon = (a.puntos_campeon || 0) > 0 ? 1 : 0;
      const bCampeon = (b.puntos_campeon || 0) > 0 ? 1 : 0;
      if (aCampeon !== bCampeon) return aCampeon > bCampeon ? 'campeon_acertado' : 'campeon_fallado';
      if (tramoFinal(a) !== tramoFinal(b)) return tramoFinal(a) > tramoFinal(b) ? 'tramo_final' : 'tramo_final_perdido';
      if ((a.puntos_especiales || 0) !== (b.puntos_especiales || 0)) return (a.puntos_especiales || 0) > (b.puntos_especiales || 0) ? 'especiales' : 'especiales_perdido';
      if ((a.puntos_eliminatorias || 0) !== (b.puntos_eliminatorias || 0)) return (a.puntos_eliminatorias || 0) > (b.puntos_eliminatorias || 0) ? 'eliminatorias' : 'eliminatorias_perdido';
      const aG = (a.puntos_grupos || 0) + (a.puntos_terceros || 0);
      const bG = (b.puntos_grupos || 0) + (b.puntos_terceros || 0);
      if (aG !== bG) return aG > bG ? 'grupos' : 'grupos_perdido';
      return 'inscripcion'; // último criterio
    };

    const ordenados = filtrados.sort(comparar).slice(0, limite);

    // Construir respuesta con metadatos de desempate
    const ranking = ordenados.map((p, idx) => {
      const anterior = idx > 0 ? ordenados[idx - 1] : null;
      const empateConAnterior = anterior && (p.puntos_total || 0) === (anterior.puntos_total || 0);
      return {
        posicion: idx + 1,
        alias_equipo: p.alias_equipo,
        nombre: p.nombre,
        puntos_total: p.puntos_total || 0,
        puntos_grupos: p.puntos_grupos || 0,
        puntos_eliminatorias: p.puntos_eliminatorias || 0,
        puntos_especiales: p.puntos_especiales || 0,
        puntos_campeon: p.puntos_campeon || 0,
        puntos_tercer_puesto: p.puntos_tercer_puesto || 0,
        puntos_terceros: p.puntos_terceros || 0,
        porcentaje_completado: p.porcentaje_completado || 0,
        completado: p.completado_grupos && p.completado_bracket && p.completado_especiales,
        empate_con_anterior: !!empateConAnterior,
        motivo_desempate: empateConAnterior ? motivoDesempate(p, anterior) : null,
      };
    });

    return Response.json({
      ranking,
      total: filtrados.length,
      liga: liga ? { nombre: liga.nombre, codigo: liga.codigo, descripcion: liga.descripcion } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});