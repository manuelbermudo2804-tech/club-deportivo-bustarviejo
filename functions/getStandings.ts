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

    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .substring(0, 100000);

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza este HTML de la web de la RFFM y extrae la tabla de clasificación completa del grupo donde juega C.D. BUSTARVIEJO.

HTML:
${cleanHtml}

Busca la tabla de clasificación que incluya a "BUSTARVIEJO" o "C.D. BUSTARVIEJO".

EXTRAE TODOS los equipos de la tabla con:
- posicion: posición en la tabla (número)
- equipo: nombre completo del equipo
- partidos_jugados: partidos jugados (PJ)
- ganados: partidos ganados (G)
- empatados: partidos empatados (E)
- perdidos: partidos perdidos (P)
- goles_favor: goles a favor (GF)
- goles_contra: goles en contra (GC)
- diferencia: diferencia de goles (puede ser negativa)
- puntos: puntos totales (Pts)

IMPORTANTE:
- Extrae TODOS los equipos del grupo (tabla completa)
- Mantén el orden por posición
- La diferencia de goles puede ser negativa`,
      response_json_schema: {
        type: "object",
        properties: {
          clasificacion: {
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
              },
              required: ["posicion", "equipo", "puntos"]
            }
          },
          jornada_actual: { type: "string" }
        }
      }
    });

    if (!llmResponse?.clasificacion || llmResponse.clasificacion.length === 0) {
      return Response.json({
        success: false,
        error: "No se pudo extraer la clasificación del HTML"
      });
    }

    return Response.json({
      success: true,
      standings: llmResponse.clasificacion,
      metadata: {
        categoria_interna: categoria,
        equipo: config.nombre_equipo_rffm,
        competicion: config.competicion_rffm,
        grupo: config.grupo_rffm,
        jornada: llmResponse.jornada_actual || "N/A",
        temporada: temporada,
        url_usada: config.url_clasificacion,
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