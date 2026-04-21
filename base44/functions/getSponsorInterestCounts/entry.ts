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

    // Obtener fecha límite de patrocinios desde SeasonConfig activa
    let fecha_limite = null;
    try {
      const seasons = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      if (seasons.length > 0 && seasons[0].fecha_limite_patrocinios) {
        fecha_limite = seasons[0].fecha_limite_patrocinios;
      }
    } catch {}

    return Response.json({ counts, adjudicadas, fecha_limite });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});