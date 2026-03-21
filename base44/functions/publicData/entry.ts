import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// API PÚBLICA - No requiere autenticación
// Devuelve datos deportivos para mostrar en la web del club
// v4 - Con caché en memoria para evitar rate limiting

// Caché en memoria: datos + timestamp
let cachedData = null;
let cacheTimestamp = 0;
let cachedDateStr = '';
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos (para actualizar hora de partidos de hoy)

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

    // Invalidar caché si cambió el día (para actualizar filtro de próximos partidos)
    const todayStr = new Date().toISOString().split('T')[0];
    if (cachedDateStr !== todayStr) { cachedData = null; cachedDateStr = todayStr; }

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
    // Para partidos de HOY: excluir si su hora + 2h ya pasó (probablemente terminado)
    const hoyStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const ahora = new Date();
    const proximosDedup = new Map();
    const resultadosRecientesDedup = new Map();
    for (const p of proximosPartidos) {
      const key = `${p.categoria}_${p.jornada}_${p.local}_${p.visitante}`;
      if (p.jugado && p.goles_local != null && p.goles_visitante != null) {
        if (!resultadosRecientesDedup.has(key)) resultadosRecientesDedup.set(key, p);
      } else if (!p.fecha_iso || p.fecha_iso > hoyStr) {
        // Partido futuro (no es hoy) → incluir
        if (!proximosDedup.has(key)) proximosDedup.set(key, p);
      } else if (p.fecha_iso === hoyStr) {
        // Partido de HOY → solo incluir si la hora+2h no ha pasado aún
        if (p.hora) {
          const [h, m] = p.hora.split(':').map(Number);
          const matchEnd = new Date(ahora);
          matchEnd.setHours(h + 2, m || 0, 0, 0);
          if (ahora < matchEnd) {
            if (!proximosDedup.has(key)) proximosDedup.set(key, p);
          }
          // Si ya terminó, no se añade a próximos (quedará sin mostrar hasta que el scraper lo marque como jugado)
        } else {
          // Sin hora → incluir por defecto
          if (!proximosDedup.has(key)) proximosDedup.set(key, p);
        }
      }
    }
    // Ordenar por fecha + hora para que los de hoy avancen según pasan las horas
    const proximos = Array.from(proximosDedup.values())
      .map(p => ({
        categoria: p.categoria, jornada: p.jornada, local: p.local,
        visitante: p.visitante, fecha: p.fecha, hora: p.hora,
        campo: p.campo, fecha_iso: p.fecha_iso,
      }))
      .sort((a, b) => {
        const cmpDate = (a.fecha_iso || '').localeCompare(b.fecha_iso || '');
        if (cmpDate !== 0) return cmpDate;
        return (a.hora || '99:99').localeCompare(b.hora || '99:99');
      });
    const resultadosRecientes = Array.from(resultadosRecientesDedup.values())
      .map(p => ({
        categoria: p.categoria, jornada: p.jornada, local: p.local,
        visitante: p.visitante, fecha: p.fecha, hora: p.hora,
        campo: p.campo, fecha_iso: p.fecha_iso,
        goles_local: p.goles_local, goles_visitante: p.goles_visitante,
      }))
      .sort((a, b) => (b.fecha_iso || '').localeCompare(a.fecha_iso || ''))
      .slice(0, 20);

    const data = {
      club: 'CD Bustarviejo',
      actualizado: new Date().toISOString(),
      proximos_partidos: proximos,
      resultados_recientes: resultadosRecientes,
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
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, max-age=0' },
    });

  } catch (error) {
    console.error('Error en publicData:', error);
    return Response.json({ error: 'Error al obtener datos' }, { status: 500, headers: corsHeaders });
  }
});

