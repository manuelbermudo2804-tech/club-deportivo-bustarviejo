import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Devuelve todos los datos públicos de un torneo por su slug:
// torneo + categorías + grupos + equipos + partidos.
// Solo expone torneos publicados / en curso / finalizados (no borradores/archivados).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { slug } = await req.json();
    if (!slug) return Response.json({ error: 'slug requerido' }, { status: 400 });

    const torneos = await base44.asServiceRole.entities.Torneo.filter({ slug });
    const torneo = torneos[0];
    if (!torneo) return Response.json({ torneo: null }, { status: 200 });

    if (['borrador', 'archivado'].includes(torneo.estado)) {
      return Response.json({ torneo: null, oculto: true }, { status: 200 });
    }

    const [categorias, grupos, equipos, partidos] = await Promise.all([
      base44.asServiceRole.entities.TorneoCategoria.filter({ torneo_id: torneo.id }),
      base44.asServiceRole.entities.TorneoGrupo.filter({ torneo_id: torneo.id }),
      base44.asServiceRole.entities.TorneoEquipo.filter({ torneo_id: torneo.id }),
      base44.asServiceRole.entities.TorneoPartido.filter({ torneo_id: torneo.id }),
    ]);

    return Response.json({ torneo, categorias, grupos, equipos, partidos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});