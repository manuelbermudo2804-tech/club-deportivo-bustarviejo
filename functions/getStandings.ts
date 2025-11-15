/**
 * Obtiene la clasificación de la liga desde fuentes externas
 * 
 * @param {Object} params
 * @param {string} params.categoria - Categoría del equipo
 * @param {string} params.temporada - Temporada (ej: "2024-2025")
 * @param {string} params.source - Fuente: "rffm" o "url" (opcional)
 * @param {string} params.url - URL personalizada para scraping (opcional)
 * 
 * @returns {Object} { success: boolean, standings: Array, metadata: Object }
 */

export default async function getStandings({ categoria, temporada, source = "rffm", url }, context) {
  const { integrations } = context;
  
  try {
    let standings = [];
    let metadata = {};
    
    if (source === "url" && url) {
      // URL personalizada
      const response = await fetch(url);
      const html = await response.text();
      
      const extracted = await integrations.Core.InvokeLLM({
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
      // Búsqueda automática en internet (RFFM u otras fuentes)
      const searchQuery = `CD Bustarviejo ${categoria} clasificación tabla ${temporada}`;
      
      const extracted = await integrations.Core.InvokeLLM({
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
    
    // Ordenar por posición
    standings.sort((a, b) => a.posicion - b.posicion);
    
    // Encontrar posición del CD Bustarviejo
    const cdBustaIndex = standings.findIndex(team => 
      team.equipo.toLowerCase().includes('bustarviejo')
    );
    
    return {
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
    };
    
  } catch (error) {
    return {
      success: false,
      standings: [],
      metadata: {},
      error: error.message
    };
  }
}