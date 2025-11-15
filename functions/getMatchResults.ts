import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import puppeteer from 'npm:puppeteer@23.11.1';

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

    // Lanzar navegador headless para capturar screenshot
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 3000 });
    
    // Navegar a la URL y esperar a que cargue
    await page.goto(config.url_calendario, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Esperar un poco más para que se renderice todo
    await page.waitForTimeout(3000);
    
    // Tomar screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await browser.close();
    
    // Subir screenshot a Base44
    const screenshotFile = new File([screenshotBuffer], 'calendario.png', { type: 'image/png' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: screenshotFile
    });

    // Usar LLM con visión para extraer datos
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza esta imagen del calendario de partidos de la RFFM y extrae TODOS los partidos JUGADOS (con resultado) del equipo C.D. BUSTARVIEJO o BUSTARVIEJO.

IMPORTANTE:
- Solo partidos con resultado (ya jugados)
- Busca donde aparezca "BUSTARVIEJO" o "C.D. BUSTARVIEJO"
- Extrae fecha, equipos, resultado
- Ordena por fecha descendente (más recientes primero)
- Máximo ${limite || 10} partidos

Devuelve para cada partido:
- fecha: formato YYYY-MM-DD
- jornada: número de jornada
- local: equipo local
- visitante: equipo visitante  
- goles_local: goles del equipo local
- goles_visitante: goles del visitante
- campo: instalación donde se jugó`,
      file_urls: [file_url],
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
        error: "No se encontraron resultados en la imagen"
      });
    }

    // Formatear resultados
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
        fuente: "rffm_screenshot"
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
        metodo: "screenshot",
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