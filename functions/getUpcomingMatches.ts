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

    if (!config.url_calendario) {
      return Response.json({
        success: false,
        error: "No hay URL de calendario configurada"
      });
    }

    const today = new Date().toISOString().split('T')[0];

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Accede a esta URL de la RFFM y extrae los próximos partidos (SIN resultado aún) del equipo C.D. BUSTARVIEJO:

URL: ${config.url_calendario}

Competición: ${config.competicion_rffm}
Grupo: ${config.grupo_rffm || "N/A"}
Equipo: ${config.nombre_equipo_rffm}
Fecha de hoy: ${today}

INSTRUCCIONES:
- Busca partidos de "BUSTARVIEJO" o "C.D. BUSTARVIEJO"
- Solo partidos FUTUROS o PENDIENTES (sin resultado todavía)
- Máximo 5 próximos partidos
- Ordena por fecha ascendente

Extrae:
- fecha: YYYY-MM-DD (debe ser >= ${today})
- hora: HH:MM o "Por confirmar" si no aparece
- jornada: número de jornada
- local: equipo local completo
- visitante: equipo visitante completo
- campo: instalación donde se juega`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          partidos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fecha: { type: "string" },
                hora: { type: "string" },
                jornada: { type: "string" },
                local: { type: "string" },
                visitante: { type: "string" },
                campo: { type: "string" }
              },
              required: ["local", "visitante"]
            }
          }
        }
      }
    });

    if (!llmResponse?.partidos) {
      return Response.json({
        success: false,
        error: "No se encontraron próximos partidos"
      });
    }

    const matches = llmResponse.partidos
      .filter(p => !p.fecha || p.fecha >= today)
      .map(partido => ({
        fecha: partido.fecha || today,
        hora: partido.hora || "Por confirmar",
        jornada: partido.jornada || "",
        local: partido.local,
        visitante: partido.visitante,
        ubicacion: partido.campo || "Por confirmar",
        categoria: categoria,
        rival: partido.local.toUpperCase().includes('BUSTARVIEJO') ? partido.visitante : partido.local,
        local_visitante: partido.local.toUpperCase().includes('BUSTARVIEJO') ? "Local" : "Visitante",
        titulo: `${partido.local} vs ${partido.visitante}`,
        fuente: "rffm"
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 5);

    return Response.json({
      success: true,
      matches: matches,
      metadata: {
        categoria_interna: categoria,
        equipo: config.nombre_equipo_rffm,
        competicion: config.competicion_rffm,
        grupo: config.grupo_rffm,
        temporada: temporada,
        total_matches: matches.length,
        url_usada: config.url_calendario
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