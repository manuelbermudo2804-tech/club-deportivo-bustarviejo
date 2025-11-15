import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { categoria, temporada, dias_adelante = 30, source = "rffm", url } = await req.json();
    
    let matches = [];
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias_adelante);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
    
    if (source === "url" && url) {
      const response = await fetch(url);
      const html = await response.text();
      
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Extrae los próximos partidos del CD Bustarviejo desde esta página:
          
          ${html}
          
          Para cada partido, extrae:
          - Fecha del partido
          - Hora
          - Equipo rival
          - Si es local o visitante
          - Ubicación/campo
          - Jornada (si está disponible)
          
          Solo partidos futuros (desde hoy hasta ${fechaLimiteStr}).
          
          Si no encuentras partidos, devuelve un array vacío.
        `,
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
                  rival: { type: "string" },
                  local_visitante: { type: "string", enum: ["Local", "Visitante"] },
                  ubicacion: { type: "string" },
                  jornada: { type: "string" }
                }
              }
            }
          },
          required: ["partidos"]
        }
      });
      
      matches = extracted?.partidos || [];
      
    } else {
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Busca el calendario oficial de partidos del CD Bustarviejo en la Real Federación Madrileña de Fútbol (RFFM) para la categoría ${categoria}, temporada ${temporada}.
          
          Busca específicamente en:
          - Sitio web oficial de RFFM (rffm.es)
          - Calendario de competición oficial
          - Partidos programados del CD Bustarviejo
          
          Extrae SOLO los partidos que estén programados desde HOY (${new Date().toISOString().split('T')[0]}) hasta ${fechaLimiteStr}.
          
          Para cada partido encontrado, extrae:
          - Fecha exacta del partido (formato YYYY-MM-DD)
          - Hora del partido (ejemplo: "10:00")
          - Equipo rival (nombre completo)
          - Si es Local o Visitante para el CD Bustarviejo
          - Ubicación o campo donde se juega
          - Número de jornada si está disponible
          
          NO incluyas:
          - Partidos que ya se jugaron
          - Partidos sin fecha confirmada
          
          IMPORTANTE: Si no encuentras calendario oficial o partidos programados en RFFM, devuelve un array vacío en partidos e indica en el campo "error" que no se encontró información.
        `,
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
                  rival: { type: "string" },
                  local_visitante: { type: "string" },
                  ubicacion: { type: "string" },
                  jornada: { type: "string" }
                }
              }
            },
            error: { type: "string" }
          },
          required: ["partidos"]
        }
      });
      
      if (!extracted || !extracted.partidos || extracted.partidos.length === 0) {
        return Response.json({
          success: false,
          matches: [],
          error: extracted?.error || "No se encontraron partidos próximos en la RFFM para esta categoría. Es posible que el calendario aún no esté publicado o que no haya partidos programados."
        });
      }
      
      matches = extracted.partidos || [];
    }
    
    const today = new Date().toISOString().split('T')[0];
    matches = matches
      .filter(m => m.fecha && m.fecha >= today && m.fecha <= fechaLimiteStr)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    
    if (matches.length === 0) {
      return Response.json({
        success: false,
        matches: [],
        error: "No se encontraron partidos programados en las próximas semanas"
      });
    }
    
    return Response.json({
      success: true,
      matches: matches.map(m => ({
        ...m,
        titulo: `vs ${m.rival}`,
        tipo: "Partido",
        categoria: categoria,
        fuente: "rffm"
      })),
      total: matches.length,
      categoria: categoria,
      temporada: temporada
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      matches: [],
      error: error.message || "Error al procesar la solicitud"
    }, { status: 500 });
  }
});