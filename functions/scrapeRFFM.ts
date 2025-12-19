import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { temporada, tipo_juego, competicion_id, grupo_id, test_mode, api_url_manual } = await req.json();

    // Si el usuario provee una URL de API manual, usarla directamente
    if (api_url_manual) {
      try {
        console.log('🎯 Usando URL de API manual:', api_url_manual);
        const apiRes = await fetch(api_url_manual, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        if (apiRes.ok) {
          const jsonData = await apiRes.json();
          console.log('✅ API manual funcionó');
          
          // Extraer clasificación de diferentes estructuras
          let clasificacion = [];
          if (jsonData.pageProps?.clasificacion) {
            clasificacion = jsonData.pageProps.clasificacion;
          } else if (jsonData.pageProps?.data?.clasificacion) {
            clasificacion = jsonData.pageProps.data.clasificacion;
          } else if (Array.isArray(jsonData)) {
            clasificacion = jsonData;
          } else if (jsonData.clasificacion) {
            clasificacion = jsonData.clasificacion;
          } else if (jsonData.data) {
            clasificacion = jsonData.data;
          }

          const formatted = clasificacion.map((e, i) => ({
            posicion: e.posicion || e.pos || e.position || i + 1,
            equipo: e.nombre || e.equipo || e.team || e.nombreEquipo || '',
            partidos_jugados: e.pj || e.partidos_jugados || e.played || '',
            ganados: e.g || e.ganados || e.won || '',
            empatados: e.e || e.empatados || e.draw || '',
            perdidos: e.p || e.perdidos || e.lost || '',
            goles_favor: e.gf || e.goles_favor || e.goalsFor || '',
            goles_contra: e.gc || e.goles_contra || e.goalsAgainst || '',
            puntos: e.pt || e.puntos || e.points || 0
          }));

          return Response.json({
            success: formatted.length > 0,
            method: 'api_manual',
            api_url: api_url_manual,
            clasificacion: formatted,
            resultados: jsonData.resultados || [],
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Error con API manual:', error);
        return Response.json({
          error: `Error al usar URL manual: ${error.message}`,
          api_url: api_url_manual
        }, { status: 400 });
      }
    }

    if (!temporada || !tipo_juego || !competicion_id || !grupo_id) {
      return Response.json({ 
        error: 'Faltan parámetros',
        required: ['temporada', 'tipo_juego', 'competicion_id', 'grupo_id']
      }, { status: 400 });
    }

    const url = `https://www.rffm.es/competicion/clasificaciones?temporada=${temporada}&tipojuego=${tipo_juego}&competicion=${competicion_id}&grupo=${grupo_id}`;
    
    // 🎯 ESTRATEGIA 1: Probar múltiples endpoints de API
    // Primero intentar Next.js data endpoints (patrón descubierto por el usuario)
    const buildIds = ['pvY0PCDJfksSJVbXZTPng', 'latest', 'build'];
    const apiUrls = [];

    // Next.js data URLs
    for (const buildId of buildIds) {
      apiUrls.push(
        `https://www.rffm.es/_next/data/${buildId}/competicion/clasificaciones.json?temporada=${temporada}&tipojuego=${tipo_juego}&competicion=${competicion_id}&grupo=${grupo_id}`,
        `https://www.rffm.es/_next/data/${buildId}/clasificaciones.json?temporada=${temporada}&tipojuego=${tipo_juego}&competicion=${competicion_id}&grupo=${grupo_id}`
      );
    }

    // APIs REST tradicionales
    apiUrls.push(
      `https://www.rffm.es/api/competicion/clasificacion?temporada=${temporada}&tipojuego=${tipo_juego}&competicion=${competicion_id}&grupo=${grupo_id}`,
      `https://www.rffm.es/api/clasificacion?temporada=${temporada}&tipo_juego=${tipo_juego}&competicion=${competicion_id}&grupo=${grupo_id}`,
      `https://competiciones.rffm.es/api/clasificacion/${grupo_id}`,
      `https://www.rffm.es/competicion/api/clasificacion/${grupo_id}`
    );

    for (const apiUrl of apiUrls) {
      try {
        console.log(`🎯 Probando API: ${apiUrl}`);
        const apiRes = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': url
          }
        });

        if (apiRes.ok) {
          const jsonData = await apiRes.json();
          console.log('✅ API JSON funcionó:', apiUrl);

          // Intentar extraer datos con diferentes estructuras
          let clasificacion = [];

          // Next.js structure: pageProps.clasificacion
          if (jsonData.pageProps?.clasificacion) {
            clasificacion = jsonData.pageProps.clasificacion;
          } else if (jsonData.pageProps?.data?.clasificacion) {
            clasificacion = jsonData.pageProps.data.clasificacion;
          } else if (Array.isArray(jsonData)) {
            clasificacion = jsonData;
          } else if (jsonData.clasificacion) {
            clasificacion = jsonData.clasificacion;
          } else if (jsonData.data) {
            clasificacion = jsonData.data;
          } else if (jsonData.equipos) {
            clasificacion = jsonData.equipos;
          }

          const formatted = clasificacion.map((e, i) => ({
            posicion: e.posicion || e.pos || e.position || i + 1,
            equipo: e.nombre || e.equipo || e.team || e.nombreEquipo || '',
            partidos_jugados: e.pj || e.partidos_jugados || e.played || '',
            ganados: e.g || e.ganados || e.won || '',
            empatados: e.e || e.empatados || e.draw || '',
            perdidos: e.p || e.perdidos || e.lost || '',
            goles_favor: e.gf || e.goles_favor || e.goalsFor || '',
            goles_contra: e.gc || e.goles_contra || e.goalsAgainst || '',
            puntos: e.pt || e.puntos || e.points || 0
          }));

          if (formatted.length > 0) {
            return Response.json({
              success: true,
              method: 'api_json',
              api_url: apiUrl,
              url,
              clasificacion: formatted,
              resultados: jsonData.resultados || [],
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (apiError) {
        console.log(`⚠️ Falló ${apiUrl}:`, apiError.message);
      }
    }

    console.log('⚠️ Todas las APIs fallaron');

    // 🔄 FALLBACK: Scraping HTML no funciona - RFFM usa JS dinámico
    return Response.json({
      success: false,
      error: 'RFFM usa JavaScript dinámico para cargar los datos. Necesitas abrir las herramientas de desarrollo del navegador (F12), ir a la pestaña Network, recargar la página y buscar peticiones XHR/Fetch con los datos JSON. Copia esa URL aquí para que podamos integrarla.',
      method: 'manual_required',
      url,
      clasificacion: [],
      resultados: [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});