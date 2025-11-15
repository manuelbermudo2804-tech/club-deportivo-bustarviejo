import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { categoria, temporada, source } = await req.json();

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
    const searchQuery = config.url_clasificacion || 
      `clasificación ${config.competicion_rffm} ${config.grupo_rffm || ''} ${config.nombre_equipo_rffm} RFFM temporada ${temporada}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Busca y extrae la clasificación del equipo "${config.nombre_equipo_rffm}" en la competición "${config.competicion_rffm}" ${config.grupo_rffm ? `${config.grupo_rffm}` : ''} de la RFFM (Real Federación de Fútbol de Madrid) para la temporada ${temporada}.

URL sugerida: ${config.url_clasificacion || 'https://www.rffm.es/competicion/clasificaciones'}

Extrae TODOS los equipos de la tabla de clasificación con:
- posicion (número)
- equipo (nombre completo)
- partidos_jugados
- ganados
- empatados  
- perdidos
- goles_favor
- goles_contra
- diferencia (goles_favor - goles_contra)
- puntos

IMPORTANTE: 
- Devuelve la clasificación COMPLETA de todos los equipos del grupo
- Busca específicamente "${config.nombre_equipo_rffm}"
- Los nombres de equipo deben ser EXACTOS como aparecen en la web`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          standings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                posicion: { type: "number" },
                equipo: { type: "string" },
                partidos_jugados: { type: "number" },
                ganados: { type: "number" },
                empatados: { type: "number" },
                perdidos: { type: "number" },
                goles_favor: { type: "number" },
                goles_contra: { type: "number" },
                diferencia: { type: "number" },
                puntos: { type: "number" }
              }
            }
          },
          grupo: { type: "string" },
          competicion: { type: "string" },
          jornada: { type: "string" }
        }
      }
    });

    if (!llmResponse?.standings || llmResponse.standings.length === 0) {
      return Response.json({
        success: false,
        error: "No se encontró la clasificación. Verifica que el equipo esté inscrito en esta competición."
      });
    }

    return Response.json({
      success: true,
      standings: llmResponse.standings,
      metadata: {
        categoria_interna: categoria,
        equipo: config.nombre_equipo_rffm,
        competicion: llmResponse.competicion || config.competicion_rffm,
        grupo: llmResponse.grupo || config.grupo_rffm,
        jornada: llmResponse.jornada,
        temporada: temporada,
        ultima_actualizacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error en getStandings:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});