import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Devuelve el ranking público o filtrado por mini-liga
// Body: { codigo_liga?: 'XXXXXX', limite?: 100 }
// Si no hay codigo_liga → ranking global de todos los participantes pagados
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { codigo_liga, limite = 100 } = body;

    // Cargar config para saber si ranking público está activo
    const configs = await base44.asServiceRole.entities.PorraConfig.list();
    const config = configs[0];

    // Cargar participantes pagados
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
      // Si admin desactivó ranking público, devolver vacío
      if (config && config.mostrar_ranking_publico === false) {
        return Response.json({ ranking: [], total: 0, oculto: true });
      }
    }

    // Ordenar por puntos descendente
    const ordenados = filtrados
      .sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0))
      .slice(0, limite)
      .map((p, idx) => ({
        posicion: idx + 1,
        alias_equipo: p.alias_equipo,
        nombre: p.nombre,
        puntos_total: p.puntos_total || 0,
        puntos_grupos: p.puntos_grupos || 0,
        puntos_eliminatorias: p.puntos_eliminatorias || 0,
        puntos_especiales: p.puntos_especiales || 0,
        porcentaje_completado: p.porcentaje_completado || 0,
        completado: p.completado_grupos && p.completado_bracket && p.completado_especiales,
      }));

    return Response.json({
      ranking: ordenados,
      total: filtrados.length,
      liga: liga ? { nombre: liga.nombre, codigo: liga.codigo, descripcion: liga.descripcion } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});