import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// API PÚBLICA - No requiere autenticación
// Devuelve datos deportivos para mostrar en la web del club
// v4 - Con caché en memoria para evitar rate limiting

// Caché en memoria: datos + timestamp
let cachedData = null;
let cacheTimestamp = 0;
let cachedDateStr = '';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const now = Date.now();
    let proximosPartidos, resultadosLocal, resultadosVisitante, clasificaciones, goleadoresGlobal, goleadoresBustarviejo;

    // Si la caché es válida, usar datos cacheados
    if (cachedData && (now - cacheTimestamp) < CACHE_TTL_MS) {
      ({ proximosPartidos, resultadosLocal, resultadosVisitante, clasificaciones, goleadoresGlobal, goleadoresBustarviejo } = cachedData);
    } else {
      // Cargar datos frescos de la BD
      const base44 = createClientFromRequest(req);

      [proximosPartidos, resultadosLocal, resultadosVisitante, clasificaciones, goleadoresGlobal, goleadoresBustarviejo] = await Promise.all([
        base44.asServiceRole.entities.ProximoPartido.list('-fecha_iso', 50),
        base44.asServiceRole.entities.Resultado.filter({ local: { $regex: 'BUSTARVIEJO' }, estado: 'finalizado' }, '-jornada', 100).catch(() => []),
        base44.asServiceRole.entities.Resultado.filter({ visitante: { $regex: 'BUSTARVIEJO' }, estado: 'finalizado' }, '-jornada', 100).catch(() => []),
        base44.asServiceRole.entities.Clasificacion.list('-puntos', 200),
        base44.asServiceRole.entities.Goleador.list('-goles', 200),
        base44.asServiceRole.entities.Goleador.filter({ equipo: { $regex: 'BUSTARVIEJO' } }, '-goles', 100).catch(() => []),
      ]);

      // Guardar en caché
      cachedData = { proximosPartidos, resultadosLocal, resultadosVisitante, clasificaciones, goleadoresGlobal, goleadoresBustarviejo };
      cacheTimestamp = now;
    }

    // Merge resultados y deduplicar por id
    const resultadosMap = new Map();
    for (const r of [...resultadosLocal, ...resultadosVisitante]) resultadosMap.set(r.id, r);
    const resultados = Array.from(resultadosMap.values());

    const goleadoresMap = new Map();
    for (const g of goleadoresGlobal) goleadoresMap.set(g.id, g);
    for (const g of goleadoresBustarviejo) goleadoresMap.set(g.id, g);
    const goleadores = Array.from(goleadoresMap.values());

    const clasificacionesPorCategoria = {};
    for (const c of clasificaciones) {
      if (!clasificacionesPorCategoria[c.categoria]) clasificacionesPorCategoria[c.categoria] = [];
      clasificacionesPorCategoria[c.categoria].push({
        posicion: c.posicion, equipo: c.nombre_equipo, puntos: c.puntos,
        pj: c.partidos_jugados || 0, pg: c.ganados || 0, pe: c.empatados || 0,
        pp: c.perdidos || 0, gf: c.goles_favor || 0, gc: c.goles_contra || 0,
      });
    }
    for (const cat of Object.keys(clasificacionesPorCategoria)) {
      clasificacionesPorCategoria[cat].sort((a, b) => a.posicion - b.posicion);
    }

    const goleadoresPorCategoria = {};
    for (const g of goleadores) {
      if (!g.equipo || !g.equipo.toLowerCase().includes('bustarviejo')) continue;
      if (!goleadoresPorCategoria[g.categoria]) goleadoresPorCategoria[g.categoria] = [];
      goleadoresPorCategoria[g.categoria].push({
        posicion: g.posicion, jugador: g.jugador_nombre, equipo: g.equipo, goles: g.goles,
      });
    }

    const resultadosPorCategoria = {};
    for (const r of resultados) {
      if (!resultadosPorCategoria[r.categoria]) resultadosPorCategoria[r.categoria] = [];
      resultadosPorCategoria[r.categoria].push({
        jornada: r.jornada, local: r.local, visitante: r.visitante,
        goles_local: r.goles_local, goles_visitante: r.goles_visitante,
      });
    }

    // Filtrar solo partidos futuros (hoy incluido) y deduplicar
    const hoyStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const proximosDedup = new Map();
    for (const p of proximosPartidos) {
      // Excluir partidos ya disputados
      if (p.fecha_iso && p.fecha_iso < hoyStr) continue;
      const key = `${p.categoria}_${p.jornada}_${p.local}_${p.visitante}`;
      if (!proximosDedup.has(key)) proximosDedup.set(key, p);
    }
    const proximos = Array.from(proximosDedup.values()).map(p => ({
      categoria: p.categoria, jornada: p.jornada, local: p.local,
      visitante: p.visitante, fecha: p.fecha, hora: p.hora,
      campo: p.campo, fecha_iso: p.fecha_iso,
    }));

    const data = {
      club: 'CD Bustarviejo',
      actualizado: new Date().toISOString(),
      proximos_partidos: proximos,
      resultados: resultadosPorCategoria,
      clasificaciones: clasificacionesPorCategoria,
      goleadores: goleadoresPorCategoria,
    };

    let wantsJSON = false;
    try {
      const url = new URL(req.url);
      wantsJSON = url.searchParams.get('format') === 'json';
    } catch {}

    if (wantsJSON) {
      return Response.json(data, { headers: corsHeaders });
    }

    // Detectar si hay datos de competición
    const hayDatos = (data.proximos_partidos?.length > 0) ||
      Object.keys(data.clasificaciones || {}).length > 0 ||
      Object.keys(data.goleadores || {}).length > 0;

    // Permitir preview de la pantalla offseason con ?preview=offseason
    let forceOffseason = false;
    try { forceOffseason = new URL(req.url).searchParams.get('preview') === 'offseason'; } catch {}

    const htmlPage = (!hayDatos || forceOffseason) ? generarHTMLOffseason() : generarHTML(data);
    return new Response(htmlPage, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Error en publicData:', error);
    return Response.json({ error: 'Error al obtener datos' }, { status: 500, headers: corsHeaders });
  }
});

