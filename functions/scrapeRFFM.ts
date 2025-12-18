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

    // Estrategia mejorada: buscar TODAS las filas con td
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      console.log(`📊 Table ${tableIndex}: ${rows.length} rows`);
      
      rows.each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length === 0) return;
        
        // Extraer TODO el texto de cada celda
        const allText = [];
        cells.each((i, cell) => {
          const text = $(cell).text().trim().replace(/\s+/g, ' ');
          allText.push(text);
        });
        
        console.log(`  Row ${rowIndex}: [${allText.join(' | ')}]`);
        
        // Detectar si es fila de clasificación (debe tener al menos 7 celdas)
        if (allText.length >= 7) {
          // Buscar nombre del equipo (texto largo, no número puro)
          let equipoText = '';
          let equipoIndex = -1;
          
          // El equipo suele estar en columnas 1-3
          for (let i = 0; i < Math.min(5, allText.length); i++) {
            const text = allText[i];
            // Debe tener al menos 4 caracteres y contener letras
            if (text.length >= 4 && /[a-zA-Z]/.test(text) && isNaN(parseInt(text))) {
              equipoText = text;
              equipoIndex = i;
              break;
            }
          }
          
          // Buscar puntos (número en últimas 3 columnas)
          let puntos = null;
          for (let i = allText.length - 1; i >= Math.max(0, allText.length - 3); i--) {
            const num = parseInt(allText[i]);
            if (!isNaN(num) && num >= 0 && num <= 150) {
              puntos = num;
              break;
            }
          }
          
          // Si encontramos equipo Y puntos, es una fila válida
          if (equipoText && puntos !== null) {
            // Extraer posición (primera columna numérica)
            let posicion = rowIndex;
            const primerNum = parseInt(allText[0]);
            if (!isNaN(primerNum) && primerNum > 0 && primerNum < 50) {
              posicion = primerNum;
            }
            
            // Intentar extraer estadísticas (después del equipo)
            const stats = allText.slice(equipoIndex + 1);
            
            clasificacion.push({
              posicion,
              equipo: equipoText,
              puntos,
              partidos_jugados: stats[0] || '',
              ganados: stats[1] || '',
              empatados: stats[2] || '',
              perdidos: stats[3] || '',
              goles_favor: stats[4] || '',
              goles_contra: stats[5] || '',
              _raw_data: allText
            });
            
            console.log(`  ✅ Equipo detectado: ${equipoText} - ${puntos} pts`);
          }
        }
      });
    });
    
    console.log(`✅ Total equipos extraídos: ${clasificacion.length}`);

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