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

    // Extraer clasificación
    const clasificacion = [];
    const resultados = [];

    // Intentar extraer tabla de clasificación (ajustar selectores según HTML real)
    $('table.clasificacion tr, table.table tr, .tabla-clasificacion tr').each((i, elem) => {
      const $row = $(elem);
      const cells = $row.find('td');
      
      if (cells.length >= 4) {
        const equipo = cells.eq(1).text().trim();
        const puntos = cells.eq(cells.length - 1).text().trim();
        
        if (equipo && puntos && !isNaN(puntos)) {
          clasificacion.push({
            posicion: i,
            equipo,
            puntos: parseInt(puntos),
            partidos_jugados: cells.eq(2)?.text().trim(),
            ganados: cells.eq(3)?.text().trim(),
            empatados: cells.eq(4)?.text().trim(),
            perdidos: cells.eq(5)?.text().trim(),
            goles_favor: cells.eq(6)?.text().trim(),
            goles_contra: cells.eq(7)?.text().trim()
          });
        }
      }
    });

    // Extraer resultados de jornada actual
    $('.resultado, .partido, .match').each((i, elem) => {
      const $partido = $(elem);
      const local = $partido.find('.equipo-local, .local').text().trim();
      const visitante = $partido.find('.equipo-visitante, .visitante').text().trim();
      const resultado = $partido.find('.resultado, .score').text().trim();
      
      if (local && visitante) {
        resultados.push({ local, visitante, resultado });
      }
    });

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