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
          }
        }
      });
      
      matches = extracted.partidos || [];
      
    } else {
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Busca el calendario de próximos partidos del CD Bustarviejo en la categoría ${categoria} para la temporada ${temporada}.
          
          Busca partidos desde hoy hasta ${fechaLimiteStr}.
          
          Para cada partido encontrado, extrae:
          - Fecha exacta del partido
          - Hora del partido
          - Equipo rival
          - Si es local o visitante para el CD Bustarviejo
          - Ubicación o campo donde se juega
          - Número de jornada si está disponible
          
          NO incluyas partidos que ya se hayan jugado.
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
            }
          }
        }
      });
      
      matches = extracted.partidos || [];
    }
    
    const today = new Date().toISOString().split('T')[0];
    matches = matches
      .filter(m => m.fecha && m.fecha >= today && m.fecha <= fechaLimiteStr)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    
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
      error: error.message
    }, { status: 500 });
  }
});