import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { categoria, temporada, dias_adelante } = await req.json();

    // Buscar configuración del equipo
    const configs = await base44.asServiceRole.entities.TeamConfig.filter({
      categoria_interna: categoria,
      temporada: temporada || "2024-2025",
      activo: true
    });

    if (!configs || configs.length === 0) {
      return Response.json({
        success: false,
        error: `No hay configuración para la categoría "${categoria}". Configura el equipo en TeamConfig.`
      });
    }

    const config = configs[0];
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + (dias_adelante || 60));

    const searchQuery = config.url_calendario || 
      `calendario próximos partidos ${config.competicion_rffm} ${config.grupo_rffm || ''} ${config.nombre_equipo_rffm} RFFM temporada ${temporada}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Busca y extrae los próximos partidos del equipo "${config.nombre_equipo_rffm}" en la competición "${config.competicion_rffm}" ${config.grupo_rffm ? `${config.grupo_rffm}` : ''} de la RFFM para la temporada ${temporada}.

URL sugerida: ${config.url_calendario || 'https://www.rffm.es/competicion/calendario'}

Busca partidos desde hoy (${today.toISOString().split('T')[0]}) hasta ${futureDate.toISOString().split('T')[0]}.

Extrae para cada partido:
- fecha (formato YYYY-MM-DD)
- hora (HH:MM)
- local (equipo local)
- visitante (equipo visitante)
- ubicacion (campo/instalación)
- jornada (ej: "Jornada 10")
- resultado (si ya se jugó, formato "X-Y", sino null)

IMPORTANTE:
- Solo partidos FUTUROS o de las últimas 2 jornadas
- Busca específicamente partidos donde juegue "${config.nombre_equipo_rffm}"
- Indica si es local o visitante`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          matches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fecha: { type: "string" },
                hora: { type: "string" },
                local: { type: "string" },
                visitante: { type: "string" },
                ubicacion: { type: "string" },
                jornada: { type: "string" },
                resultado: { type: ["string", "null"] }
              }
            }
          },
          competicion: { type: "string" },
          grupo: { type: "string" }
        }
      }
    });

    if (!llmResponse?.matches) {
      return Response.json({
        success: false,
        error: "No se encontraron partidos próximos."
      });
    }

    const ourTeam = config.nombre_equipo_rffm;
    const matches = llmResponse.matches
      .filter(m => !m.resultado)
      .map(match => ({
        ...match,
        categoria: categoria,
        rival: match.local === ourTeam || match.local.includes("BUSTARVIEJO") ? match.visitante : match.local,
        local_visitante: match.local === ourTeam || match.local.includes("BUSTARVIEJO") ? "Local" : "Visitante",
        titulo: `${match.local} vs ${match.visitante}`,
        fuente: "rffm"
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    return Response.json({
      success: true,
      matches: matches,
      metadata: {
        categoria_interna: categoria,
        equipo: config.nombre_equipo_rffm,
        competicion: llmResponse.competicion || config.competicion_rffm,
        grupo: llmResponse.grupo || config.grupo_rffm,
        temporada: temporada,
        total_matches: matches.length
      }
    });

  } catch (error) {
    console.error("Error en getUpcomingMatches:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});