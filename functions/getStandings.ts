import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import puppeteer from 'npm:puppeteer@23.11.1';

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
    
    if (!config.url_clasificacion) {
      return Response.json({
        success: false,
        error: "No hay URL de clasificación configurada"
      });
    }

    // Lanzar navegador headless
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 2000 });
    
    await page.goto(config.url_clasificacion, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await browser.close();
    
    const screenshotFile = new File([screenshotBuffer], 'clasificacion.png', { type: 'image/png' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: screenshotFile
    });

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza esta imagen de la tabla de clasificación de la RFFM y extrae la clasificación completa del grupo donde juega C.D. BUSTARVIEJO.

IMPORTANTE:
- Extrae TODOS los equipos de la tabla
- Mantén el orden por posición
- La diferencia de goles puede ser negativa

Para cada equipo extrae:
- posicion: número
- equipo: nombre completo
- partidos_jugados: PJ
- ganados: G
- empatados: E
- perdidos: P
- goles_favor: GF
- goles_contra: GC
- diferencia: diferencia de goles (puede ser negativa)
- puntos: Pts`,
      file_urls: [file_url],
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
              },
              required: ["posicion", "equipo", "puntos"]
            }
          },
          jornada_actual: { type: "string" }
        }
      }
    });

    if (!llmResponse?.clasificacion || llmResponse.clasificacion.length === 0) {
      return Response.json({
        success: false,
        error: "No se pudo extraer la clasificación de la imagen"
      });
    }

    return Response.json({
      success: true,
      standings: llmResponse.clasificacion,
      metadata: {
        categoria_interna: categoria,
        equipo: config.nombre_equipo_rffm,
        competicion: config.competicion_rffm,
        grupo: config.grupo_rffm,
        jornada: llmResponse.jornada_actual || "N/A",
        temporada: temporada,
        metodo: "screenshot",
        url_usada: config.url_clasificacion,
        ultima_actualizacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error en getStandings:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});