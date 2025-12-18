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

    // Construir URL de RFFM
    const url = `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&tipojuego=${tipo_juego}&competicion=${competicion_id}&grupo=${grupo_id}`;
    
    console.log('🔍 Scraping RFFM:', url);

    // Hacer request a RFFM
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return Response.json({ 
        error: 'Error al acceder a RFFM',
        status: response.status,
        url 
      }, { status: 500 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('📄 HTML length:', html.length);
    console.log('🔍 Tables found:', $('table').length);

    // Extraer clasificación
    const clasificacion = [];
    const resultados = [];

    // Estrategia: buscar TODAS las tablas y analizar estructura
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      console.log(`  Table ${tableIndex}: ${rows.length} rows`);
      
      rows.each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        // Saltar headers
        if (cells.length === 0) return;
        
        // Intentar extraer datos de cada fila
        // Estructura típica RFFM: [pos, escudo/equipo, PJ, G, E, P, GF, GC, Pts]
        if (cells.length >= 7) {
          const allText = [];
          cells.each((i, cell) => {
            allText.push($(cell).text().trim());
          });
          
          // Buscar el nombre del equipo (texto más largo que no sea número)
          let equipoIndex = -1;
          let equipoText = '';
          
          for (let i = 0; i < Math.min(4, allText.length); i++) {
            const text = allText[i];
            // El equipo suele estar en posición 1 o 2, y no es un número
            if (text.length > 3 && isNaN(parseInt(text))) {
              equipoIndex = i;
              equipoText = text;
              break;
            }
          }
          
          // Buscar los puntos (última columna, debe ser número)
          const ultimaCol = allText[allText.length - 1];
          const puntosNum = parseInt(ultimaCol);
          
          // Validar que encontramos equipo y puntos válidos
          if (equipoText && !isNaN(puntosNum) && puntosNum >= 0 && puntosNum <= 100) {
            // Intentar extraer posición (primera columna)
            const posText = allText[0];
            const posNum = parseInt(posText);
            
            clasificacion.push({
              posicion: !isNaN(posNum) ? posNum : rowIndex,
              equipo: equipoText,
              puntos: puntosNum,
              partidos_jugados: allText[equipoIndex + 1] || '',
              ganados: allText[equipoIndex + 2] || '',
              empatados: allText[equipoIndex + 3] || '',
              perdidos: allText[equipoIndex + 4] || '',
              goles_favor: allText[equipoIndex + 5] || '',
              goles_contra: allText[equipoIndex + 6] || '',
              _debug: allText
            });
          }
        }
      });
    });
    
    console.log('✅ Equipos extraídos:', clasificacion.length);

    const data = {
      success: true,
      url,
      clasificacion,
      resultados,
      html_length: html.length,
      timestamp: new Date().toISOString()
    };

    // Si NO es test mode, guardar en MatchResult
    if (!test_mode && clasificacion.length > 0) {
      console.log('💾 Guardando resultados en base de datos...');
      
      // Aquí podrías insertar los resultados en MatchResult
      // Por ahora solo retornamos los datos
    }

    return Response.json(data);

  } catch (error) {
    console.error('❌ Error scraping RFFM:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});