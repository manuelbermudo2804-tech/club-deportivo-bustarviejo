import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// API PÚBLICA - No requiere autenticación
// Devuelve datos deportivos para mostrar en la web del club
// v2 - Rediseño visual con estilo web cdbustarviejo

Deno.serve(async (req) => {
  // CORS headers para permitir llamadas desde cualquier web
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // Cache 5 minutos
  };

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Leer todos los datos en paralelo usando service role (público)
    const [proximosPartidos, resultados, clasificaciones, goleadores] = await Promise.all([
      base44.asServiceRole.entities.ProximoPartido.list('-fecha_iso', 50),
      base44.asServiceRole.entities.Resultado.filter({ estado: 'finalizado' }, '-jornada', 30),
      base44.asServiceRole.entities.Clasificacion.list('-puntos', 200),
      base44.asServiceRole.entities.Goleador.list('-goles', 500),
    ]);

    // Agrupar clasificaciones por categoría
    const clasificacionesPorCategoria = {};
    for (const c of clasificaciones) {
      if (!clasificacionesPorCategoria[c.categoria]) {
        clasificacionesPorCategoria[c.categoria] = [];
      }
      clasificacionesPorCategoria[c.categoria].push({
        posicion: c.posicion,
        equipo: c.nombre_equipo,
        puntos: c.puntos,
        pj: c.partidos_jugados || 0,
        pg: c.ganados || 0,
        pe: c.empatados || 0,
        pp: c.perdidos || 0,
        gf: c.goles_favor || 0,
        gc: c.goles_contra || 0,
      });
    }
    // Ordenar cada grupo por posición
    for (const cat of Object.keys(clasificacionesPorCategoria)) {
      clasificacionesPorCategoria[cat].sort((a, b) => a.posicion - b.posicion);
    }

    // Agrupar goleadores por categoría - SOLO jugadores de Bustarviejo
    const goleadoresPorCategoria = {};
    for (const g of goleadores) {
      if (!g.equipo || !g.equipo.toLowerCase().includes('bustarviejo')) continue;
      if (!goleadoresPorCategoria[g.categoria]) {
        goleadoresPorCategoria[g.categoria] = [];
      }
      goleadoresPorCategoria[g.categoria].push({
        posicion: g.posicion,
        jugador: g.jugador_nombre,
        equipo: g.equipo,
        goles: g.goles,
      });
    }

    // Agrupar resultados por categoría
    const resultadosPorCategoria = {};
    for (const r of resultados) {
      if (!resultadosPorCategoria[r.categoria]) {
        resultadosPorCategoria[r.categoria] = [];
      }
      resultadosPorCategoria[r.categoria].push({
        jornada: r.jornada,
        local: r.local,
        visitante: r.visitante,
        goles_local: r.goles_local,
        goles_visitante: r.goles_visitante,
      });
    }

    // Próximos partidos limpios
    const proximos = proximosPartidos.map(p => ({
      categoria: p.categoria,
      jornada: p.jornada,
      local: p.local,
      visitante: p.visitante,
      fecha: p.fecha,
      hora: p.hora,
      campo: p.campo,
      fecha_iso: p.fecha_iso,
    }));

    const data = {
      club: 'CD Bustarviejo',
      actualizado: new Date().toISOString(),
      proximos_partidos: proximos,
      resultados: resultadosPorCategoria,
      clasificaciones: clasificacionesPorCategoria,
      goleadores: goleadoresPorCategoria,
    };

    // Detectar si piden JSON explícitamente, si no → HTML por defecto
    let wantsJSON = false;
    try {
      const url = new URL(req.url);
      wantsJSON = url.searchParams.get('format') === 'json';
    } catch {}

    if (wantsJSON) {
      return Response.json(data, { headers: corsHeaders });
    }

    // Por defecto devolver página HTML completa
    const htmlPage = generarHTML(data);
    return new Response(htmlPage, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error en publicData:', error);
    return Response.json(
      { error: 'Error al obtener datos' },
      { status: 500, headers: corsHeaders }
    );
  }
});

