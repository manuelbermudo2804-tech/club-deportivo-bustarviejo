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

    // Buscar TODAS las tablas y encontrar la de clasificación
    let tablaEncontrada = false;
    
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      // Verificar si esta tabla tiene estructura de clasificación
      rows.each((i, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        // Buscar filas con datos de equipos (típicamente 8-10 columnas)
        if (cells.length >= 8 && cells.length <= 12) {
          let equipo = '';
          let puntos = '';
          let posicion = i;
          
          // Intentar diferentes estructuras
          // Opción 1: Segunda columna es el equipo
          equipo = cells.eq(1).text().trim();
          puntos = cells.eq(cells.length - 1).text().trim();
          
          // Si no encuentra, probar tercera columna
          if (!equipo || equipo.length < 2) {
            equipo = cells.eq(2).text().trim();
          }
          
          // Validar que puntos sea número
          const puntosNum = parseInt(puntos);
          
          if (equipo && equipo.length > 2 && !isNaN(puntosNum) && puntosNum >= 0) {
            tablaEncontrada = true;
            clasificacion.push({
              posicion: posicion,
              equipo: equipo,
              puntos: puntosNum,
              partidos_jugados: cells.eq(2)?.text().trim() || cells.eq(3)?.text().trim(),
              ganados: cells.eq(3)?.text().trim() || cells.eq(4)?.text().trim(),
              empatados: cells.eq(4)?.text().trim() || cells.eq(5)?.text().trim(),
              perdidos: cells.eq(5)?.text().trim() || cells.eq(6)?.text().trim(),
              goles_favor: cells.eq(6)?.text().trim() || cells.eq(7)?.text().trim(),
              goles_contra: cells.eq(7)?.text().trim() || cells.eq(8)?.text().trim()
            });
          }
        }
      });
      
      // Si encontramos la tabla, no seguir buscando
      if (tablaEncontrada) {
        return false;
      }
    });

    // Extraer resultados de jornada (buscar en divs, secciones, etc)
    $('div, section, article').each((i, elem) => {
      const text = $(elem).text();
      // Buscar patrones de resultado tipo "3 - 1", "2-0", etc
      const matchResultado = text.match(/(\d+)\s*-\s*(\d+)/);
      if (matchResultado) {
        const localText = $(elem).find(':first-child').text().trim();
        const visitanteText = $(elem).find(':last-child').text().trim();
        if (localText && visitanteText && localText !== visitanteText) {
          resultados.push({ 
            local: localText, 
            visitante: visitanteText, 
            resultado: matchResultado[0] 
          });
        }
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