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

    // Buscar filas con al menos 3 celdas
    $('table tr').each((rowIndex, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');
      
      if (cells.length < 3) return;
      
      const allText = [];
      cells.each((i, cell) => {
        allText.push($(cell).text().trim().replace(/\s+/g, ' '));
      });
      
      // Buscar equipo (texto con letras, > 3 chars)
      let equipo = null;
      let equipoIdx = -1;
      for (let i = 0; i < allText.length; i++) {
        const t = allText[i];
        if (t.length > 3 && /[a-z]/i.test(t) && !/^\d+$/.test(t)) {
          equipo = t;
          equipoIdx = i;
          break;
        }
      }
      
      // Buscar número de puntos (último número >= 0)
      let puntos = null;
      for (let i = allText.length - 1; i > equipoIdx; i--) {
        const num = parseInt(allText[i]);
        if (!isNaN(num) && num >= 0) {
          puntos = num;
          break;
        }
      }
      
      if (equipo && puntos !== null) {
        const pos = parseInt(allText[0]) || clasificacion.length + 1;
        clasificacion.push({
          posicion: pos,
          equipo,
          puntos,
          partidos_jugados: allText[equipoIdx + 1] || '',
          _raw: allText
        });
        console.log(`✅ ${equipo} - ${puntos} pts`);
      }
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