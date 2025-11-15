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

    // Extraer una sección más limpia del HTML
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .substring(0, 100000);

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza este HTML de la web de la RFFM y extrae los últimos ${limite || 10} partidos JUGADOS (con resultado) del C.D. BUSTARVIEJO.

HTML:
${cleanHtml}

Busca todos los partidos donde aparezca "BUSTARVIEJO" o "C.D. BUSTARVIEJO" como equipo local o visitante que YA TIENEN RESULTADO.

EXTRAE para cada partido:
- fecha: formato YYYY-MM-DD (convierte cualquier formato de fecha)
- local: nombre del equipo local (como aparece en la web)
- visitante: nombre del equipo visitante (como aparece en la web)
- goles_local: goles del equipo local (número)
- goles_visitante: goles del equipo visitante (número)
- jornada: número de jornada (ej: "Jornada 5")

IMPORTANTE:
- Solo partidos FINALIZADOS (que tengan resultado)
- Ordenar por fecha descendente
- Si no encuentras la fecha exacta, intenta inferirla del contexto
- Los goles deben ser números válidos`,
      response_json_schema: {
        type: "object",
        properties: {
          partidos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fecha: { type: "string" },
                local: { type: "string" },
                visitante: { type: "string" },
                goles_local: { type: "number" },
                goles_visitante: { type: "number" },
                jornada: { type: "string" }
              },
              required: ["local", "visitante", "goles_local", "goles_visitante"]
            }
          }
        }
      }
    });

    if (!llmResponse?.partidos || llmResponse.partidos.length === 0) {
      return Response.json({
        success: false,
        error: "No se encontraron partidos jugados de Bustarviejo en el HTML"
      });
    }

    const results = llmResponse.partidos.map(partido => {
      const isLocal = partido.local.toUpperCase().includes('BUSTARVIEJO');
      const golesFavor = isLocal ? partido.goles_local : partido.goles_visitante;
      const golesContra = isLocal ? partido.goles_visitante : partido.goles_local;
      
      let resultado;
      if (golesFavor > golesContra) resultado = "Victoria";
      else if (golesFavor < golesContra) resultado = "Derrota";
      else resultado = "Empate";

      return {
        categoria: categoria,
        fecha_partido: partido.fecha || new Date().toISOString().split('T')[0],
        rival: isLocal ? partido.visitante : partido.local,
        local_visitante: isLocal ? "Local" : "Visitante",
        goles_favor: golesFavor,
        goles_contra: golesContra,
        resultado: resultado,
        jornada: partido.jornada || "",
        titulo_partido: `${partido.local} vs ${partido.visitante}`,
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
        total_results: results.length,
        url_usada: config.url_calendario
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