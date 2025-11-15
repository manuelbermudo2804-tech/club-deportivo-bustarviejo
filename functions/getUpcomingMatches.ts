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

    const response = await fetch(config.url_calendario);
    const html = await response.text();

    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .substring(0, 100000);

    const today = new Date().toISOString().split('T')[0];

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza este HTML de la web de la RFFM y extrae los próximos partidos (SIN RESULTADO AÚN) del C.D. BUSTARVIEJO.

HTML:
${cleanHtml}

Busca partidos donde aparezca "BUSTARVIEJO" o "C.D. BUSTARVIEJO" que NO tienen resultado todavía (partidos futuros o pendientes).

EXTRAE para cada partido:
- fecha: formato YYYY-MM-DD (hoy es ${today}, busca fechas futuras)
- hora: formato HH:MM (puede ser "Por confirmar" o vacío)
- local: nombre del equipo local
- visitante: nombre del equipo visitante
- ubicacion: campo/instalación donde se juega
- jornada: número de jornada (ej: "Jornada 5")

IMPORTANTE:
- Solo partidos SIN resultado (futuros)
- Ordenar por fecha ascendente (próximos primero)
- Máximo 5 partidos`,
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
                local: { type: "string" },
                visitante: { type: "string" },
                ubicacion: { type: "string" },
                jornada: { type: "string" }
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
        error: "No se pudieron extraer próximos partidos del HTML"
      });
    }

    const matches = llmResponse.partidos
      .filter(p => !p.fecha || p.fecha >= today)
      .map(partido => ({
        fecha: partido.fecha || today,
        hora: partido.hora || "Por confirmar",
        local: partido.local,
        visitante: partido.visitante,
        ubicacion: partido.ubicacion || "Por confirmar",
        jornada: partido.jornada || "",
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