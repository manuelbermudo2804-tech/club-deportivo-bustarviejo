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
          
          Si no encuentras información, devuelve un array vacío en clasificacion.
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
          },
          required: ["clasificacion"]
        }
      });
      
      standings = extracted?.clasificacion || [];
      metadata = {
        grupo: extracted?.grupo || "",
        jornada: extracted?.jornada || ""
      };
      
    } else {
      const searchQuery = `Real Federacion Madrileña Futbol CD Bustarviejo ${categoria} clasificación liga ${temporada} tabla`;
      
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Busca información actualizada de la clasificación de la liga de la Real Federación Madrileña de Fútbol (RFFM) donde juega el CD Bustarviejo en la categoría ${categoria} para la temporada ${temporada}.
          
          Busca específicamente en:
          - Sitio web de RFFM (rffm.es)
          - Clasificaciones de grupos donde juega el CD Bustarviejo
          - Tabla de posiciones actualizada
          
          Extrae TODA la tabla de clasificación del grupo donde juega el CD Bustarviejo, incluyendo TODOS los equipos del grupo.
          
          Para cada equipo extrae:
          - Posición (número)
          - Nombre del equipo completo
          - Partidos jugados
          - Ganados, Empatados, Perdidos
          - Goles a favor, Goles en contra
          - Diferencia de goles
          - Puntos totales
          
          También extrae:
          - Nombre del grupo (ejemplo: "Grupo 1A")
          - Jornada actual
          
          IMPORTANTE: Si no encuentras información actualizada de la RFFM, devuelve un array vacío en clasificacion e indica en el campo "error" que no se pudo encontrar la información.
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
            ultima_actualizacion: { type: "string" },
            error: { type: "string" }
          },
          required: ["clasificacion"]
        }
      });
      
      if (!extracted || !extracted.clasificacion || extracted.clasificacion.length === 0) {
        return Response.json({
          success: false,
          standings: [],
          metadata: {},
          error: extracted?.error || "No se pudo encontrar información de clasificación en la RFFM para esta categoría. Es posible que la temporada no haya comenzado o que los datos no estén disponibles públicamente."
        });
      }
      
      standings = extracted.clasificacion || [];
      metadata = {
        grupo: extracted?.grupo || "",
        jornada: extracted?.jornada || "",
        ultima_actualizacion: extracted?.ultima_actualizacion || new Date().toISOString()
      };
    }
    
    if (standings.length === 0) {
      return Response.json({
        success: false,
        standings: [],
        metadata: {},
        error: "No se encontró información de clasificación disponible"
      });
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
      error: error.message || "Error al procesar la solicitud"
    }, { status: 500 });
  }
});