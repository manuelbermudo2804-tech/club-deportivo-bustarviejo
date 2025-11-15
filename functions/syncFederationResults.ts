/**
 * Sincronización automática con resultados de la federación
 * Se puede ejecutar periódicamente (ej: cada semana) para mantener actualizados los resultados
 * 
 * @param {Object} params
 * @param {Array<string>} params.categorias - Categorías a sincronizar
 * @param {number} params.dias_atras - Días hacia atrás a buscar (por defecto 30)
 * 
 * @returns {Object} Resumen de la sincronización
 */

export default async function syncFederationResults({ categorias = [], dias_atras = 30 }, context) {
  const { integrations, entities } = context;
  
  const results = {
    success: true,
    synced_by_category: {},
    total_synced: 0,
    errors: []
  };
  
  try {
    // Si no se especifican categorías, sincronizar todas
    if (categorias.length === 0) {
      categorias = [
        "Fútbol Pre-Benjamín (Mixto)",
        "Fútbol Benjamín (Mixto)",
        "Fútbol Alevín (Mixto)",
        "Fútbol Infantil (Mixto)",
        "Fútbol Cadete",
        "Fútbol Juvenil",
        "Fútbol Aficionado",
        "Fútbol Femenino"
      ];
    }
    
    // Calcular fecha de inicio
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias_atras);
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
    
    for (const categoria of categorias) {
      try {
        // Buscar en internet resultados recientes del CD Bustarviejo para esta categoría
        const searchQuery = `CD Bustarviejo ${categoria} resultados partidos ${new Date().getFullYear()}`;
        
        const webResults = await integrations.Core.InvokeLLM({
          prompt: `
            Busca y extrae resultados de partidos del CD Bustarviejo en la categoría ${categoria}.
            
            Busca partidos desde ${fechaInicioStr} hasta hoy.
            
            Para cada partido, extrae:
            - Título o descripción del partido
            - Fecha exacta
            - Equipo rival
            - Si fue local o visitante
            - Goles a favor del CD Bustarviejo
            - Goles en contra
            - Cualquier observación relevante (lesiones, tarjetas, etc.)
          `,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              partidos_encontrados: {
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
        
        const partidos = webResults.partidos_encontrados || [];
        let syncedCount = 0;
        
        for (const partido of partidos) {
          try {
            // Verificar si ya existe
            const existingMatches = await entities.MatchResult.filter({
              fecha_partido: partido.fecha?.split('T')[0],
              rival: partido.rival,
              categoria: categoria
            });
            
            if (existingMatches.length > 0) {
              continue; // Ya existe, saltar
            }
            
            // Determinar resultado
            let resultado = "Empate";
            if (partido.goles_favor > partido.goles_contra) resultado = "Victoria";
            if (partido.goles_favor < partido.goles_contra) resultado = "Derrota";
            
            // Crear el resultado
            await entities.MatchResult.create({
              titulo_partido: partido.titulo || `vs ${partido.rival}`,
              categoria: categoria,
              fecha_partido: partido.fecha?.split('T')[0],
              rival: partido.rival,
              local_visitante: partido.local_visitante || "Local",
              goles_favor: partido.goles_favor || 0,
              goles_contra: partido.goles_contra || 0,
              resultado: resultado,
              observaciones: `${partido.observaciones || ''}\n\nSincronizado automáticamente desde internet`
            });
            
            syncedCount++;
            
          } catch (error) {
            results.errors.push(`Error en partido de ${categoria}: ${error.message}`);
          }
        }
        
        results.synced_by_category[categoria] = syncedCount;
        results.total_synced += syncedCount;
        
      } catch (error) {
        results.errors.push(`Error sincronizando ${categoria}: ${error.message}`);
      }
    }
    
    // Enviar notificación al admin si se sincronizaron resultados
    if (results.total_synced > 0) {
      await integrations.Core.SendEmail({
        from_name: "Sistema CD Bustarviejo",
        to: "cdbustarviejo@gmail.com",
        subject: `✅ Sincronización automática: ${results.total_synced} resultados nuevos`,
        body: `
Se han sincronizado ${results.total_synced} nuevos resultados de partidos:

${Object.entries(results.synced_by_category).map(([cat, count]) => 
  `- ${cat}: ${count} partido${count !== 1 ? 's' : ''}`
).join('\n')}

${results.errors.length > 0 ? `\n\nErrores:\n${results.errors.join('\n')}` : ''}

Accede al panel de administración para revisar los resultados.
        `
      });
    }
    
    return results;
    
  } catch (error) {
    return {
      success: false,
      synced_by_category: {},
      total_synced: 0,
      errors: [`Error general: ${error.message}`]
    };
  }
}