function generarHTML(data) {
  const ESCUDO = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png';
  const WEB_URL = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/';

  // Generar tablas de clasificación
  let clasifHTML = '';
  for (const cat in data.clasificaciones) {
    let filas = '';
    for (const eq of data.clasificaciones[cat]) {
      const esNuestro = eq.equipo.toLowerCase().includes('bustarviejo');
      const dg = eq.gf - eq.gc;
      filas += `<tr class="${esNuestro ? 'club-propio' : ''}">
        <td>${eq.posicion}</td><td class="td-equipo">${eq.equipo}</td>
        <td>${eq.pj}</td><td>${eq.pg}</td><td>${eq.pe}</td><td>${eq.pp}</td>
        <td>${eq.gf}</td><td>${eq.gc}</td><td>${dg >= 0 ? '+' : ''}${dg}</td>
        <td><strong>${eq.puntos}</strong></td>
      </tr>`;
    }
    clasifHTML += `<h3>${cat}</h3>
      <div class="tabla-scroll"><table>
        <tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>
        ${filas}
      </table></div>`;
  }

  // Generar tablas de goleadores
  let golesHTML = '';
  let hayGoleadores = false;
  for (const cat in data.goleadores) {
    const jugadores = [...data.goleadores[cat]].sort((a, b) => b.goles - a.goles);
    if (jugadores.length === 0) continue;
    hayGoleadores = true;
    let filas = '';
    jugadores.forEach((j, i) => {
      const emoji = i === 0 ? ' 🥇' : i === 1 ? ' 🥈' : i === 2 ? ' 🥉' : '';
      filas += `<tr><td>${i + 1}</td><td class="td-equipo">${j.jugador}${emoji}</td><td><strong>${j.goles}</strong></td></tr>`;
    });
    golesHTML += `<h3>${cat}</h3>
      <div class="tabla-scroll"><table>
        <tr><th>#</th><th>Jugador</th><th>Goles ⚽</th></tr>
        ${filas}
      </table></div>`;
  }
  if (!hayGoleadores) golesHTML = '<p class="sin-datos">No hay goleadores registrados.</p>';

  // Generar próximos partidos
  let proximosHTML = '';
  if (data.proximos_partidos && data.proximos_partidos.length > 0) {
    const partidos = [...data.proximos_partidos].sort((a, b) => (a.fecha_iso || '').localeCompare(b.fecha_iso || ''));
    for (const p of partidos) {
      const esLocal = p.local.toLowerCase().includes('bustarviejo');
      proximosHTML += `<div class="partido-card">
        <div class="partido-cat">${p.categoria} — Jornada ${p.jornada}</div>
        <div class="partido-equipos">
          <span class="${esLocal ? 'equipo-nuestro' : ''}">${p.local}</span>
          <span class="partido-vs">vs</span>
          <span class="${!esLocal ? 'equipo-nuestro' : ''}">${p.visitante}</span>
        </div>
        <div class="partido-info">📅 ${p.fecha} — 🕐 ${p.hora} — 📍 ${p.campo || 'Por confirmar'}</div>
      </div>`;
    }
  } else {
    proximosHTML = '<p class="sin-datos">No hay próximos partidos programados.</p>';
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Competición — C.D. Bustarviejo</title>
<link rel="icon" href="${ESCUDO}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f5f5f5; color: #1a1a1a; line-height: 1.6; }

/* ═══ NAVBAR — estilo web CD Bustarviejo ═══ */
.navbar {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #1a1a1a;
}
.navbar-brand img {
  width: 44px;
  height: 44px;
  object-fit: contain;
}
.navbar-brand span {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.02em;
}
.navbar-links {
  display: flex;
  align-items: center;
  gap: 8px;
}
.navbar-links a {
  text-decoration: none;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s;
}
.navbar-links a:hover {
  background: #f5f5f5;
}
.navbar-links .btn-hazte-socio {
  background: #f97316;
  color: white;
  font-weight: 700;
  border-radius: 12px;
  padding: 10px 22px;
}
.navbar-links .btn-hazte-socio:hover {
  background: #ea580c;
}

/* ═══ HERO BANNER ═══ */
.hero-banner {
  background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
  color: white;
  text-align: center;
  padding: 50px 20px 40px;
}
.hero-banner h1 {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 6px;
}
.hero-banner p {
  font-size: 16px;
  opacity: 0.75;
  font-weight: 400;
}

/* ═══ TABS ═══ */
.tabs-bar {
  display: flex;
  justify-content: center;
  gap: 10px;
  background: white;
  padding: 16px 20px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
  flex-wrap: wrap;
}
.tab-label {
  padding: 10px 24px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f5f5;
  color: #555;
  border: 2px solid transparent;
}
.tab-label:hover {
  background: #eee;
}

/* Tab radio logic */
input[name="tab"] { display: none; }
.seccion { display: none; }
#radio-proximos:checked ~ .contenido #sec-proximos { display: block; }
#radio-clasificacion:checked ~ .contenido #sec-clasificacion { display: block; }
#radio-goleadores:checked ~ .contenido #sec-goleadores { display: block; }

#radio-proximos:checked ~ .tabs-bar label[for="radio-proximos"],
#radio-clasificacion:checked ~ .tabs-bar label[for="radio-clasificacion"],
#radio-goleadores:checked ~ .tabs-bar label[for="radio-goleadores"] {
  background: #f97316;
  color: white;
  border-color: #f97316;
  box-shadow: 0 4px 14px rgba(249,115,22,0.3);
}

/* ═══ CONTENIDO ═══ */
.contenido {
  max-width: 1000px;
  margin: 0 auto;
  padding: 28px 16px 60px;
}

.bloque {
  background: white;
  border-radius: 20px;
  padding: 28px;
  margin-bottom: 24px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.04);
}
.bloque h2 {
  font-size: 22px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 3px solid #f97316;
  letter-spacing: -0.02em;
}
h3 {
  font-size: 15px;
  color: #1a1a1a;
  font-weight: 700;
  margin: 24px 0 12px;
  padding: 10px 16px;
  background: #fff7ed;
  border-radius: 10px;
  border-left: 4px solid #f97316;
}

