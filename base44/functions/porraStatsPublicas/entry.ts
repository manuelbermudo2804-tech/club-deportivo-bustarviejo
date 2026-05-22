import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Cache en memoria (60s) — las estadísticas agregadas no necesitan ser exactas al segundo.
const STATS_CACHE = { data: null, expiresAt: 0 };
const STATS_CACHE_TTL_MS = 60_000;

// Devuelve estadísticas globales agregadas (qué % de gente predijo qué)
// para mostrar "63% eligió 1" en cada partido y enganchar al usuario
//
// Body: { partido_ids?: string[] } — si se pasa, filtra solo esos partidos
// Respuesta: {
//   grupos: { [partido_id]: { '1': 63, 'X': 20, '2': 17, total: 124 } },
//   eliminatorias: { [partido_id]: { [codigo]: 45, ... } },
//   total_participantes: 124
// }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cache hit
    const now = Date.now();
    if (STATS_CACHE.data && STATS_CACHE.expiresAt > now) {
      return Response.json({ ...STATS_CACHE.data, cached: true });
    }

    // Solo participantes pagados cuentan
    const participantes = await base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' });
    const total = participantes.length;

    if (total === 0) {
      return Response.json({ grupos: {}, eliminatorias: {}, total_participantes: 0 });
    }

    const grupos = {};       // { partido_id: { '1': count, 'X': count, '2': count, total } }
    const eliminatorias = {};

    participantes.forEach(p => {
      // Grupos
      Object.entries(p.predicciones_grupos || {}).forEach(([partidoId, resultado]) => {
        if (!grupos[partidoId]) grupos[partidoId] = { '1': 0, 'X': 0, '2': 0, total: 0 };
        if (['1', 'X', '2'].includes(resultado)) {
          grupos[partidoId][resultado]++;
          grupos[partidoId].total++;
        }
      });
      // Eliminatorias
      Object.entries(p.predicciones_eliminatorias || {}).forEach(([partidoId, codigo]) => {
        if (!eliminatorias[partidoId]) eliminatorias[partidoId] = { total: 0 };
        eliminatorias[partidoId][codigo] = (eliminatorias[partidoId][codigo] || 0) + 1;
        eliminatorias[partidoId].total++;
      });
    });

    // Convertir counts a porcentajes en grupos
    Object.keys(grupos).forEach(id => {
      const g = grupos[id];
      if (g.total > 0) {
        g['1_pct'] = Math.round((g['1'] / g.total) * 100);
        g['X_pct'] = Math.round((g['X'] / g.total) * 100);
        g['2_pct'] = Math.round((g['2'] / g.total) * 100);
      }
    });

    const respuesta = {
      grupos,
      eliminatorias,
      total_participantes: total,
    };
    STATS_CACHE.data = respuesta;
    STATS_CACHE.expiresAt = now + STATS_CACHE_TTL_MS;
    return Response.json(respuesta);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});