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

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Accede a esta URL de clasificación de la RFFM y extrae la tabla completa del grupo donde juega C.D. BUSTARVIEJO:

URL: ${config.url_clasificacion}

Competición: ${config.competicion_rffm}
Grupo: ${config.grupo_rffm || "N/A"}
Equipo: ${config.nombre_equipo_rffm}

INSTRUCCIONES:
- Busca la tabla de clasificación que incluya a "BUSTARVIEJO" o "C.D. BUSTARVIEJO"
- Extrae TODOS los equipos de esa tabla
- Mantén el orden por posición (1º, 2º, 3º, etc.)

Para cada equipo extrae:
- posicion: número de posición en la tabla
- equipo: nombre completo del equipo
- partidos_jugados: PJ (partidos jugados)
- ganados: G (partidos ganados)
- empatados: E (partidos empatados)
- perdidos: P (partidos perdidos)
- goles_favor: GF (goles a favor)
- goles_contra: GC (goles en contra)
- diferencia: diferencia de goles (puede ser negativa)
- puntos: Pts (puntos totales)

También extrae la jornada actual si está disponible.`,
      add_context_from_internet: true,
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
        error: "No se pudo extraer la clasificación. Verifica que la URL sea correcta."
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