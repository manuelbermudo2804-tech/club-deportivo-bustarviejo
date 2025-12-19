import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import puppeteer from 'npm:puppeteer@23.12.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { temporada, tipo_juego, competicion_id, grupo_id, test_mode } = await req.json();

    if (!temporada || !tipo_juego || !competicion_id || !grupo_id) {
      return Response.json({ 
        error: 'Faltan parámetros',
        required: ['temporada', 'tipo_juego', 'competicion_id', 'grupo_id']
      }, { status: 400 });
    }

    const url = `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&tipojuego=${tipo_juego}&competicion=${competicion_id}&grupo=${grupo_id}`;
    
    // 🎯 ESTRATEGIA 1: Intentar API JSON interna de RFFM
    console.log('🎯 Intentando API JSON de RFFM...');
    const apiUrl = `https://www.rffm.es/api/competicion/clasificacion?temporada=${temporada}&tipojuego=${tipo_juego}&competicion=${competicion_id}&grupo=${grupo_id}`;
    
    try {
      const apiRes = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });

      if (apiRes.ok) {
        const jsonData = await apiRes.json();
        console.log('✅ API JSON funcionó!');
        
        const clasificacion = (jsonData.clasificacion || []).map((e, i) => ({
          posicion: e.posicion || i + 1,
          equipo: e.nombre || e.equipo || '',
          partidos_jugados: e.pj || e.partidos_jugados || '',
          ganados: e.g || e.ganados || '',
          empatados: e.e || e.empatados || '',
          perdidos: e.p || e.perdidos || '',
          goles_favor: e.gf || e.goles_favor || '',
          goles_contra: e.gc || e.goles_contra || '',
          puntos: e.pt || e.puntos || 0
        }));

        return Response.json({
          success: true,
          method: 'api_json',
          url,
          clasificacion,
          resultados: jsonData.resultados || [],
          timestamp: new Date().toISOString()
        });
      }
    } catch (apiError) {
      console.log('⚠️ API JSON falló, intentando HTML scraping...');
    }

    // 🔄 FALLBACK: Puppeteer (ejecuta JavaScript)
    console.log('🔄 Usando Puppeteer para ejecutar JS...');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Esperar a que se cargue la tabla de clasificación
      await page.waitForSelector('table, .clasificacion, [class*="tabla"]', { timeout: 10000 });

      // Extraer datos ejecutando código en el navegador
      const clasificacion = await page.evaluate(() => {
        const equipos = [];

        // Buscar todas las filas de tabla
        const rows = document.querySelectorAll('table tbody tr, table tr');

        rows.forEach((row) => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 5) {
            const texts = Array.from(cells).map(c => c.textContent.trim());

            // Buscar columna con nombre de equipo
            let equipoIdx = -1;
            let equipo = '';
            for (let i = 0; i < texts.length; i++) {
              if (texts[i].length > 3 && /[a-záéíóú]/i.test(texts[i]) && !/^\d+$/.test(texts[i])) {
                equipo = texts[i];
                equipoIdx = i;
                break;
              }
            }

            if (equipo && equipoIdx >= 0) {
              const posicion = parseInt(texts[0]) || equipos.length + 1;
              const puntos = parseInt(texts[texts.length - 1]) || 0;

              equipos.push({
                posicion,
                equipo,
                partidos_jugados: texts[equipoIdx + 1] || '',
                ganados: texts[equipoIdx + 2] || '',
                empatados: texts[equipoIdx + 3] || '',
                perdidos: texts[equipoIdx + 4] || '',
                puntos
              });
            }
          }
        });

        return equipos;
      });

      await browser.close();

      return Response.json({
        success: clasificacion.length > 0,
        method: 'puppeteer',
        url,
        clasificacion,
        resultados: [],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      await browser.close();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});