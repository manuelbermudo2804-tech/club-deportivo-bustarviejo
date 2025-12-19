import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { league_id, clasificacion, source_url, scraped_at } = await req.json();

    if (!league_id || !Array.isArray(clasificacion)) {
      return Response.json({ 
        error: 'Payload inválido. Requiere: league_id y clasificacion (array)' 
      }, { status: 400 });
    }

    // 1️⃣ Borra clasificación anterior de esta liga
    const existingStandings = await base44.asServiceRole.entities.Standing.filter({ league_id });
    for (const standing of existingStandings) {
      await base44.asServiceRole.entities.Standing.delete(standing.id);
    }

    // 2️⃣ Inserta nueva clasificación
    const rows = clasificacion.map(row => ({
      league_id,
      posicion: Number(row.posicion) || 0,
      equipo: row.equipo || '',
      partidos_jugados: Number(row.partidos_jugados) || 0,
      ganados: Number(row.ganados) || 0,
      empatados: Number(row.empatados) || 0,
      perdidos: Number(row.perdidos) || 0,
      goles_favor: Number(row.goles_favor) || 0,
      goles_contra: Number(row.goles_contra) || 0,
      puntos: Number(row.puntos) || 0,
      source_url: source_url || '',
      scraped_at: scraped_at || new Date().toISOString()
    }));

    for (const row of rows) {
      await base44.asServiceRole.entities.Standing.create(row);
    }

    // 3️⃣ Actualiza la liga con última actualización
    await base44.asServiceRole.entities.LeagueConfig.update(league_id, {
      ultima_actualizacion: new Date().toISOString()
    });

    return Response.json({
      ok: true,
      equipos: rows.length,
      league_id,
      source_url,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en syncRFFMLeague:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});