/* ═══ TABLAS ═══ */
.tabla-scroll { overflow-x: auto; margin-bottom: 20px; border-radius: 12px; border: 1px solid #eee; }
table { width: 100%; border-collapse: collapse; min-width: 600px; font-size: 13px; }
th {
  background: #1a1a1a;
  color: white;
  padding: 12px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  font-weight: 600;
}
td { padding: 10px; border-bottom: 1px solid #f0f0f0; text-align: center; }
.td-equipo { text-align: left !important; white-space: nowrap; }
tr:hover { background: #fafafa; }
.club-propio { background: #fff7ed !important; }
.club-propio td { color: #c2410c; font-weight: 700; }

/* ═══ PARTIDO CARDS ═══ */
.partido-card {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 12px;
  transition: all 0.2s;
}
.partido-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  border-color: #f97316;
}
.partido-cat {
  font-size: 12px;
  color: #f97316;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.partido-equipos {
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.partido-vs { color: #aaa; font-size: 13px; font-weight: 400; }
.equipo-nuestro { color: #c2410c; font-weight: 800; }
.partido-info { font-size: 13px; color: #777; margin-top: 8px; }

.sin-datos { text-align: center; color: #aaa; padding: 40px 20px; font-size: 15px; }

/* ═══ FOOTER ═══ */
.footer {
  text-align: center;
  padding: 24px 20px;
  font-size: 12px;
  color: #999;
  border-top: 1px solid #eee;
  background: white;
}
.footer a { color: #f97316; text-decoration: none; font-weight: 600; }
.footer a:hover { text-decoration: underline; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  .navbar { padding: 0 12px; height: 60px; }
  .navbar-brand img { width: 36px; height: 36px; }
  .navbar-brand span { font-size: 15px; }
  .navbar-links a:not(.btn-hazte-socio) { display: none; }
  .navbar-links .btn-hazte-socio { padding: 8px 16px; font-size: 13px; }
  .hero-banner { padding: 32px 16px 28px; }
  .hero-banner h1 { font-size: 24px; }
  .hero-banner p { font-size: 14px; }
  .tab-label { padding: 8px 16px; font-size: 13px; }
  .bloque { padding: 18px; border-radius: 16px; }
  .bloque h2 { font-size: 18px; }
  h3 { font-size: 14px; }
  table { font-size: 12px; }
  .partido-equipos { font-size: 15px; }
}
</style>
</head>
<body>

<!-- NAVBAR -->
<nav class="navbar">
  <a class="navbar-brand" href="${WEB_URL}">
    <img src="${ESCUDO}" alt="CD Bustarviejo">
    <span>C.D. Bustarviejo</span>
  </a>
  <div class="navbar-links">
    <a href="${WEB_URL}">Inicio</a>
    <a href="${WEB_URL}equipos.html">Equipos</a>
    <a href="${WEB_URL}patrocinadores.html">Patrocinadores</a>
    <a class="btn-hazte-socio" href="https://alta-socio.vercel.app/alta-socio.html?ref=9TB4YE" target="_blank">HAZTE SOCIO</a>
  </div>
</nav>

<!-- HERO -->
<div class="hero-banner">
  <h1>Competición</h1>
  <p>Resultados, clasificaciones y goleadores — Temporada 2024/2025</p>
</div>

<input type="radio" name="tab" id="radio-proximos" checked>
<input type="radio" name="tab" id="radio-clasificacion">
<input type="radio" name="tab" id="radio-goleadores">

<div class="tabs-bar">
  <label class="tab-label" for="radio-proximos">📅 Próximos Partidos</label>
  <label class="tab-label" for="radio-clasificacion">🏆 Clasificación</label>
  <label class="tab-label" for="radio-goleadores">⚽ Goleadores</label>
</div>

<div class="contenido">
  <div id="sec-proximos" class="seccion">
    <div class="bloque">
      <h2>📅 Próximos Partidos</h2>
      ${proximosHTML}
    </div>
  </div>

  <div id="sec-clasificacion" class="seccion">
    <div class="bloque">
      <h2>🏆 Clasificación</h2>
      ${clasifHTML}
    </div>
  </div>

  <div id="sec-goleadores" class="seccion">
    <div class="bloque">
      <h2>⚽ Goleadores C.D. Bustarviejo</h2>
      ${golesHTML}
    </div>
  </div>
</div>

<div class="footer">
  Actualizado: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} · <a href="${WEB_URL}">C.D. Bustarviejo</a>
</div>

</body>
</html>`;
}