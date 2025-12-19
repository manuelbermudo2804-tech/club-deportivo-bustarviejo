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
    
    // 🔍 ESTRATEGIA A: Buscar JSON embebido en <script>
    const scriptTags = $('script');
    debugLogs.push(`🔍 Tags <script> encontrados: ${scriptTags.length}`);
    
    scriptTags.each((i, script) => {
      const content = $(script).html() || '';
      // Buscar patrones de datos JSON con equipos
      const jsonMatch = content.match(/clasificacion["\s]*[:=]\s*(\[[\s\S]*?\])/i);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          debugLogs.push(`✨ JSON encontrado en script ${i}: ${data.length} equipos`);
          data.forEach((e, idx) => {
            clasificacion.push({
              posicion: e.posicion || e.pos || idx + 1,
              equipo: e.nombre || e.equipo || e.team || '',
              partidos_jugados: e.pj || e.partidos_jugados || '',
              ganados: e.g || e.ganados || '',
              empatados: e.e || e.empatados || '',
              perdidos: e.p || e.perdidos || '',
              goles_favor: e.gf || '',
              goles_contra: e.gc || '',
              puntos: e.pt || e.puntos || e.points || 0
            });
          });
        } catch (err) {
          debugLogs.push(`⚠️ Error parseando JSON en script ${i}`);
        }
      }
    });

    if (clasificacion.length > 0) {
      debugLogs.push(`✅ Datos extraídos de JSON embebido`);
    } else {
      debugLogs.push(`⚠️ No se encontró JSON embebido, intentando HTML scraping...`);
      
      // 🔍 ESTRATEGIA B: Buscar tablas HTML
      const tables = $('table');
      debugLogs.push(`🔍 Tablas HTML encontradas: ${tables.length}`);
      
      tables.each((tIdx, table) => {
        const rows = $(table).find('tbody tr, tr');
        debugLogs.push(`📊 Tabla ${tIdx}: ${rows.length} filas`);
        
        rows.each((rIdx, row) => {
          const cells = $(row).find('td, th');
          if (cells.length >= 5) {
            const cellTexts = [];
            cells.each((i, cell) => {
              cellTexts.push($(cell).text().trim());
            });
            
            debugLogs.push(`   Fila ${rIdx}: [${cellTexts.slice(0, 6).join(' | ')}]`);
            
            // Buscar columna con nombre de equipo
            let equipoIdx = -1;
            let equipo = '';
            for (let i = 0; i < cellTexts.length; i++) {
              const text = cellTexts[i];
              if (text.length > 3 && /[a-záéíóú]/i.test(text) && !/^\d+$/.test(text)) {
                equipo = text;
                equipoIdx = i;
                break;
              }
            }
            
            if (equipo && equipoIdx >= 0) {
              const posicion = parseInt(cellTexts[0]) || clasificacion.length + 1;
              const puntos = parseInt(cellTexts[cellTexts.length - 1]) || 0;
              
              clasificacion.push({
                posicion,
                equipo,
                partidos_jugados: cellTexts[equipoIdx + 1] || '',
                ganados: cellTexts[equipoIdx + 2] || '',
                empatados: cellTexts[equipoIdx + 3] || '',
                perdidos: cellTexts[equipoIdx + 4] || '',
                puntos
              });
              
              debugLogs.push(`   ✅ Equipo: ${equipo} - ${puntos} pts`);
            }
          }
        });
      });
    }

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