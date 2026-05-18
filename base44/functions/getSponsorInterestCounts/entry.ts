import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const allInterests = await base44.asServiceRole.entities.SponsorInterest.filter({});
    
    const counts = {};
    const adjudicadas = [];
    for (const interest of allInterests) {
      counts[interest.posicion] = (counts[interest.posicion] || 0) + 1;
      if (interest.estado === 'adjudicado') {
        adjudicadas.push(interest.posicion);
      }
    }

    // Obtener config de patrocinios desde SeasonConfig activa
    let fecha_limite = null;
    let campana_torneos_activa = false;
    let torneo_padel_fecha = '';
    let torneo_futsal_fecha = '';
    let torneo_padel_ocupado = false;
    let torneo_futsal_ocupado = false;
    try {
      const seasons = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      if (seasons.length > 0) {
        const s = seasons[0];
        if (s.fecha_limite_patrocinios) fecha_limite = s.fecha_limite_patrocinios;
        campana_torneos_activa = !!s.campana_torneos_activa;
        torneo_padel_fecha = s.torneo_padel_fecha || '';
        torneo_futsal_fecha = s.torneo_futsal_fecha || '';
        torneo_padel_ocupado = !!s.torneo_padel_ocupado;
        torneo_futsal_ocupado = !!s.torneo_futsal_ocupado;
      }
    } catch {}

    return Response.json({
      counts,
      adjudicadas,
      fecha_limite,
      campana_torneos_activa,
      torneo_padel_fecha,
      torneo_futsal_fecha,
      torneo_padel_ocupado,
      torneo_futsal_ocupado
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});