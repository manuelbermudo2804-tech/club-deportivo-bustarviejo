import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { categoria, temporada, limite } = await req.json();

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

    if (!config.url_calendario) {
      return Response.json({
        success: false,
        error: "No hay URL de calendario configurada"
      });
    }

    const response = await fetch(config.url_calendario);
    const html = await response.text();

    const today = new Date().toISOString().split('T')[0];

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Del siguiente HTML de la página de calendario de la RFFM, extrae los últimos ${limite || 10} partidos JUGADOS del equipo "${config.nombre_equipo_rffm}".

HTML:
${html.substring(0, 50000)}

Extrae solo partidos YA JUGADOS (con resultado) del equipo "${config.nombre_equipo_rffm}".

Para cada partido:
- fecha (formato YYYY-MM-DD)
- hora (formato HH:MM)
- local (equipo local)
- visitante (equipo visitante)
- resultado (formato "X-Y", ej: "2-1")
- ubicacion (campo/instalación)
- jornada (ej: "Jornada 10")

IMPORTANTE: 
- Solo partidos FINALIZADOS con resultado
- Ordenar por fecha descendente (más recientes primero)
- Máximo ${limite || 10} partidos`,
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
                resultado: { type: "string" },
                ubicacion: { type: "string" },
                jornada: { type: "string" }
              }
            }
          }
        }
      }
    });

    if (!llmResponse?.matches || llmResponse.matches.length === 0) {
      return Response.json({
        success: false,
        error: "No se encontraron resultados"
      });
    }

    const ourTeam = config.nombre_equipo_rffm;
    const results = llmResponse.matches.map(match => {
      const [golesLocal, golesVisitante] = match.resultado.split('-').map(n => parseInt(n.trim()));
      const isLocal = match.local.includes("BUSTARVIEJO");
      const golesFavor = isLocal ? golesLocal : golesVisitante;
      const golesContra = isLocal ? golesVisitante : golesLocal;
      
      let resultado;
      if (golesFavor > golesContra) resultado = "Victoria";
      else if (golesFavor < golesContra) resultado = "Derrota";
      else resultado = "Empate";

      return {
        categoria: categoria,
        fecha_partido: match.fecha,
        hora: match.hora,
        rival: isLocal ? match.visitante : match.local,
        local_visitante: isLocal ? "Local" : "Visitante",
        goles_favor: golesFavor,
        goles_contra: golesContra,
        resultado: resultado,
        ubicacion: match.ubicacion,
        jornada: match.jornada,
        titulo_partido: `${match.local} vs ${match.visitante}`,
        fuente: "rffm"
      };
    });

    return Response.json({
      success: true,
      results: results,
      metadata: {
        categoria_interna: categoria,
        equipo: config.nombre_equipo_rffm,
        competicion: config.competicion_rffm,
        grupo: config.grupo_rffm,
        temporada: temporada,
        total_results: results.length
      }
    });

  } catch (error) {
    console.error("Error en getMatchResults:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});