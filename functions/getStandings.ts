import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { categoria, temporada } = await req.json();

    const configs = await base44.asServiceRole.entities.TeamConfig.filter({
      categoria_interna: categoria,
      temporada: temporada || "2024-2025",
      activo: true
    });

    if (!configs || configs.length === 0) {
      return Response.json({
        success: false,
        error: `No hay configuración para "${categoria}"`
      });
    }

    const config = configs[0];
    
    if (!config.url_clasificacion) {
      return Response.json({
        success: false,
        error: "No hay URL de clasificación configurada"
      });
    }

    const response = await fetch(config.url_clasificacion);
    const html = await response.text();

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Del siguiente HTML de la página de clasificación de la RFFM, extrae la tabla de clasificación completa.

HTML:
${html.substring(0, 50000)}

Busca el equipo "${config.nombre_equipo_rffm}" en la competición "${config.competicion_rffm}".

Extrae TODOS los equipos de la tabla con:
- posicion (número de la posición)
- equipo (nombre exacto del equipo)
- partidos_jugados (PJ)
- ganados (G)
- empatados (E)
- perdidos (P)
- goles_favor (GF)
- goles_contra (GC)
- diferencia (diferencia de goles, puede ser negativa)
- puntos (Pts)

IMPORTANTE: Extrae la tabla COMPLETA, todos los equipos del grupo.`,
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
          jornada: { type: "string" }
        }
      }
    });

    if (!llmResponse?.standings || llmResponse.standings.length === 0) {
      return Response.json({
        success: false,
        error: "No se pudo extraer la clasificación del HTML"
      });
    }

    return Response.json({
      success: true,
      standings: llmResponse.standings,
      metadata: {
        categoria_interna: categoria,
        equipo: config.nombre_equipo_rffm,
        competicion: config.competicion_rffm,
        grupo: config.grupo_rffm,
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