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

    if (!config.url_calendario) {
      return Response.json({
        success: false,
        error: "No hay URL de calendario configurada"
      });
    }

    // Lanzar navegador headless
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 3000 });
    
    await page.goto(config.url_calendario, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await browser.close();
    
    const screenshotFile = new File([screenshotBuffer], 'calendario.png', { type: 'image/png' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: screenshotFile
    });

    const today = new Date().toISOString().split('T')[0];

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza esta imagen del calendario de la RFFM y extrae los próximos partidos (SIN RESULTADO) del equipo C.D. BUSTARVIEJO.

Fecha de hoy: ${today}

IMPORTANTE:
- Solo partidos futuros o pendientes (SIN resultado todavía)
- Busca "BUSTARVIEJO" o "C.D. BUSTARVIEJO"
- Máximo 5 partidos próximos

Extrae:
- fecha: YYYY-MM-DD (fechas >= ${today})
- hora: HH:MM o "Por confirmar"
- jornada: número
- local: equipo local
- visitante: equipo visitante
- campo: instalación`,
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
                hora: { type: "string" },
                jornada: { type: "string" },
                local: { type: "string" },
                visitante: { type: "string" },
                campo: { type: "string" }
              },
              required: ["local", "visitante"]
            }
          }
        }
      }
    });

    if (!llmResponse?.partidos) {
      return Response.json({
        success: false,
        error: "No se encontraron próximos partidos"
      });
    }

    const matches = llmResponse.partidos
      .filter(p => !p.fecha || p.fecha >= today)
      .map(partido => ({
        fecha: partido.fecha || today,
        hora: partido.hora || "Por confirmar",
        jornada: partido.jornada || "",
        local: partido.local,
        visitante: partido.visitante,
        ubicacion: partido.campo || "Por confirmar",
        categoria: categoria,
        rival: partido.local.toUpperCase().includes('BUSTARVIEJO') ? partido.visitante : partido.local,
        local_visitante: partido.local.toUpperCase().includes('BUSTARVIEJO') ? "Local" : "Visitante",
        titulo: `${partido.local} vs ${partido.visitante}`,
        fuente: "rffm_screenshot"
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 5);

    return Response.json({
      success: true,
      matches: matches,
      metadata: {
        categoria_interna: categoria,
        equipo: config.nombre_equipo_rffm,
        competicion: config.competicion_rffm,
        grupo: config.grupo_rffm,
        temporada: temporada,
        total_matches: matches.length,
        metodo: "screenshot",
        url_usada: config.url_calendario
      }
    });

  } catch (error) {
    console.error("Error en getUpcomingMatches:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});