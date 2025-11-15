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

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Accede a esta URL de la RFFM y extrae los partidos JUGADOS (con resultado) del equipo C.D. BUSTARVIEJO o BUSTARVIEJO:

URL: ${config.url_calendario}

Competición: ${config.competicion_rffm}
Grupo: ${config.grupo_rffm || "N/A"}
Equipo buscado: ${config.nombre_equipo_rffm}

INSTRUCCIONES:
- Busca en el calendario todos los partidos donde aparezca "BUSTARVIEJO" o "C.D. BUSTARVIEJO"
- Solo partidos que YA SE JUGARON (tienen resultado con goles)
- Extrae los últimos ${limite || 10} partidos jugados
- Ordena por fecha descendente (más recientes primero)

Para cada partido extrae:
- fecha: formato YYYY-MM-DD
- jornada: número de jornada (ej: "Jornada 5")
- local: nombre equipo local completo
- visitante: nombre equipo visitante completo
- goles_local: goles marcados por el equipo local
- goles_visitante: goles marcados por el equipo visitante
- campo: nombre del campo/instalación

IMPORTANTE: Solo partidos con resultado numérico (ej: 3-1, 0-0, etc.)`,
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
                jornada: { type: "string" },
                local: { type: "string" },
                visitante: { type: "string" },
                goles_local: { type: "number" },
                goles_visitante: { type: "number" },
                campo: { type: "string" }
              },
              required: ["fecha", "local", "visitante", "goles_local", "goles_visitante"]
            }
          }
        }
      }
    });

    if (!llmResponse?.partidos || llmResponse.partidos.length === 0) {
      return Response.json({
        success: false,
        error: "No se encontraron resultados. La URL puede no ser accesible o no contiene partidos de Bustarviejo."
      });
    }

    const results = llmResponse.partidos.map(partido => {
      const isBustaLocal = partido.local.toUpperCase().includes('BUSTARVIEJO');
      const goles_favor = isBustaLocal ? partido.goles_local : partido.goles_visitante;
      const goles_contra = isBustaLocal ? partido.goles_visitante : partido.goles_local;
      
      let resultado;
      if (goles_favor > goles_contra) resultado = "Victoria";
      else if (goles_favor < goles_contra) resultado = "Derrota";
      else resultado = "Empate";

      return {
        fecha_partido: partido.fecha,
        jornada: partido.jornada || "",
        rival: isBustaLocal ? partido.visitante : partido.local,
        local_visitante: isBustaLocal ? "Local" : "Visitante",
        goles_favor: goles_favor,
        goles_contra: goles_contra,
        resultado: resultado,
        ubicacion: partido.campo || "",
        categoria: categoria,
        titulo: `${partido.local} ${partido.goles_local} - ${partido.goles_visitante} ${partido.visitante}`,
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