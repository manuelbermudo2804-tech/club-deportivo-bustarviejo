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

    console.log('📄 HTML recibido:', html.length, 'chars');
    console.log('🔍 Tablas encontradas:', $('table').length);

    // Buscar TODAS las filas con al menos 5 celdas
    let allRows = [];
    $('table').each((tIdx, table) => {
      $(table).find('tr').each((rIdx, row) => {
        const cells = $(row).find('td, th');
        if (cells.length >= 5) {
          const rowData = [];
          cells.each((i, cell) => {
            rowData.push($(cell).text().trim());
          });
          allRows.push({ tableIdx: tIdx, rowIdx: rIdx, data: rowData });
          console.log(`Fila ${allRows.length}: [${rowData.join(' | ')}]`);
        }
      });
    });

    console.log(`📊 Total filas con 5+ celdas: ${allRows.length}`);

    // Analizar cada fila
    allRows.forEach(({ data }, idx) => {
      // Buscar columna con nombre de equipo (texto largo con letras)
      let equipo = '';
      let equipoIdx = -1;
      
      for (let i = 0; i < data.length; i++) {
        const text = data[i].replace(/\s+/g, ' ').trim();
        // Equipo: > 3 chars, tiene letras, NO es solo números ni símbolos
        if (text.length > 3 && /[a-záéíóúñA-Z]/.test(text) && !/^[\d\s\.,\-]+$/.test(text)) {
          equipo = text;
          equipoIdx = i;
          break;
        }
      }

      // Buscar puntos (último número válido después del equipo)
      let puntos = null;
      if (equipoIdx >= 0) {
        for (let i = data.length - 1; i > equipoIdx; i--) {
          const cleanNum = data[i].replace(/[^\d]/g, '');
          const num = parseInt(cleanNum);
          if (!isNaN(num) && num >= 0 && num <= 150) {
            puntos = num;
            break;
          }
        }
      }

      if (equipo && puntos !== null) {
        const posTexto = data[0].replace(/[^\d]/g, '');
        const posicion = parseInt(posTexto) || clasificacion.length + 1;
        
        clasificacion.push({
          posicion,
          equipo,
          puntos,
          partidos_jugados: data[equipoIdx + 1] || '',
          ganados: data[equipoIdx + 2] || '',
          empatados: data[equipoIdx + 3] || '',
          perdidos: data[equipoIdx + 4] || ''
        });
        
        console.log(`✅ Equipo ${clasificacion.length}: ${equipo} - ${puntos} pts`);
      }
    });

    return Response.json({
      success: clasificacion.length > 0,
      method: 'html_scraping',
      url,
      clasificacion,
      resultados: [],
      html_length: html.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});