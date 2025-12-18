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
    console.log('🔍 All elements with data:', $('[data-id], .clasificacion, .tabla-clasificacion, #clasificacion').length);

    // Extraer clasificación
    const clasificacion = [];
    const resultados = [];

    // Imprimir primeras 2000 caracteres para debug
    console.log('HTML PREVIEW:', html.substring(0, 2000));

    // Estrategia 1: Buscar tabla por clase o id común
    const tablaClasificacion = $('.tabla-clasificacion, .clasificacion, table.table, .table-responsive table').first();
    if (tablaClasificacion.length > 0) {
      console.log('✅ Tabla clasificación encontrada por clase');
    }

    // Estrategia 2: buscar TODAS las filas con td en TODAS las tablas
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      console.log(`📊 Table ${tableIndex}: ${rows.length} rows, classes: ${$table.attr('class') || 'none'}`);
      
      rows.each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length === 0) return;
        
        // Extraer TODO el contenido de cada celda (texto + HTML)
        const allText = [];
        const allHtml = [];
        cells.each((i, cell) => {
          const $cell = $(cell);
          const text = $cell.text().trim().replace(/\s+/g, ' ');
          const html = $cell.html();
          allText.push(text);
          allHtml.push(html);
        });
        
        console.log(`  Row ${rowIndex} (${cells.length} cells): [${allText.join(' | ')}]`);
        
        // Debe tener al menos 5 columnas para ser clasificación
        if (allText.length >= 5) {
          // Buscar nombre del equipo (texto largo, no número puro)
          let equipoText = '';
          let equipoIndex = -1;
          
          // Recorrer todas las columnas buscando el nombre del equipo
          for (let i = 0; i < allText.length; i++) {
            const text = allText[i];
            // El equipo debe: tener letras, más de 3 chars, no ser solo número
            if (text.length > 3 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(text) && !/^\d+$/.test(text)) {
              equipoText = text;
              equipoIndex = i;
              break;
            }
          }
          
          // Buscar puntos (número en las últimas 4 columnas)
          let puntos = null;
          let puntosIndex = -1;
          for (let i = allText.length - 1; i >= Math.max(0, allText.length - 4); i--) {
            const text = allText[i].replace(/\s/g, '');
            const num = parseInt(text);
            if (!isNaN(num) && num >= 0 && num <= 200) {
              puntos = num;
              puntosIndex = i;
              break;
            }
          }
          
          // Si encontramos equipo Y puntos, es una fila válida
          if (equipoText && puntos !== null) {
            // Extraer posición
            let posicion = clasificacion.length + 1;
            const primerTexto = allText[0].replace(/[^\d]/g, '');
            const primerNum = parseInt(primerTexto);
            if (!isNaN(primerNum) && primerNum > 0 && primerNum < 50) {
              posicion = primerNum;
            }
            
            // Extraer estadísticas entre equipo y puntos
            const statsStart = equipoIndex + 1;
            const statsEnd = puntosIndex;
            const stats = allText.slice(statsStart, statsEnd);
            
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
              _raw_data: allText,
              _table_index: tableIndex
            });
            
            console.log(`  ✅ EQUIPO: ${equipoText} - ${puntos} pts (pos: ${posicion})`);
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