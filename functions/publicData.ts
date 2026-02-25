import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// API PÚBLICA - No requiere autenticación
// Devuelve datos deportivos para mostrar en la web del club

Deno.serve(async (req) => {
  // CORS headers para permitir llamadas desde cualquier web
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // Cache 5 minutos
  };

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Leer todos los datos en paralelo usando service role (público)
    const [proximosPartidos, resultados, clasificaciones, goleadores] = await Promise.all([
      base44.asServiceRole.entities.ProximoPartido.list('-fecha_iso', 50),
      base44.asServiceRole.entities.Resultado.filter({ estado: 'finalizado' }, '-jornada', 30),
      base44.asServiceRole.entities.Clasificacion.list('-puntos', 200),
      base44.asServiceRole.entities.Goleador.list('-goles', 50),
    ]);

    // Agrupar clasificaciones por categoría
    const clasificacionesPorCategoria = {};
    for (const c of clasificaciones) {
      if (!clasificacionesPorCategoria[c.categoria]) {
        clasificacionesPorCategoria[c.categoria] = [];
      }
      clasificacionesPorCategoria[c.categoria].push({
        posicion: c.posicion,
        equipo: c.nombre_equipo,
        puntos: c.puntos,
        pj: c.partidos_jugados || 0,
        pg: c.ganados || 0,
        pe: c.empatados || 0,
        pp: c.perdidos || 0,
        gf: c.goles_favor || 0,
        gc: c.goles_contra || 0,
      });
    }
    // Ordenar cada grupo por posición
    for (const cat of Object.keys(clasificacionesPorCategoria)) {
      clasificacionesPorCategoria[cat].sort((a, b) => a.posicion - b.posicion);
    }

    // Agrupar goleadores por categoría
    const goleadoresPorCategoria = {};
    for (const g of goleadores) {
      if (!goleadoresPorCategoria[g.categoria]) {
        goleadoresPorCategoria[g.categoria] = [];
      }
      goleadoresPorCategoria[g.categoria].push({
        posicion: g.posicion,
        jugador: g.jugador_nombre,
        equipo: g.equipo,
        goles: g.goles,
      });
    }

    // Agrupar resultados por categoría
    const resultadosPorCategoria = {};
    for (const r of resultados) {
      if (!resultadosPorCategoria[r.categoria]) {
        resultadosPorCategoria[r.categoria] = [];
      }
      resultadosPorCategoria[r.categoria].push({
        jornada: r.jornada,
        local: r.local,
        visitante: r.visitante,
        goles_local: r.goles_local,
        goles_visitante: r.goles_visitante,
      });
    }

    // Próximos partidos limpios
    const proximos = proximosPartidos.map(p => ({
      categoria: p.categoria,
      jornada: p.jornada,
      local: p.local,
      visitante: p.visitante,
      fecha: p.fecha,
      hora: p.hora,
      campo: p.campo,
      fecha_iso: p.fecha_iso,
    }));

    const data = {
      club: 'CD Bustarviejo',
      actualizado: new Date().toISOString(),
      proximos_partidos: proximos,
      resultados: resultadosPorCategoria,
      clasificaciones: clasificacionesPorCategoria,
      goleadores: goleadoresPorCategoria,
    };

    return Response.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error('Error en publicData:', error);
    return Response.json(
      { error: 'Error al obtener datos' },
      { status: 500, headers: corsHeaders }
    );
  }
});