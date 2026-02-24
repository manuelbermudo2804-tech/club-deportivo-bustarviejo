import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RFFM Weekly Sync — runs Monday 8:00 AM
 * For each category with configured RFFM URLs:
 *   1. Sync standings (clasificación)
 *   2. Sync latest results
 *   3. Sync scorers (goleadores)
 */

function getCurrentSeason() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const configs = await base44.asServiceRole.entities.StandingsConfig.list();
    const temporada = getCurrentSeason();
    const summary = { standings: [], results: [], scorers: [], errors: [] };

    for (const config of configs) {
      const cat = config.categoria;

      // --- STANDINGS ---
      if (config.rfef_url) {
        try {
          const res = await base44.functions.invoke('rffmScraper', {
            action: 'standings', url: config.rfef_url,
          });
          const resData = res?.data || res;
          const standings = resData?.standings;
          if (standings?.length) {
            // Delete old standings for this category+season
            const old = await base44.asServiceRole.entities.Clasificacion.filter({ categoria: cat, temporada });
            for (const o of old) {
              await base44.asServiceRole.entities.Clasificacion.delete(o.id);
            }
            // Insert new
            const jornada = standings[0]?.pj || 0;
            const records = standings.map(s => ({
              temporada, categoria: cat, jornada,
              posicion: s.posicion, nombre_equipo: s.equipo,
              puntos: s.puntos, partidos_jugados: s.pj,
              ganados: s.pg, empatados: s.pe, perdidos: s.pp,
              goles_favor: s.gf, goles_contra: s.gc,
              fecha_actualizacion: new Date().toISOString(),
            }));
            await base44.asServiceRole.entities.Clasificacion.bulkCreate(records);
            summary.standings.push({ cat, teams: standings.length, jornada });
          }
        } catch (e) { summary.errors.push({ cat, type: 'standings', error: e.message }); }
      }

      // --- RESULTS (latest played jornada) ---
      if (config.rfef_results_url || config.rfef_url) {
        try {
          const url = config.rfef_results_url || config.rfef_url;
          const res = await base44.functions.invoke('rffmScraper', {
            action: 'all_results', url,
          });
          const resData = res?.data || res;
          const jornadas = resData?.jornadas;
          if (jornadas?.length) {
            // Find latest jornada with played matches
            const played = jornadas.filter(j => j.matches.some(m => m.jugado));
            const latest = played.length ? played[played.length - 1] : null;
            if (latest) {
              // Check if we already have this jornada
              const existing = await base44.asServiceRole.entities.Resultado.filter({
                categoria: cat, temporada, jornada: latest.jornada,
              });
              if (existing.length === 0) {
                // Insert new results
                const records = latest.matches.filter(m => m.jugado).map(m => ({
                  temporada, categoria: cat, jornada: latest.jornada,
                  local: m.local, visitante: m.visitante,
                  goles_local: m.goles_local, goles_visitante: m.goles_visitante,
                  estado: 'finalizado',
                  fecha_actualizacion: new Date().toISOString(),
                }));
                if (records.length) {
                  await base44.asServiceRole.entities.Resultado.bulkCreate(records);
                  summary.results.push({ cat, jornada: latest.jornada, matches: records.length });
                }
              } else {
                summary.results.push({ cat, jornada: latest.jornada, skipped: true });
              }
            }
          }
        } catch (e) { summary.errors.push({ cat, type: 'results', error: e.message }); }
      }

      // --- SCORERS ---
      if (config.rfef_scorers_url) {
        try {
          const res = await base44.functions.invoke('rffmScraper', {
            action: 'scorers', url: config.rfef_scorers_url,
          });
          const resDataS = res?.data || res;
          const scorers = resDataS?.scorers;
          if (scorers?.length) {
            // Delete old scorers for this category+season
            const old = await base44.asServiceRole.entities.Goleador.filter({ categoria: cat, temporada });
            for (const o of old) {
              await base44.asServiceRole.entities.Goleador.delete(o.id);
            }
            // Insert new
            const records = scorers.map((s, i) => ({
              temporada, categoria: cat,
              jugador_nombre: s.jugador, equipo: s.equipo,
              goles: s.goles, posicion: i + 1,
              fecha_actualizacion: new Date().toISOString(),
            }));
            await base44.asServiceRole.entities.Goleador.bulkCreate(records);
            summary.scorers.push({ cat, players: scorers.length });
          }
        } catch (e) { summary.errors.push({ cat, type: 'scorers', error: e.message }); }
      }
    }

    return Response.json({
      success: true,
      temporada,
      categories_checked: configs.length,
      summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});