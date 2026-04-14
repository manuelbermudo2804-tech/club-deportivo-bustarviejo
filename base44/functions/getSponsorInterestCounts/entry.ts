import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const allInterests = await base44.asServiceRole.entities.SponsorInterest.filter({});
    
    const counts = {};
    for (const interest of allInterests) {
      counts[interest.posicion] = (counts[interest.posicion] || 0) + 1;
    }

    // Obtener fecha límite de patrocinios desde SeasonConfig activa
    let fecha_limite = null;
    try {
      const seasons = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      if (seasons.length > 0 && seasons[0].fecha_limite_patrocinios) {
        fecha_limite = seasons[0].fecha_limite_patrocinios;
      }
    } catch {}

    return Response.json({ counts, fecha_limite });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});