function generarHTML(data) {
  const ESCUDO = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png';
  const WEB = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/';

  // Temporada automática
  const now = new Date();
  const yr = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const temporada = `${yr}/${yr + 1}`;

  // Helper: formatear fecha bonita
  function fechaBonita(fechaStr) {
    if (!fechaStr) return '';
    const parts = fechaStr.split('/');
    if (parts.length !== 3) return fechaStr;
    const [d, m, y] = parts;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dias[date.getDay()]} ${date.getDate()} ${meses[date.getMonth()]}`;
  }

  // Helper: días hasta partido
  function diasHasta(fechaIso) {
    if (!fechaIso) return '';
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fecha = new Date(fechaIso + 'T00:00:00');
    const diff = Math.ceil((fecha - hoy) / 86400000);
    if (diff === 0) return '¡HOY!';
    if (diff === 1) return 'MAÑANA';
    if (diff <= 7) return `En ${diff} días`;
    return '';
  }

  // Helper: categoría corta
  function catCorta(cat) {
    return (cat || '').replace('Fútbol ', '').replace('Baloncesto ', '🏀 ').replace('(Mixto)', '').trim();
  }

  // ─── FUSIONAR RESULTADOS de ambas fuentes (ProximoPartido jugado + Resultado entity) ───
  // data.resultados_recientes viene de ProximoPartido (jugado=true) — puede estar vacío
  // data.resultados viene de Resultado entity agrupado por categoría — tiene datos reales
  const allResults = [...(data.resultados_recientes || [])];
  // Añadir resultados de la entidad Resultado que no estén ya
  for (const cat in (data.resultados || {})) {
    for (const r of data.resultados[cat]) {
      const isDup = allResults.some(e => e.local === r.local && e.visitante === r.visitante && e.jornada === r.jornada);
      if (!isDup) allResults.push({ ...r, categoria: cat });
    }
  }
  // Ordenar por jornada desc (las más recientes primero)
  allResults.sort((a, b) => (b.jornada || 0) - (a.jornada || 0));

  // ─── ÚLTIMO RESULTADO DEL BUSTARVIEJO (para hero) ───
  const ultimoResultado = allResults.find(r => {
    return r.local?.toLowerCase().includes('bustarviejo') || r.visitante?.toLowerCase().includes('bustarviejo');
  });
  let ultimoResHTML = '';
  if (ultimoResultado) {
    const esLocalUlt = ultimoResultado.local.toLowerCase().includes('bustarviejo');
    const gN = esLocalUlt ? ultimoResultado.goles_local : ultimoResultado.goles_visitante;
    const gR = esLocalUlt ? ultimoResultado.goles_visitante : ultimoResultado.goles_local;
    const rival = esLocalUlt ? ultimoResultado.visitante : ultimoResultado.local;
    const res = gN > gR ? 'victoria' : gN < gR ? 'derrota' : 'empate';
    const icon = res === 'victoria' ? '✅' : res === 'derrota' ? '❌' : '🤝';
    const rivalCorto = rival.length > 25 ? rival.substring(0, 22) + '...' : rival;
    ultimoResHTML = `<div class="hero-ultimo"><span class="hero-ultimo-label">Último resultado</span><span class="hero-ultimo-res">${icon} Bustarviejo <strong>${gN}-${gR}</strong> ${rivalCorto}</span></div>`;
  }

  // ─── RESUMEN RÁPIDO: posición de Bustarviejo en cada liga ───
  let resumenHTML = '';
  const resumenItems = [];
  for (const cat in data.clasificaciones) {
    const bust = data.clasificaciones[cat].find(e => e.equipo.toLowerCase().includes('bustarviejo'));
    if (bust) {
      const total = data.clasificaciones[cat].length;
      resumenItems.push({ cat, pos: bust.posicion, total, pts: bust.puntos, pj: bust.pj });
    }
  }
  if (resumenItems.length > 0) {
    resumenHTML = '<div class="resumen-grid">' + resumenItems.map(r => 
      `<div class="resumen-card"><div class="resumen-pos">${r.pos}º</div><div class="resumen-cat">${catCorta(r.cat)}</div><div class="resumen-detail">${r.pts} pts · ${r.pj} PJ · de ${r.total}</div></div>`
    ).join('') + '</div>';
  }

  // ─── PRÓXIMO PARTIDO DESTACADO (HERO) ───
  // Ordenar por fecha + hora para que el hero sea siempre el más inminente
  const sortedProximos = [...(data.proximos_partidos || [])].sort((a, b) => {
    const cmpDate = (a.fecha_iso || '').localeCompare(b.fecha_iso || '');
    if (cmpDate !== 0) return cmpDate;
    return (a.hora || '99:99').localeCompare(b.hora || '99:99');
  });
  // Elegir el partido más próximo que AÚN NO ha empezado
  const ahora = new Date();
  const heroMatch = sortedProximos.find(p => {
    if (!p.fecha_iso) return true;
    if (p.fecha_iso > ahora.toISOString().split('T')[0]) return true;
    if (p.fecha_iso === ahora.toISOString().split('T')[0] && p.hora) {
      const [hh, mm] = p.hora.split(':').map(Number);
      const matchTime = new Date(ahora);
      matchTime.setHours(hh, mm || 0, 0, 0);
      return ahora < matchTime;
    }
    return p.fecha_iso === ahora.toISOString().split('T')[0]; // hoy sin hora → mostrar
  }) || sortedProximos[0]; // fallback al primero si todos pasaron
  let heroHTML = '';
  if (heroMatch) {
    const esLocal = heroMatch.local.toLowerCase().includes('bustarviejo');
    const badge = diasHasta(heroMatch.fecha_iso);
    const badgeClass = badge === '¡HOY!' ? 'badge-hoy' : badge === 'MAÑANA' ? 'badge-manana' : 'badge-pronto';
    const campoLink = (!esLocal && heroMatch.campo)
      ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('campo de fútbol ' + heroMatch.campo)}" target="_blank" rel="noopener" class="hero-mapa-btn">📍 Cómo llegar</a>`
      : '';
    heroHTML = `
      <div class="hero-match">
        ${badge ? `<div class="hero-badge ${badgeClass}">${badge}</div>` : ''}
        <div class="hero-cat">${catCorta(heroMatch.categoria)} — Jornada ${heroMatch.jornada}</div>
        <div class="hero-teams">
          <div class="hero-team ${esLocal ? 'hero-us' : ''}">
            <div class="hero-team-icon">${esLocal ? '🏠' : '⚽'}</div>
            <div class="hero-team-name">${heroMatch.local}</div>
            ${esLocal ? '<div class="hero-tag">NOSOTROS</div>' : ''}
          </div>
          <div class="hero-vs">VS</div>
          <div class="hero-team ${!esLocal ? 'hero-us' : ''}">
            <div class="hero-team-icon">${!esLocal ? '🏠' : '⚽'}</div>
            <div class="hero-team-name">${heroMatch.visitante}</div>
            ${!esLocal ? '<div class="hero-tag">NOSOTROS</div>' : ''}
          </div>
        </div>
        <div class="hero-info">
          <span>📅 ${fechaBonita(heroMatch.fecha)}</span>
          ${heroMatch.hora ? `<span>🕐 ${heroMatch.hora}</span>` : ''}
          <span>${esLocal ? '🏠 Casa' : '✈️ Fuera'}</span>
        </div>

        ${campoLink}
        ${ultimoResHTML}
      </div>
      ${resumenHTML}`;
  }

  // ─── CARDS DE PARTIDOS (diseño ultra-claro para fácil lectura) ───
  // Agrupar partidos por fecha para mostrar cabecera de día
  let proximosHTML = '';
  if (sortedProximos.length > 0) {
    let lastDateGroup = '';
    for (const p of sortedProximos) {
      const esLocal = p.local.toLowerCase().includes('bustarviejo');
      const badge = diasHasta(p.fecha_iso);
      const rival = esLocal ? p.visitante : p.local;
      const rivalCorto = rival.replace(/^(C\.D\.|A\.D\.|U\.D\.|C\.F\.|RECREATIVO|ESCUELA FUT\.)\s*/i, '').trim();
      const lugar = esLocal ? 'EN CASA' : 'FUERA';
      const lugarIcon = esLocal ? '🏠' : '✈️';
      const dateGroup = p.fecha_iso || 'sin-fecha';
      
      // Cabecera de día
      if (dateGroup !== lastDateGroup) {
        const fechaLarga = fechaBonita(p.fecha);
        const esBadge = badge === '¡HOY!' || badge === 'MAÑANA';
        proximosHTML += `<div class="day-header">${esBadge ? `<span class="day-badge ${badge === '¡HOY!' ? 'day-badge-hoy' : 'day-badge-manana'}">${badge}</span>` : ''}<span class="day-date">${fechaLarga || 'Fecha por confirmar'}</span></div>`;
        lastDateGroup = dateGroup;
      }

      const campoLink = (!esLocal && p.campo)
        ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('campo de fútbol ' + p.campo)}" target="_blank" rel="noopener" class="match-mapa">📍 Cómo llegar a ${p.campo}</a>`
        : '';
      
      proximosHTML += `
        <div class="match-card-v2">
          <div class="match-cat-bar">${catCorta(p.categoria)}</div>
          <div class="match-main-info">
            <div class="match-time-block">
              ${p.hora ? `<div class="match-hora">${p.hora}</div>` : '<div class="match-hora-tbd">Hora por confirmar</div>'}
              <div class="match-lugar ${esLocal ? 'lugar-casa' : 'lugar-fuera'}">${lugarIcon} ${lugar}</div>
            </div>
            <div class="match-rival-block">
              <div class="match-vs-label">Bustarviejo vs</div>
              <div class="match-rival-name">${rivalCorto}</div>
              <div class="match-jornada">Jornada ${p.jornada}</div>
            </div>
          </div>
          ${campoLink}
        </div>`;
    }
  } else {
    proximosHTML = '<p class="sin-datos">No hay próximos partidos programados.</p>';
  }

  // ─── RESULTADOS RECIENTES (fusionados) ───
  // Mostrar solo los últimos 10 resultados (de cualquier equipo de la liga)
  const bustResults = allResults.slice(0, 10);
  let resultadosHTML = '';
  if (bustResults.length > 0) {
    for (const r of bustResults) {
      const esBustarviejo = r.local?.toLowerCase().includes('bustarviejo') || r.visitante?.toLowerCase().includes('bustarviejo');
      const esLocal = r.local?.toLowerCase().includes('bustarviejo');
      let resultado = 'empate';
      let resLabel = '';
      if (esBustarviejo) {
        const golesNuestros = esLocal ? r.goles_local : r.goles_visitante;
        const golesRival = esLocal ? r.goles_visitante : r.goles_local;
        resultado = golesNuestros > golesRival ? 'victoria' : golesNuestros < golesRival ? 'derrota' : 'empate';
        resLabel = resultado === 'victoria' ? '✅ Victoria' : resultado === 'derrota' ? '❌ Derrota' : '🤝 Empate';
      } else {
        resultado = r.goles_local > r.goles_visitante ? 'victoria' : r.goles_local < r.goles_visitante ? 'derrota' : 'empate';
        resLabel = `${r.goles_local} - ${r.goles_visitante}`;
      }
      resultadosHTML += `
        <div class="result-card result-${resultado}" data-cat="${r.categoria}">
          <div class="result-header">
            <span class="match-cat">${catCorta(r.categoria)} — J${r.jornada}</span>
            <span class="result-label result-label-${resultado}">${resLabel}</span>
          </div>
          <div class="result-teams">
            <div class="result-team ${esLocal ? 'team-us' : ''}">
              <span class="team-name">${r.local}</span>
            </div>
            <div class="result-score">
              <span class="score-num">${r.goles_local}</span>
              <span class="score-sep">-</span>
              <span class="score-num">${r.goles_visitante}</span>
            </div>
            <div class="result-team ${!esLocal ? 'team-us' : ''}">
              <span class="team-name">${r.visitante}</span>
            </div>
          </div>
          ${r.fecha ? `<div class="result-date">📅 ${fechaBonita(r.fecha)}</div>` : ''}
        </div>`;
    }
  } else {
    resultadosHTML = '<p class="sin-datos">No hay resultados recientes.</p>';
  }

  // ─── CLASIFICACIONES ───
  let clasifHTML = '';
  for (const cat in data.clasificaciones) {
    let filas = '';
    for (const eq of data.clasificaciones[cat]) {
      const esNuestro = eq.equipo.toLowerCase().includes('bustarviejo');
      const dg = eq.gf - eq.gc;
      filas += `<tr class="${esNuestro ? 'row-us' : ''}">
        <td class="td-pos">${eq.posicion}</td><td class="td-equipo">${eq.equipo}${esNuestro ? ' 🟠' : ''}</td>
        <td>${eq.pj}</td><td>${eq.pg}</td><td>${eq.pe}</td><td>${eq.pp}</td>
        <td>${eq.gf}</td><td>${eq.gc}</td><td>${dg >= 0 ? '+' : ''}${dg}</td>
        <td class="td-pts"><strong>${eq.puntos}</strong></td>
      </tr>`;
    }
    clasifHTML += `<div class="clasif-grupo" data-cat="${cat}">
      <h3>${cat}</h3>
      <div class="tabla-scroll"><table>
        <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
    </div>`;
  }

  // ─── GOLEADORES ───
  let golesHTML = '';
  let hayGoleadores = false;
  for (const cat in data.goleadores) {
    const jugadores = [...data.goleadores[cat]].sort((a, b) => b.goles - a.goles);
    if (jugadores.length === 0) continue;
    hayGoleadores = true;
    let filas = '';
    jugadores.forEach((j, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      filas += `<tr><td class="td-pos">${medal}</td><td class="td-equipo">${j.jugador}</td><td class="td-goles"><strong>${j.goles}</strong> ⚽</td></tr>`;
    });
    golesHTML += `<div class="clasif-grupo" data-cat="${cat}">
      <h3>${cat}</h3>
      <div class="tabla-scroll"><table>
        <thead><tr><th>#</th><th>Jugador</th><th>Goles</th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
    </div>`;
  }
  if (!hayGoleadores) golesHTML = '<p class="sin-datos">No hay goleadores registrados.</p>';

  // ─── CATEGORÍAS DISPONIBLES (para filtro) ───
  const allCats = new Set();
  (data.proximos_partidos || []).forEach(p => p.categoria && allCats.add(p.categoria));
  (data.resultados_recientes || []).forEach(r => r.categoria && allCats.add(r.categoria));
  Object.keys(data.clasificaciones || {}).forEach(c => allCats.add(c));
  Object.keys(data.goleadores || {}).forEach(c => allCats.add(c));
  const categorias = [...allCats].sort();

  // ─── OG META: próximo partido para preview ───
  let ogDescription = 'Próximos partidos, resultados, clasificaciones y goleadores del C.D. Bustarviejo';
  if (heroMatch) {
    const esL = heroMatch.local.toLowerCase().includes('bustarviejo');
    ogDescription = `⚽ ${heroMatch.local} vs ${heroMatch.visitante} — ${fechaBonita(heroMatch.fecha)}${heroMatch.hora ? ' a las ' + heroMatch.hora : ''} | ${catCorta(heroMatch.categoria)}`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Competición — C.D. Bustarviejo</title>
<link rel="icon" href="${ESCUDO}">
<meta property="og:title" content="Competición ${temporada} — C.D. Bustarviejo">
<meta property="og:description" content="${ogDescription}">
<meta property="og:image" content="${ESCUDO}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Competición ${temporada} — C.D. Bustarviejo">
<meta name="twitter:description" content="${ogDescription}">
<meta name="twitter:image" content="${ESCUDO}">
<meta name="description" content="${ogDescription}">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Montserrat', Arial, sans-serif; color: #1a1a2e; background: #fafafa; padding-top: 80px; }

/* ═══ HEADER ═══ */
.header { position: fixed; top: 0; left: 0; width: 100%; z-index: 1000; background: #fff; border-bottom: 1px solid #eaeaea; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.header-contenido { max-width: 1200px; margin: auto; padding: 14px 22px; display: flex; justify-content: space-between; align-items: center; }
.logo { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 1.1rem; text-decoration: none; color: #222; }
.logo img { width: 44px; }
.menu { display: flex; gap: 22px; align-items: center; }
.menu a { text-decoration: none; color: #222; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; }
.menu a:hover { color: #f57c00; }
.btn-menu { background: #f57c00; color: #000 !important; padding: 12px 20px; border-radius: 30px; font-weight: 800; font-size: 0.85rem; text-decoration: none; }
.menu-check { display: none; }
.menu-toggle { display: none; font-size: 2.2rem; cursor: pointer; min-width: 44px; min-height: 44px; line-height: 44px; text-align: center; user-select: none; }

/* ═══ HERO ═══ */
.hero-section { background: linear-gradient(135deg, #0a0f1d 0%, #111827 30%, #0f2847 60%, #0c1a33 100%); padding: 48px 20px 56px; text-align: center; position: relative; overflow: hidden; }
.hero-section::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 30% 40%, rgba(245,124,0,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 60%, rgba(245,124,0,0.05) 0%, transparent 40%); }
.hero-escudo { width: 60px; height: 60px; border-radius: 50%; border: 2px solid rgba(245,124,0,0.4); margin: 0 auto 16px; display: block; position: relative; }
.hero-title { color: #fff; font-size: 2.4rem; font-weight: 900; margin-bottom: 4px; position: relative; }
.hero-title span { color: #f57c00; }
.hero-sub { color: rgba(255,255,255,0.6); font-size: 1rem; margin-bottom: 32px; position: relative; }

.hero-match { background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)); border: 1px solid rgba(245,124,0,0.3); border-radius: 20px; padding: 28px 24px; max-width: 600px; margin: 0 auto; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
.hero-badge { display: inline-block; font-size: 0.75rem; font-weight: 900; letter-spacing: 1px; padding: 6px 18px; border-radius: 50px; margin-bottom: 12px; text-transform: uppercase; }
.badge-hoy { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; animation: pulse 1.5s infinite; box-shadow: 0 4px 15px rgba(239,68,68,0.4); }
.badge-manana { background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; box-shadow: 0 4px 15px rgba(245,158,11,0.3); }
.badge-pronto { background: rgba(245,124,0,0.2); color: #f5a623; border: 1px solid rgba(245,124,0,0.3); }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 10px rgba(239,68,68,0); } }

.hero-cat { color: #f5a623; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
.hero-teams { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 16px; }
.hero-team { text-align: center; flex: 1; }
.hero-team-icon { font-size: 2.2rem; margin-bottom: 6px; }
.hero-team-name { color: #e2e8f0; font-weight: 700; font-size: 0.95rem; line-height: 1.3; }
.hero-us .hero-team-name { color: #f57c00; }
.hero-tag { font-size: 0.65rem; color: #f5a623; font-weight: 800; text-transform: uppercase; margin-top: 4px; }
.hero-vs { color: #fff; font-weight: 900; font-size: 1.3rem; background: linear-gradient(135deg, #f57c00, #e65100); width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 20px rgba(245,124,0,0.4); letter-spacing: 1px; }
.hero-info { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; color: rgba(255,255,255,0.7); font-size: 0.85rem; margin-bottom: 12px; }
.hero-mapa-btn { display: inline-block; margin-top: 8px; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 50px; font-size: 0.85rem; font-weight: 700; transition: all 0.2s; }
.hero-mapa-btn:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37,99,235,0.3); }

/* ═══ HERO ÚLTIMO RESULTADO ═══ */
.hero-ultimo { margin-top: 18px; padding: 12px 20px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; }
.hero-ultimo-label { display: block; font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.hero-ultimo-res { color: #e2e8f0; font-size: 0.85rem; font-weight: 600; }
.hero-ultimo-res strong { color: #fff; font-weight: 900; font-size: 1rem; }

/* ═══ RESUMEN POSICIONES ═══ */
.resumen-grid { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 24px; position: relative; }
.resumen-card { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 18px; min-width: 110px; text-align: center; transition: transform 0.2s; }
.resumen-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.12); }
.resumen-pos { font-size: 1.6rem; font-weight: 900; color: #f57c00; line-height: 1; }
.resumen-cat { font-size: 0.7rem; font-weight: 700; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
.resumen-detail { font-size: 0.6rem; color: rgba(255,255,255,0.45); margin-top: 4px; }

/* ═══ WHATSAPP BUTTON ═══ */
.wa-btn { display: inline-flex; align-items: center; gap: 5px; background: #25d366; color: #fff !important; text-decoration: none; padding: 5px 14px; border-radius: 50px; font-weight: 700; font-size: 0.72rem; transition: all 0.2s; }
.wa-btn:hover { background: #1ebe5d; transform: translateY(-1px); }

/* ═══ ANIMATIONS ═══ */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.match-card, .result-card, .clasif-grupo { animation: fadeInUp 0.4s ease-out both; }
.match-card:nth-child(1), .result-card:nth-child(1) { animation-delay: 0.05s; }
.match-card:nth-child(2), .result-card:nth-child(2) { animation-delay: 0.1s; }
.match-card:nth-child(3), .result-card:nth-child(3) { animation-delay: 0.15s; }
.match-card:nth-child(4), .result-card:nth-child(4) { animation-delay: 0.2s; }
.match-card:nth-child(5), .result-card:nth-child(5) { animation-delay: 0.25s; }

/* ═══ TABS ═══ */
.tabs-bar { display: flex; justify-content: center; gap: 8px; background: #fff; padding: 16px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); flex-wrap: wrap; position: sticky; top: 80px; z-index: 50; }
.tab-label { padding: 10px 22px; border-radius: 50px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: #f1f5f9; color: #64748b; border: 2px solid transparent; text-transform: uppercase; letter-spacing: 0.3px; }
.tab-label:hover { background: #e2e8f0; }
input[name="tab"] { display: none; }
.seccion { display: none; }
#radio-proximos:checked ~ .contenido-comp #sec-proximos,
#radio-resultados:checked ~ .contenido-comp #sec-resultados,
#radio-clasificacion:checked ~ .contenido-comp #sec-clasificacion,
#radio-goleadores:checked ~ .contenido-comp #sec-goleadores { display: block; }
#radio-proximos:checked ~ .tabs-bar label[for="radio-proximos"],
#radio-resultados:checked ~ .tabs-bar label[for="radio-resultados"],
#radio-clasificacion:checked ~ .tabs-bar label[for="radio-clasificacion"],
#radio-goleadores:checked ~ .tabs-bar label[for="radio-goleadores"] { background: #0f172a; color: #fff; border-color: #0f172a; box-shadow: 0 4px 14px rgba(15,23,42,0.25); }

/* ═══ CONTENIDO ═══ */
.contenido-comp { max-width: 900px; margin: 0 auto; padding: 28px 16px 60px; }
.bloque { background: #fff; border-radius: 16px; padding: 32px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; }
.bloque h2 { font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #f57c00; display: flex; align-items: center; gap: 10px; }

/* ═══ DAY HEADERS ═══ */
.day-header { display: flex; align-items: center; gap: 12px; padding: 18px 0 8px; margin-top: 8px; }
.day-header:first-child { margin-top: 0; padding-top: 0; }
.day-date { font-size: 1.3rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
.day-badge { font-size: 0.85rem; font-weight: 900; padding: 6px 18px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; }
.day-badge-hoy { background: #ef4444; color: #fff; animation: pulse 1.5s infinite; }
.day-badge-manana { background: #f59e0b; color: #000; }

/* ═══ MATCH CARDS v2 (ultra-claro) ═══ */
.match-card-v2 { background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; margin-bottom: 16px; overflow: hidden; transition: box-shadow 0.2s; }
.match-card-v2:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.match-cat-bar { background: #0f172a; color: #f5a623; font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 10px 20px; text-align: center; }
.match-main-info { display: flex; align-items: stretch; }
.match-time-block { flex: 0 0 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 16px; background: #f8fafc; border-right: 2px solid #e2e8f0; }
.match-hora { font-size: 2.2rem; font-weight: 900; color: #0f172a; line-height: 1; }
.match-hora-tbd { font-size: 0.85rem; font-weight: 700; color: #94a3b8; text-align: center; line-height: 1.3; }
.match-lugar { font-size: 0.85rem; font-weight: 800; margin-top: 8px; padding: 4px 14px; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.5px; }
.lugar-casa { background: #dcfce7; color: #166534; }
.lugar-fuera { background: #dbeafe; color: #1e40af; }
.match-rival-block { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; justify-content: center; }
.match-vs-label { font-size: 0.85rem; color: #64748b; font-weight: 600; margin-bottom: 4px; }
.match-rival-name { font-size: 1.5rem; font-weight: 900; color: #0f172a; line-height: 1.2; }
.match-jornada { font-size: 0.8rem; color: #94a3b8; font-weight: 600; margin-top: 6px; }
.match-mapa { display: block; text-align: center; padding: 12px; background: #eff6ff; color: #2563eb; font-weight: 700; font-size: 0.9rem; text-decoration: none; border-top: 2px solid #e2e8f0; }
.match-mapa:hover { background: #dbeafe; }

/* ═══ RESULT CARDS ═══ */
.result-card { background: #fff; border-radius: 14px; margin-bottom: 12px; overflow: hidden; border: 1px solid #e2e8f0; transition: all 0.2s; }
.result-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
.result-victoria { border-left: 4px solid #16a34a; }
.result-derrota { border-left: 4px solid #ef4444; }
.result-empate { border-left: 4px solid #94a3b8; }
.result-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: #f8fafc; }
.result-label { font-size: 0.72rem; font-weight: 800; padding: 3px 12px; border-radius: 50px; }
.result-label-victoria { background: #dcfce7; color: #166534; }
.result-label-derrota { background: #fee2e2; color: #991b1b; }
.result-label-empate { background: #f1f5f9; color: #475569; }
.result-teams { display: flex; align-items: center; justify-content: center; padding: 14px 18px; gap: 16px; }
.result-team { flex: 1; }
.result-team:last-child { text-align: right; }
.result-score { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.score-num { font-size: 1.8rem; font-weight: 900; color: #0f172a; }
.score-sep { font-size: 1.2rem; color: #cbd5e1; font-weight: 300; }
.result-date { text-align: center; padding: 8px; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #f1f5f9; }

/* ═══ TABLAS ═══ */
.clasif-grupo { margin-bottom: 8px; }
.clasif-grupo h3 { font-size: 0.9rem; color: #0f172a; font-weight: 700; margin: 20px 0 10px; padding: 10px 16px; background: linear-gradient(90deg, #fff7ed, #fff); border-radius: 10px; border-left: 4px solid #f57c00; }
.tabla-scroll { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; }
table { width: 100%; border-collapse: collapse; min-width: 580px; font-size: 0.78rem; }
thead th { background: #0f172a; color: #e2e8f0; padding: 11px 8px; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; white-space: nowrap; text-align: center; }
thead th:nth-child(2) { text-align: left; }
tbody td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #475569; }
.td-pos { font-weight: 700; color: #0f172a; width: 36px; }
.td-equipo { text-align: left !important; white-space: nowrap; font-weight: 600; color: #334155; }
.td-pts { color: #0f172a; font-size: 0.85rem; }
.td-goles { color: #0f172a; font-size: 0.85rem; }
tbody tr:hover { background: #f8fafc; }
.row-us { background: #fff7ed !important; }
.row-us td { color: #ea580c !important; font-weight: 700; }
.row-us:hover { background: #ffedd5 !important; }

.sin-datos { text-align: center; color: #94a3b8; padding: 48px 20px; font-size: 1rem; }

/* ═══ FOOTER ═══ */
.footer { background: #0f172a; color: #e2e8f0; padding: 50px 20px 25px; }
.footer-contenido { max-width: 1200px; margin: auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 40px; }
.footer-logo { width: 70px; margin-bottom: 12px; }
.footer-titulo { font-weight: 800; margin-bottom: 12px; font-size: 1rem; }
.footer-texto { color: #94a3b8; font-size: 0.9rem; line-height: 1.8; }
.footer-texto a { color: #94a3b8; text-decoration: none; }
.footer-texto a:hover { color: #f57c00; }
.footer-links { list-style: none; }
.footer-links li { margin-bottom: 8px; }
.footer-links a { color: #94a3b8; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
.footer-links a:hover { color: #f57c00; }
.footer-copy { text-align: center; margin-top: 35px; font-size: 0.85rem; color: #64748b; border-top: 1px solid #1e293b; padding-top: 20px; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  body { padding-top: 90px; }
  .menu-toggle { display: block !important; }
  .header-contenido { flex-wrap: wrap; }
  .logo { order: 1; }
  .menu-toggle { order: 2; }
  .menu { order: 3; width: 100%; display: none !important; flex-direction: column; align-items: center; background: #fff; padding: 15px 0; margin-top: 10px; border-top: 1px solid #eaeaea; gap: 0; }
  .menu-check:checked ~ .menu { display: flex !important; }
  .menu a { font-size: 1.05rem; padding: 14px 0; width: 100%; text-align: center; border-bottom: 1px solid #f0f0f0; }
  .menu .btn-menu { margin-top: 10px; }
  .hero-title { font-size: 1.8rem; }
  .hero-teams { gap: 12px; }
  .hero-team-name { font-size: 0.85rem; }
  .hero-team-icon { font-size: 1.6rem; }
  .hero-vs { width: 42px; height: 42px; font-size: 1.2rem; }
  .tabs-bar { top: 90px; gap: 6px; padding: 12px 10px; }
  .tab-label { padding: 8px 14px; font-size: 0.7rem; }
  .resumen-grid { gap: 6px; }
  .resumen-card { min-width: 90px; padding: 10px 12px; }
  .resumen-pos { font-size: 1.3rem; }
  .hero-ultimo { padding: 10px 14px; }
  .hero-ultimo-res { font-size: 0.78rem; }
  .bloque { padding: 20px 16px; }
  .bloque h2 { font-size: 1.2rem; }
  .match-time-block { flex: 0 0 100px; padding: 16px 12px; }
  .match-hora { font-size: 1.8rem; }
  .match-rival-block { padding: 16px; }
  .match-rival-name { font-size: 1.25rem; }
  .match-lugar { font-size: 0.75rem; }
  .day-date { font-size: 1.1rem; }
  .result-teams { gap: 10px; }
  .score-num { font-size: 1.4rem; }
  table { font-size: 0.72rem; min-width: 520px; }
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
      <a class="btn-menu" style="background:#0f172a;color:#fff !important;">Competición</a>
      <a href="${WEB}area-interna.html">Área interna</a>
      <a class="btn-menu" href="https://alta-socio.vercel.app/alta-socio.html?ref=9TB4YE" target="_blank">Hazte socio</a>
    </nav>
  </div>
</header>

<section class="hero-section">
  <img src="${ESCUDO}" alt="C.D. Bustarviejo" class="hero-escudo">
  <h1 class="hero-title">Competición <span>${temporada}</span></h1>
  <p class="hero-sub">Próximos partidos, resultados, clasificaciones y goleadores</p>
  ${heroHTML}
</section>

<input type="radio" name="tab" id="radio-proximos" checked>
<input type="radio" name="tab" id="radio-resultados">
<input type="radio" name="tab" id="radio-clasificacion">
<input type="radio" name="tab" id="radio-goleadores">

<div class="tabs-bar">
  <label class="tab-label" for="radio-proximos">📅 Partidos</label>
  <label class="tab-label" for="radio-resultados">📊 Resultados</label>
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

  <div id="sec-resultados" class="seccion">
    <div class="bloque">
      <h2>📊 Últimos Resultados</h2>
      ${resultadosHTML}
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

<footer class="footer">
  <div class="footer-contenido">
    <div>
      <img src="${ESCUDO}" class="footer-logo" alt="Escudo">
      <p class="footer-titulo">C.D. Bustarviejo</p>
      <p class="footer-texto">Deporte y valores desde 1989</p>
    </div>
    <div>
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
    <div>
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