function generarHTML(data) {
  const ESCUDO = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png';
  const WEB = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/';

  // Clasificaciones
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

  // Goleadores
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

  // Próximos partidos
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
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
/* ═══ RESET ═══ */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Montserrat', Arial, sans-serif;
  color: #222;
  background: #fff;
  font-size: 19px;
  line-height: 1.8;
  padding-top: 80px;
}

/* ═══ HEADER — EXACTO COMO LA WEB ═══ */
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  background: #fff;
  border-bottom: 1px solid #eaeaea;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.header-contenido {
  max-width: 1200px;
  margin: auto;
  padding: 14px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  color: #222;
}
.logo img { width: 44px; }
.menu {
  display: flex;
  gap: 22px;
  align-items: center;
}
.menu a {
  text-decoration: none;
  color: #222;
  font-weight: 700;
  font-size: 0.95rem;
  text-transform: uppercase;
}
.menu a:hover { color: #f57c00; }
.btn-menu {
  background: #f57c00;
  color: #000 !important;
  padding: 12px 20px;
  border-radius: 30px;
  font-weight: 800;
  font-size: 0.85rem;
  text-decoration: none;
}
.menu-check { display: none; }
.menu-toggle {
  display: none;
  font-size: 2.2rem;
  cursor: pointer;
  margin-left: auto;
  min-width: 44px;
  min-height: 44px;
  line-height: 44px;
  text-align: center;
  user-select: none;
  -webkit-user-select: none;
}

/* ═══ HERO COMPETICIÓN ═══ */
.cabecera-pagina {
  background: #f5f5f5;
  padding: 70px 20px;
  text-align: center;
}
.cabecera-pagina h1 {
  font-size: 2.8rem;
  font-weight: 800;
  color: #222;
  margin-bottom: 8px;
}
.cabecera-pagina p {
  font-size: 1.15rem;
  opacity: 0.9;
  color: #555;
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
  padding: 12px 28px;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f5f5;
  color: #555;
  border: 2px solid transparent;
  text-transform: uppercase;
}
.tab-label:hover { background: #eee; }

input[name="tab"] { display: none; }
.seccion { display: none; }
#radio-proximos:checked ~ .contenido-comp #sec-proximos { display: block; }
#radio-clasificacion:checked ~ .contenido-comp #sec-clasificacion { display: block; }
#radio-goleadores:checked ~ .contenido-comp #sec-goleadores { display: block; }

#radio-proximos:checked ~ .tabs-bar label[for="radio-proximos"],
#radio-clasificacion:checked ~ .tabs-bar label[for="radio-clasificacion"],
#radio-goleadores:checked ~ .tabs-bar label[for="radio-goleadores"] {
  background: #f57c00;
  color: #000;
  border-color: #f57c00;
  box-shadow: 0 4px 14px rgba(245,124,0,0.3);
}

/* ═══ CONTENIDO ═══ */
.contenido-comp {
  max-width: 950px;
  margin: 0 auto;
  padding: 28px 22px 60px;
}
.bloque {
  background: #fff;
  border-radius: 10px;
  padding: 40px;
  margin-bottom: 24px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.07);
}
.bloque h2 {
  font-size: 1.6rem;
  font-weight: 800;
  color: #222;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 3px solid #f57c00;
}
h3 {
  font-size: 1rem;
  color: #222;
  font-weight: 700;
  margin: 24px 0 12px;
  padding: 10px 16px;
  background: #fff7ed;
  border-radius: 10px;
  border-left: 4px solid #f57c00;
}

