/**
 * Importa resultados de partidos desde fuentes externas (RSS, APIs de federaciones)
 * 
 * @param {Object} params
 * @param {string} params.source - Fuente de datos: "rffm", "rss", "manual_url"
 * @param {string} params.url - URL del RSS o API (opcional)
 * @param {string} params.categoria - Categoría del equipo
 * @param {string} params.temporada - Temporada (ej: "2024-2025")
 * 
 * @returns {Object} { success: boolean, results: Array, errors: Array }
 */

export default async function importMatchResults({ source, url, categoria, temporada }, context) {
  const { integrations, entities } = context;
  
  try {
    let matchData = [];
    
    // Opción 1: RSS Feed genérico
    if (source === "rss" && url) {
      const rssResponse = await fetch(url);
      const rssText = await rssResponse.text();
      
      // Usar LLM para extraer resultados del RSS
      const extracted = await integrations.Core.InvokeLLM({
        prompt: `
          Extrae los resultados de partidos de fútbol del siguiente RSS/HTML:
          
          ${rssText}
          
          Para cada partido encontrado, extrae:
          - Título del partido
          - Fecha del partido (formato ISO)
          - Equipo local
          - Equipo visitante
          - Goles local
          - Goles visitante
          - Observaciones relevantes
          
          Si "CD Bustarviejo" aparece como uno de los equipos, determina si fue local o visitante.
        `,
        response_json_schema: {
          type: "object",
          properties: {
            partidos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  fecha: { type: "string" },
                  equipo_local: { type: "string" },
                  equipo_visitante: { type: "string" },
                  goles_local: { type: "number" },
                  goles_visitante: { type: "number" },
                  observaciones: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      matchData = extracted.partidos || [];
    }
    
    // Opción 2: Real Federación de Fútbol de Madrid (RFFM)
    else if (source === "rffm") {
      // URL base de RFFM (ejemplo - puede variar)
      const rffmUrl = `https://www.rffm.es/resultados/${categoria}/${temporada}`;
      
      try {
        const response = await fetch(rffmUrl);
        const html = await response.text();
        
        const extracted = await integrations.Core.InvokeLLM({
          prompt: `
            Analiza esta página de resultados de la RFFM y extrae SOLO los partidos del CD Bustarviejo:
            
            ${html}
            
            Para cada partido del CD Bustarviejo, extrae todos los datos relevantes.
          `,
          response_json_schema: {
            type: "object",
            properties: {
              partidos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    titulo: { type: "string" },
                    fecha: { type: "string" },
                    rival: { type: "string" },
                    local_visitante: { type: "string", enum: ["Local", "Visitante"] },
                    goles_favor: { type: "number" },
                    goles_contra: { type: "number" },
                    observaciones: { type: "string" }
                  }
                }
              }
            }
          }
        });
        
        matchData = extracted.partidos || [];
      } catch (error) {
        console.error("Error fetching RFFM:", error);
        return {
          success: false,
          results: [],
          errors: [`Error al conectar con RFFM: ${error.message}`]
        };
      }
    }
    
    // Opción 3: URL manual con scraping inteligente
    else if (source === "manual_url" && url) {
      const response = await fetch(url);
      const html = await response.text();
      
      const extracted = await integrations.Core.InvokeLLM({
        prompt: `
          Analiza esta página web y extrae resultados de partidos de fútbol:
          
          ${html}
          
          Busca específicamente partidos del CD Bustarviejo.
          Si no hay partidos del CD Bustarviejo, extrae todos los partidos encontrados.
        `,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            partidos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  fecha: { type: "string" },
                  rival: { type: "string" },
                  local_visitante: { type: "string" },
                  goles_favor: { type: "number" },
                  goles_contra: { type: "number" },
                  observaciones: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      matchData = extracted.partidos || [];
    }
    
    // Procesar y crear los resultados en la base de datos
    const createdResults = [];
    const errors = [];
    
    for (const match of matchData) {
      try {
        // Determinar el resultado
        let resultado = "Empate";
        if (match.goles_favor > match.goles_contra) resultado = "Victoria";
        if (match.goles_favor < match.goles_contra) resultado = "Derrota";
        
        // Verificar si ya existe (evitar duplicados)
        const existingMatches = await entities.MatchResult.filter({
          fecha_partido: match.fecha?.split('T')[0],
          rival: match.rival,
          categoria: categoria
        });
        
        if (existingMatches.length > 0) {
          errors.push(`Partido ya existe: ${match.titulo} - ${match.fecha}`);
          continue;
        }
        
        const result = await entities.MatchResult.create({
          titulo_partido: match.titulo || `vs ${match.rival}`,
          categoria: categoria,
          fecha_partido: match.fecha?.split('T')[0] || new Date().toISOString().split('T')[0],
          rival: match.rival,
          local_visitante: match.local_visitante || "Local",
          goles_favor: match.goles_favor || 0,
          goles_contra: match.goles_contra || 0,
          resultado: resultado,
          observaciones: match.observaciones || "Importado automáticamente"
        });
        
        createdResults.push(result);
      } catch (error) {
        errors.push(`Error al crear resultado: ${match.titulo} - ${error.message}`);
      }
    }
    
    return {
      success: true,
      results: createdResults,
      errors: errors,
      total_found: matchData.length,
      total_created: createdResults.length
    };
    
  } catch (error) {
    return {
      success: false,
      results: [],
      errors: [`Error general: ${error.message}`]
    };
  }
}