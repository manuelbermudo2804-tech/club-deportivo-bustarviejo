import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { categoria, temporada, source = "rffm", url } = await req.json();
    
    let standings = [];
    let metadata = {};
    
    if (source === "url" && url) {
      const response = await fetch(url);
      const html = await response.text();
      
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Extrae la tabla de clasificación de esta página web:
          
          ${html}
          
          Para cada equipo en la tabla, extrae:
          - Posición en la tabla
          - Nombre del equipo
          - Partidos jugados
          - Partidos ganados
          - Partidos empatados
          - Partidos perdidos
          - Goles a favor
          - Goles en contra
          - Diferencia de goles
          - Puntos
          
          Ordena por posición de menor a mayor.
        `,
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
                }
              }
            },
            grupo: { type: "string" },
            jornada: { type: "string" }
          }
        }
      });
      
      standings = extracted.clasificacion || [];
      metadata = {
        grupo: extracted.grupo,
        jornada: extracted.jornada
      };
      
    } else {
      const searchQuery = `CD Bustarviejo ${categoria} clasificación tabla ${temporada}`;
      
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Busca la tabla de clasificación actual del CD Bustarviejo en la categoría ${categoria} para la temporada ${temporada}.
          
          Extrae TODA la tabla de clasificación del grupo donde juega el CD Bustarviejo.
          
          Para cada equipo, extrae todos los datos estadísticos disponibles.
        `,
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
                }
              }
            },
            grupo: { type: "string" },
            jornada: { type: "string" },
            ultima_actualizacion: { type: "string" }
          }
        }
      });
      
      standings = extracted.clasificacion || [];
      metadata = {
        grupo: extracted.grupo,
        jornada: extracted.jornada,
        ultima_actualizacion: extracted.ultima_actualizacion
      };
    }
    
    standings.sort((a, b) => a.posicion - b.posicion);
    
    const cdBustaIndex = standings.findIndex(team => 
      team.equipo.toLowerCase().includes('bustarviejo')
    );
    
    return Response.json({
      success: true,
      standings: standings,
      metadata: {
        ...metadata,
        cd_busta_posicion: cdBustaIndex >= 0 ? cdBustaIndex + 1 : null,
        total_equipos: standings.length,
        categoria: categoria,
        temporada: temporada,
        fecha_consulta: new Date().toISOString()
      }
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      standings: [],
      metadata: {},
      error: error.message
    }, { status: 500 });
  }
});