/* ═══ TABLAS ═══ */
.tabla-scroll { overflow-x: auto; margin-bottom: 20px; border-radius: 12px; border: 1px solid #eee; }
table { width: 100%; border-collapse: collapse; min-width: 600px; font-size: 0.8rem; }
th {
  background: #1a1a1a;
  color: white;
  padding: 12px 10px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  font-weight: 700;
}
td { padding: 10px; border-bottom: 1px solid #f0f0f0; text-align: center; }
.td-equipo { text-align: left !important; white-space: nowrap; }
tr:hover { background: #fafafa; }
.club-propio { background: #fff7ed !important; }
.club-propio td { color: #e65100; font-weight: 700; }

/* ═══ PARTIDO CARDS ═══ */
.partido-card {
  background: #f5f5f5;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 12px;
  transition: all 0.2s;
}
.partido-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(0,0,0,0.1);
  border-color: #f57c00;
}
.partido-cat {
  font-size: 0.75rem;
  color: #f57c00;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.partido-equipos {
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.partido-vs { color: #aaa; font-size: 0.8rem; font-weight: 400; }
.equipo-nuestro { color: #e65100; font-weight: 800; }
.partido-info { font-size: 0.8rem; color: #777; margin-top: 8px; }
.sin-datos { text-align: center; color: #aaa; padding: 40px 20px; font-size: 1rem; }

/* ═══ FOOTER — EXACTO COMO LA WEB ═══ */
.footer {
  background: #111;
  color: #eee;
  padding: 50px 20px 25px;
}
.footer-contenido {
  max-width: 1200px;
  margin: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 40px;
}
.footer-logo { width: 70px; margin-bottom: 12px; }
.footer-titulo { font-weight: 800; margin-bottom: 12px; font-size: 1rem; }
.footer-texto { color: #ccc; font-size: 0.9rem; line-height: 1.8; }
.footer-texto a { color: #ccc; text-decoration: none; }
.footer-texto a:hover { color: #f57c00; }
.footer-links { list-style: none; padding: 0; }
.footer-links li { margin-bottom: 8px; }
.footer-links a { color: #ccc; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
.footer-links a:hover { color: #f57c00; }
.footer-copy {
  text-align: center;
  margin-top: 35px;
  font-size: 0.85rem;
  color: #aaa;
  border-top: 1px solid #333;
  padding-top: 20px;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  body { padding-top: 90px; font-size: 18px; }
  .menu-toggle { display: block !important; }
  .header-contenido {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  .logo { order: 1; }
  .menu-check { order: 2; }
  .menu-toggle { order: 2; }
  .menu {
    order: 3;
    width: 100%;
    display: none !important;
    flex-direction: column;
    align-items: center;
    background: #fff;
    padding: 15px 0;
    margin-top: 10px;
    border-top: 1px solid #eaeaea;
    gap: 0;
  }
  /* Cuando el checkbox está marcado, mostrar el menú */
  .menu-check:checked ~ .menu { display: flex !important; }
  .menu a {
    font-size: 1.05rem;
    padding: 14px 0;
    width: 100%;
    text-align: center;
    border-bottom: 1px solid #f0f0f0;
  }
  .menu a:last-child { border-bottom: none; }
  .menu .btn-menu { margin-top: 10px; }
  .cabecera-pagina { padding: 50px 16px; }
  .cabecera-pagina h1 { font-size: 2rem; }
  .cabecera-pagina p { font-size: 1rem; }
  .tab-label { padding: 10px 18px; font-size: 0.8rem; }
  .bloque { padding: 22px; }
  .bloque h2 { font-size: 1.3rem; }
  h3 { font-size: 0.9rem; }
  table { font-size: 0.75rem; }
  .partido-equipos { font-size: 1rem; }
}
</style>
</head>
<body>

<!-- HEADER — idéntico a la web -->
<header class="header">
  <div class="header-contenido">
    <a class="logo" href="${WEB}">
      <img src="${ESCUDO}" alt="Escudo C.D. Bustarviejo">
      <span>C.D. Bustarviejo</span>
    </a>
    <input type="checkbox" id="menu-check" class="menu-check">
    <label for="menu-check" class="menu-toggle" aria-label="Abrir menú">☰</label>
    <nav class="menu">
      <a href="${WEB}">Inicio</a>
      <a href="${WEB}el-club.html">El Club</a>
      <a href="${WEB}equipos.html">Equipos</a>
      <a href="${WEB}patrocinadores.html">Patrocinadores</a>
      <a href="${WEB}tienda.html">Tienda</a>
      <a href="${WEB}comunicados.html">Comunicados</a>
      <a href="${WEB}galeria.html">Galería</a>
      <a class="btn-menu" style="background:#333;color:#fff !important;">Competición</a>
      <a href="${WEB}area-interna.html">Área interna</a>
      <a class="btn-menu" href="https://alta-socio.vercel.app/alta-socio.html?ref=9TB4YE" target="_blank">Hazte socio</a>
    </nav>
  </div>
</header>

<!-- CABECERA PÁGINA -->
<section class="cabecera-pagina">
  <h1>Competición</h1>
  <p>Resultados, clasificaciones y goleadores — Temporada 2024/2025</p>
</section>

<input type="radio" name="tab" id="radio-proximos" checked>
<input type="radio" name="tab" id="radio-clasificacion">
<input type="radio" name="tab" id="radio-goleadores">

<div class="tabs-bar">
  <label class="tab-label" for="radio-proximos">📅 Próximos Partidos</label>
  <label class="tab-label" for="radio-clasificacion">🏆 Clasificación</label>
  <label class="tab-label" for="radio-goleadores">⚽ Goleadores</label>
</div>

<div class="contenido-comp">
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

<!-- FOOTER — idéntico a la web -->
<footer class="footer">
  <div class="footer-contenido">
    <div class="footer-col">
      <img src="${ESCUDO}" class="footer-logo" alt="Escudo">
      <p class="footer-titulo">C.D. Bustarviejo</p>
      <p class="footer-texto">Deporte y valores desde 1989</p>
    </div>
    <div class="footer-col">
      <p class="footer-titulo">Enlaces</p>
      <ul class="footer-links">
        <li><a href="${WEB}">Inicio</a></li>
        <li><a href="${WEB}el-club.html">El Club</a></li>
        <li><a href="${WEB}equipos.html">Equipos</a></li>
        <li><a href="${WEB}patrocinadores.html">Patrocinadores</a></li>
        <li><a href="${WEB}galeria.html">Galería</a></li>
        <li><a href="${WEB}aviso-legal.html">Aviso Legal</a></li>
        <li><a href="${WEB}privacidad.html">Política de Privacidad</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <p class="footer-titulo">Contacto</p>
      <p class="footer-texto">
        📧 <a href="mailto:info@cdbustarviejo.com">info@cdbustarviejo.com</a><br>
        📍 Bustarviejo (Madrid)
      </p>
    </div>
  </div>
  <div class="footer-copy">
    © 1989–2026 · C.D. Bustarviejo · Todos los derechos reservados
  </div>
</footer>

<!-- menú hamburguesa funciona solo con CSS, sin JavaScript -->

</body>
</html>`;
}

function generarHTMLOffseason() {
  const ESCUDO = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png';
  const WEB = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/';

  // Calcular próximo 1 de septiembre
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear(); // si ya pasó sept, apuntar al siguiente
  const nextSeason = `${year}/${year + 1}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Competición — C.D. Bustarviejo</title>
<link rel="icon" href="${ESCUDO}">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Montserrat', Arial, sans-serif;
  color: #222;
  background: #fff;
  padding-top: 80px;
}

/* HEADER */
.header { position: fixed; top: 0; left: 0; width: 100%; z-index: 1000; background: #fff; border-bottom: 1px solid #eaeaea; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.header-contenido { max-width: 1200px; margin: auto; padding: 14px 22px; display: flex; justify-content: space-between; align-items: center; }
.logo { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 1.1rem; text-decoration: none; color: #222; }
.logo img { width: 44px; }
.menu { display: flex; gap: 22px; align-items: center; }
.menu a { text-decoration: none; color: #222; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; }
.menu a:hover { color: #f57c00; }
.btn-menu { background: #f57c00; color: #000 !important; padding: 12px 20px; border-radius: 30px; font-weight: 800; font-size: 0.85rem; text-decoration: none; }
.menu-check { display: none; }
.menu-toggle { display: none; font-size: 2.2rem; cursor: pointer; margin-left: auto; min-width: 44px; min-height: 44px; line-height: 44px; text-align: center; user-select: none; }

/* HERO OFFSEASON */
.offseason-hero {
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 24px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
  position: relative;
  overflow: hidden;
}
.offseason-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 50%, rgba(245,124,0,0.08) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(245,124,0,0.05) 0%, transparent 40%);
  animation: bgFloat 20s ease-in-out infinite;
}
@keyframes bgFloat {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-2%, -1%); }
}

.offseason-escudo {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 4px solid rgba(245,124,0,0.4);
  box-shadow: 0 0 60px rgba(245,124,0,0.2), 0 20px 60px rgba(0,0,0,0.3);
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
  animation: pulse 3s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 60px rgba(245,124,0,0.2), 0 20px 60px rgba(0,0,0,0.3); }
  50% { box-shadow: 0 0 80px rgba(245,124,0,0.35), 0 20px 60px rgba(0,0,0,0.3); }
}

.offseason-titulo {
  font-size: 3rem;
  font-weight: 900;
  color: #fff;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
  line-height: 1.2;
}
.offseason-titulo span { color: #f57c00; }

.offseason-sub {
  font-size: 1.2rem;
  color: rgba(255,255,255,0.7);
  margin-bottom: 48px;
  position: relative;
  z-index: 1;
  max-width: 500px;
  line-height: 1.6;
}

/* FECHA DE VUELTA */
.countdown-placeholder {
  position: relative;
  z-index: 1;
  margin-bottom: 48px;
}
.comeback-date {
  font-size: 1.3rem;
  color: #fff;
  background: rgba(245,124,0,0.2);
  border: 2px solid rgba(245,124,0,0.4);
  border-radius: 50px;
  padding: 16px 32px;
  display: inline-block;
}
.comeback-date strong {
  color: #f57c00;
}

/* BADGES */
.offseason-badges {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  position: relative;
  z-index: 1;
  margin-bottom: 40px;
}
.badge {
  background: rgba(245,124,0,0.15);
  border: 1px solid rgba(245,124,0,0.3);
  color: #f5a623;
  padding: 10px 20px;
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 700;
}

.offseason-msg {
  color: rgba(255,255,255,0.4);
  font-size: 0.85rem;
  position: relative;
  z-index: 1;
  max-width: 400px;
  line-height: 1.6;
}

/* FOOTER */
.footer { background: #111; color: #eee; padding: 50px 20px 25px; }
.footer-contenido { max-width: 1200px; margin: auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 40px; }
.footer-logo { width: 70px; margin-bottom: 12px; }
.footer-titulo { font-weight: 800; margin-bottom: 12px; font-size: 1rem; }
.footer-texto { color: #ccc; font-size: 0.9rem; line-height: 1.8; }
.footer-texto a { color: #ccc; text-decoration: none; }
.footer-texto a:hover { color: #f57c00; }
.footer-links { list-style: none; padding: 0; }
.footer-links li { margin-bottom: 8px; }
.footer-links a { color: #ccc; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
.footer-links a:hover { color: #f57c00; }
.footer-copy { text-align: center; margin-top: 35px; font-size: 0.85rem; color: #aaa; border-top: 1px solid #333; padding-top: 20px; }

@media (max-width: 768px) {
  body { padding-top: 90px; }
  .menu-toggle { display: block !important; }
  .header-contenido { flex-direction: row; flex-wrap: wrap; justify-content: space-between; }
  .logo { order: 1; }
  .menu-check { order: 2; }
  .menu-toggle { order: 2; }
  .menu { order: 3; width: 100%; display: none !important; flex-direction: column; align-items: center; background: #fff; padding: 15px 0; margin-top: 10px; border-top: 1px solid #eaeaea; gap: 0; }
  .menu-check:checked ~ .menu { display: flex !important; }
  .menu a { font-size: 1.05rem; padding: 14px 0; width: 100%; text-align: center; border-bottom: 1px solid #f0f0f0; }
  .menu a:last-child { border-bottom: none; }
  .menu .btn-menu { margin-top: 10px; }
  .offseason-titulo { font-size: 2rem; }
  .offseason-sub { font-size: 1rem; }
  .cd-number { font-size: 2rem; }
  .cd-box { min-width: 70px; padding: 14px 16px; }
  .offseason-escudo { width: 100px; height: 100px; }
}
</style>
</head>
<body>

<header class="header">
  <div class="header-contenido">
    <a class="logo" href="${WEB}">
      <img src="${ESCUDO}" alt="Escudo C.D. Bustarviejo">
      <span>C.D. Bustarviejo</span>
    </a>
    <input type="checkbox" id="menu-check" class="menu-check">
    <label for="menu-check" class="menu-toggle" aria-label="Abrir menú">☰</label>
    <nav class="menu">
      <a href="${WEB}">Inicio</a>
      <a href="${WEB}el-club.html">El Club</a>
      <a href="${WEB}equipos.html">Equipos</a>
      <a href="${WEB}patrocinadores.html">Patrocinadores</a>
      <a href="${WEB}tienda.html">Tienda</a>
      <a href="${WEB}comunicados.html">Comunicados</a>
      <a href="${WEB}galeria.html">Galería</a>
      <a class="btn-menu" style="background:#333;color:#fff !important;">Competición</a>
      <a href="${WEB}area-interna.html">Área interna</a>
      <a class="btn-menu" href="https://alta-socio.vercel.app/alta-socio.html?ref=9TB4YE" target="_blank">Hazte socio</a>
    </nav>
  </div>
</header>

<section class="offseason-hero">
  <img src="${ESCUDO}" alt="C.D. Bustarviejo" class="offseason-escudo">
  <h1 class="offseason-titulo">¡Volvemos <span>pronto</span>! 💪</h1>
  <p class="offseason-sub">La competición ha terminado por esta temporada. Estamos preparando la nueva temporada <strong>${nextSeason}</strong> con más fuerza que nunca.</p>
  
  <div class="countdown-placeholder">
    <p class="comeback-date">📅 Volvemos en <strong>Septiembre ${year}</strong></p>
  </div>

  <div class="offseason-badges">
    <div class="badge">🏟️ Desde 1989</div>
    <div class="badge">💚 Bustarviejo</div>
  </div>

  <p class="offseason-msg">Mientras tanto, sigue al club en redes sociales y prepárate para la nueva temporada. ¡Nos vemos en septiembre!</p>
</section>

<footer class="footer">
  <div class="footer-contenido">
    <div class="footer-col">
      <img src="${ESCUDO}" class="footer-logo" alt="Escudo">
      <p class="footer-titulo">C.D. Bustarviejo</p>
      <p class="footer-texto">Deporte y valores desde 1989</p>
    </div>
    <div class="footer-col">
      <p class="footer-titulo">Enlaces</p>
      <ul class="footer-links">
        <li><a href="${WEB}">Inicio</a></li>
        <li><a href="${WEB}el-club.html">El Club</a></li>
        <li><a href="${WEB}equipos.html">Equipos</a></li>
        <li><a href="${WEB}patrocinadores.html">Patrocinadores</a></li>
        <li><a href="${WEB}galeria.html">Galería</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <p class="footer-titulo">Contacto</p>
      <p class="footer-texto">
        📧 <a href="mailto:info@cdbustarviejo.com">info@cdbustarviejo.com</a><br>
        📍 Bustarviejo (Madrid)
      </p>
    </div>
  </div>
  <div class="footer-copy">© 1989–${new Date().getFullYear()} · C.D. Bustarviejo · Todos los derechos reservados</div>
</footer>



</body>
</html>`;
}