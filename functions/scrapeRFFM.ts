import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as cheerio from 'npm:cheerio@1.0.0';

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

    // 🔄 FALLBACK: HTML Scraping
    console.log('🔄 Haciendo HTML scraping...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return Response.json({ 
        error: 'No se pudo acceder a RFFM',
        status: response.status,
        url 
      }, { status: 500 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const clasificacion = [];
    const debugLogs = [];

    debugLogs.push(`📄 HTML recibido: ${html.length} chars`);
    
    // Guardar snippet del HTML para debug
    const htmlSnippet = html.substring(0, 3000);
    debugLogs.push(`🔍 HTML Preview: ${htmlSnippet.substring(0, 500)}...`);

    // Buscar elementos que contengan "clasificación" o datos de equipos
    const clasificacionElements = $('.clasificacion, .tabla-clasificacion, [class*="clasif"], [class*="ranking"]');
    debugLogs.push(`🔍 Elementos clasificación encontrados: ${clasificacionElements.length}`);

    // Buscar todos los textos que puedan ser equipos (divs, spans, p, etc)
    const allText = [];
    $('*').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 5 && text.length < 100 && /[a-záéíóú]/i.test(text)) {
        const children = $(elem).children();
        if (children.length === 0 || children.length <= 2) {
          allText.push(text);
        }
      }
    });

    debugLogs.push(`🔍 Total textos encontrados: ${allText.length}`);
    
    // Buscar líneas con patrón: posición, equipo (letras), y varios números
    const lines = html.split(/[\r\n]+/);
    debugLogs.push(`🔍 Total líneas HTML: ${lines.length}`);
    
    lines.forEach((line, idx) => {
      // Buscar: cualquier texto con letras (equipo) seguido de al menos 3 números
      const linePattern = /(\d+)?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ\s\.'"\-]+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/;
      const match = line.match(linePattern);
      
      if (match) {
        const equipo = match[2].trim();
        // Validar que el equipo tenga al menos 3 letras
        if (equipo.replace(/[^a-záéíóúñ]/gi, '').length >= 3) {
          clasificacion.push({
            posicion: parseInt(match[1]) || clasificacion.length + 1,
            equipo: equipo,
            partidos_jugados: match[3],
            ganados: match[4],
            empatados: match[5],
            perdidos: match[6],
            goles_favor: match[7],
            goles_contra: match[8],
            diferencia: match[9],
            puntos: parseInt(match[10])
          });
          debugLogs.push(`✅ Equipo ${clasificacion.length}: ${equipo} - ${match[10]} pts (línea ${idx})`);
        }
      }
    });

    debugLogs.push(`🏁 Total equipos extraídos: ${clasificacion.length}`);

    return Response.json({
      success: clasificacion.length > 0,
      method: 'html_scraping',
      url,
      clasificacion,
      resultados: [],
      html_length: html.length,
      debug_logs: debugLogs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});