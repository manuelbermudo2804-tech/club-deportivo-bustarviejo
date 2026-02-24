import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

async function rffmLogin() {
  const rffmUser = Deno.env.get('RFFM_USER');
  const rffmPass = Deno.env.get('RFFM_PASSWORD');
  if (!rffmUser || !rffmPass) throw new Error('RFFM credentials not configured');

  const baseResp = await fetch('https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion', {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const cookieMap = {};
  const addCookies = (resp) => {
    for (const c of (resp.headers.getSetCookie?.() || [])) {
      const name = c.split(';')[0].split('=')[0].trim();
      cookieMap[name] = c.split(';')[0];
    }
  };
  addCookies(baseResp);
  
  const loginUrl = baseResp.headers.get('location') || 'https://intranet.ffmadrid.es/nfg/NLogin';
  const fullLoginUrl = loginUrl.startsWith('http') ? loginUrl : `https://intranet.ffmadrid.es${loginUrl}`;
  
  const loginPageResp = await fetch(fullLoginUrl, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; ') }
  });
  addCookies(loginPageResp);
  
  const loginHtml = await loginPageResp.text();
  const $ = load(loginHtml);
  let formAction = $('form').attr('action') || '/nfg/NLogin';
  if (!formAction.startsWith('http')) formAction = `https://intranet.ffmadrid.es${formAction}`;
  
  const hiddenFields = {};
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    if (name) hiddenFields[name] = $(el).attr('value') || '';
  });
  const userField = $('input[type="text"]').attr('name') || 'NUser';
  const passField = $('input[type="password"]').attr('name') || 'NPass';

  const loginResp = await fetch(formAction, {
    method: 'POST', redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; '), 'Referer': fullLoginUrl
    },
    body: new URLSearchParams({ ...hiddenFields, [userField]: rffmUser, [passField]: rffmPass }).toString()
  });
  addCookies(loginResp);
  
  let redirectUrl = loginResp.headers.get('location');
  let maxR = 5;
  while (redirectUrl && maxR-- > 0) {
    const full = redirectUrl.startsWith('http') ? redirectUrl : `https://intranet.ffmadrid.es${redirectUrl}`;
    const r = await fetch(full, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; ') } });
    addCookies(r);
    redirectUrl = r.headers.get('location');
  }
  return Object.values(cookieMap).join('; ');
}

async function fetchPage(url, cookies) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies } });
  return await resp.text();
}

function buildJornadaUrl(p, jornada) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}&CodJornada=${jornada}&cod_agrupacion=1&Sch_Tipo_Juego=`;
}

function buildClassificationUrl(p, jornada) {
  // The intranet uses LOWERCASE params for classification: codcompeticion, codgrupo, codtemporada, codjornada
  let url = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=${p.cod_primaria}&codcompeticion=${p.CodCompeticion}&codgrupo=${p.CodGrupo}&codtemporada=${p.CodTemporada}`;
  if (jornada) url += `&codjornada=${jornada}`;
  return url;
}

// Parse matches from NFG_CmpJornada page.
// Structure discovered:
//   Tables from idx 3+, alternating: [campo-only table] [match-data table]
//   Match-data table has 8 tds:
//     td[0] = local team name (with escudo img)
//     td[1] = "SCORE  DATE  TIME" or just date/time if not played
//     td[2] = visitante team name (with escudo img)
//     td[3..7] = next campo info + padding (belongs to NEXT match visually)
function parseJornadaMatches(html) {
  const $ = load(html);
  const matches = [];
  const tables = $('table').toArray();
  
  // First pass: find the "campo" info from campo-only tables (no escudo, has "Campo:")
  // Second pass: extract matches from escudo tables
  
  let currentCampo = null;
  
  for (let i = 3; i < tables.length; i++) {
    const table = tables[i];
    const tableHtml = $(table).html() || '';
    const hasEscudo = tableHtml.includes('escudo_clb') || tableHtml.includes('pimg/Clubes');
    
    if (!hasEscudo) {
      // Campo-only table: extract campo name for the NEXT match
      const text = $(table).text().replace(/\s+/g, ' ').trim();
      const campoM = text.match(/Campo:\s*(.+?)(?:\s*\(|$)/);
      if (campoM) currentCampo = campoM[1].trim();
      continue;
    }
    
    // Match data table with escudos
    const tds = $(table).find('td').toArray();
    if (tds.length < 3) continue;
    
    // td[0] = local, td[1] = score/date, td[2] = visitante
    const localName = $(tds[0]).find('span').first().text().trim() || $(tds[0]).text().replace(/\s+/g, ' ').trim();
    const visitanteName = $(tds[2]).find('span').first().text().trim() || $(tds[2]).text().replace(/\s+/g, ' ').trim();
    
    if (!localName || !visitanteName) continue;
    
    // td[1] contains score + date + time all together, e.g. "1 - 2 22-02-2026 10:00"
    // or just "22-02-2026 10:00" if not yet played, or could be "Aplazado"
    const centerText = $(tds[1]).text().replace(/\s+/g, ' ').trim();
    
    let golesLocal = null, golesVisitante = null, jugado = false;
    let fecha = null, hora = null;
    
    // IMPORTANT: Extract date FIRST to avoid confusing "25/04/2026" as score "25-4"
    // Date formats: dd-mm-yyyy, dd/mm/yyyy, dd-mm-yy, dd/mm/yy
    const dateMatch = centerText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
    if (dateMatch) fecha = dateMatch[1].replace(/-/g, '/');
    
    // Extract time (HH:MM)
    const timeMatch = centerText.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) hora = timeMatch[1];
    
    // Remove the date and time from the text before looking for scores
    let textWithoutDate = centerText;
    if (dateMatch) textWithoutDate = textWithoutDate.replace(dateMatch[0], '');
    if (timeMatch) textWithoutDate = textWithoutDate.replace(timeMatch[0], '');
    textWithoutDate = textWithoutDate.trim();
    
    // Now try to extract score from remaining text (e.g. "1 - 2")
    const scoreMatch = textWithoutDate.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (scoreMatch) {
      golesLocal = parseInt(scoreMatch[1]);
      golesVisitante = parseInt(scoreMatch[2]);
      jugado = true;
    }
    
    // Also check if next td has campo for the NEXT match
    // td[3] onwards may have next match's campo
    let nextCampo = null;
    if (tds.length > 3) {
      const nextCampoText = $(tds[3]).text().replace(/\s+/g, ' ').trim();
      const ncM = nextCampoText.match(/Campo:\s*(.+?)(?:\s*\(|$)/);
      if (ncM) nextCampo = ncM[1].trim();
    }
    
    matches.push({
      local: localName,
      visitante: visitanteName,
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      jugado,
      fecha,
      hora,
      campo: currentCampo
    });
    
    // The campo embedded in tds[3+] is for the NEXT match
    if (nextCampo) currentCampo = nextCampo;
  }
  
  return matches;
}

// Detect total number of jornadas from the page's select dropdown
function detectTotalJornadas(html) {
  const $ = load(html);
  let maxJornada = 0;
  
  // Look for jornada selector options
  $('select option').each((_, opt) => {
    const text = $(opt).text().trim();
    const val = $(opt).attr('value');
    // Jornada options usually have numeric values
    const num = parseInt(val);
    if (!isNaN(num) && num > 0 && num < 100) {
      if (num > maxJornada) maxJornada = num;
    }
  });
  
  // Fallback: search for "Jornada N" patterns
  if (maxJornada === 0) {
    const jornadaMatches = html.match(/Jornada\s+(\d+)/gi) || [];
    for (const jm of jornadaMatches) {
      const n = parseInt(jm.match(/(\d+)/)[1]);
      if (n > maxJornada) maxJornada = n;
    }
  }
  
  return maxJornada || 30; // Default to 30 if can't detect
}

// Parse standings from NFG_VisClasificacion page
function parseStandings(html) {
  const $ = load(html);
  const standings = [];
  
  $('table').each((_, table) => {
    const headerText = $(table).find('th').map((__, el) => $(el).text().trim().toLowerCase()).get().join(' ');
    if (headerText.includes('equipo') || headerText.includes('pts') || headerText.includes('ptos') || headerText.includes('pj')) {
      $(table).find('tr').each((__, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 8) {
          const t = cells.map((___, td) => $(td).text().trim()).get();
          const pos = parseInt(t[0]);
          if (!isNaN(pos) && pos > 0 && pos < 50) {
            standings.push({
              posicion: pos, equipo: t[1], puntos: parseInt(t[2]) || 0,
              pj: parseInt(t[3]) || 0, pg: parseInt(t[4]) || 0, pe: parseInt(t[5]) || 0,
              pp: parseInt(t[6]) || 0, gf: parseInt(t[7]) || 0, gc: parseInt(t[8]) || 0
            });
          }
        }
      });
    }
  });
  return standings;
}

// Build the correct scorers URL: NFG_CMP_Goleadores (with underscores)
function buildScorersUrl(p) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&CodJornada=0&codcompeticion=${p.CodCompeticion}&codtemporada=${p.CodTemporada}&codgrupo=${p.CodGrupo}&cod_agrupacion=1`;
}

// Parse scorers from NFG_CMP_Goleadores page
// Table structure: Jugador | Equipo | Grupo | Partidos Jugados | Goles | Goles partido
function parseScorers(html) {
  const $ = load(html);
  const scorers = [];
  
  // Find the table with "Jugador" header (table idx 4 based on debug)
  $('table').each((_, table) => {
    const firstRowText = $(table).find('tr').first().find('td, th').map((__, c) => $(c).text().trim().toLowerCase()).get().join(' ');
    if (!firstRowText.includes('jugador')) return;
    
    let isHeader = true;
    $(table).find('tr').each((__, row) => {
      if (isHeader) { isHeader = false; return; } // Skip header row
      
      const cells = $(row).find('td');
      if (cells.length < 5) return;
      
      const t = cells.map((___, td) => $(td).text().trim()).get();
      const jugador = t[0];
      const equipo = t[1];
      const grupo = t[2];
      const pj = parseInt(t[3]) || 0;
      const goles = parseInt(t[4]) || 0;
      const golesPorPartido = parseFloat(t[5]) || 0;
      
      if (jugador && goles > 0) {
        scorers.push({ jugador, equipo, grupo, partidos_jugados: pj, goles, goles_partido: golesPorPartido });
      }
    });
  });
  
  return scorers;
}

function extractParams(url) {
  const u = new URL(url);
  return {
    cod_primaria: u.searchParams.get('cod_primaria') || '1000128',
    CodCompeticion: u.searchParams.get('CodCompeticion') || u.searchParams.get('codcompeticion'),
    CodGrupo: u.searchParams.get('CodGrupo') || u.searchParams.get('codgrupo'),
    CodTemporada: u.searchParams.get('CodTemporada') || u.searchParams.get('codtemporada'),
    CodJornada: u.searchParams.get('CodJornada') || u.searchParams.get('codjornada'),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (authUser?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { action, url, jornada } = await req.json().catch(() => ({}));
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

    const cookies = await rffmLogin();
    const p = extractParams(url);

    switch (action) {
      // Fetch a single jornada
      case 'results': {
        const j = jornada || p.CodJornada || '1';
        const html = await fetchPage(buildJornadaUrl(p, j), cookies);
        const matches = parseJornadaMatches(html);
        return Response.json({ success: true, jornada: parseInt(j), matches });
      }

      // Fetch ALL jornadas at once
      case 'all_results': {
        // First, load jornada 1 to detect total jornadas
        const firstHtml = await fetchPage(buildJornadaUrl(p, 1), cookies);
        const totalJornadas = detectTotalJornadas(firstHtml);
        
        const allJornadas = [];
        
        // Parse jornada 1 which we already fetched
        const j1Matches = parseJornadaMatches(firstHtml);
        allJornadas.push({ jornada: 1, matches: j1Matches });
        
        // Fetch remaining jornadas in batches of 5 to avoid overloading
        for (let batch = 2; batch <= totalJornadas; batch += 5) {
          const batchEnd = Math.min(batch + 4, totalJornadas);
          const promises = [];
          for (let j = batch; j <= batchEnd; j++) {
            promises.push(
              fetchPage(buildJornadaUrl(p, j), cookies)
                .then(html => ({ jornada: j, matches: parseJornadaMatches(html) }))
                .catch(() => ({ jornada: j, matches: [], error: true }))
            );
          }
          const results = await Promise.all(promises);
          allJornadas.push(...results);
        }
        
        // Sort by jornada number
        allJornadas.sort((a, b) => a.jornada - b.jornada);
        
        // Extract Bustarviejo matches specifically
        const bustarviejo = [];
        for (const j of allJornadas) {
          const bm = j.matches.find(m =>
            m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO')
          );
          if (bm) bustarviejo.push({ jornada: j.jornada, ...bm });
        }
        
        return Response.json({
          success: true,
          total_jornadas: totalJornadas,
          jornadas: allJornadas,
          bustarviejo_matches: bustarviejo,
          summary: {
            total_matches: allJornadas.reduce((s, j) => s + j.matches.length, 0),
            played: allJornadas.reduce((s, j) => s + j.matches.filter(m => m.jugado).length, 0),
            pending: allJornadas.reduce((s, j) => s + j.matches.filter(m => !m.jugado).length, 0),
          }
        });
      }

      // Find next unplayed match for Bustarviejo
      case 'next_match': {
        const startJ = parseInt(jornada || p.CodJornada || '1');
        // Search from the given jornada forward
        for (let j = startJ; j <= startJ + 10; j++) {
          const html = await fetchPage(buildJornadaUrl(p, j), cookies);
          const matches = parseJornadaMatches(html);
          const bust = matches.find(m =>
            !m.jugado && (m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO'))
          );
          if (bust) return Response.json({ success: true, jornada: j, match: bust });
        }
        return Response.json({ success: true, match: null, message: 'No upcoming matches found' });
      }

      // Fetch classification/standings
      case 'standings': {
        // First try without jornada
        let html = await fetchPage(buildClassificationUrl(p), cookies);
        let standings = parseStandings(html);
        
        // If empty, the page needs a CodJornada param - detect from jornada page
        if (standings.length === 0) {
          // Get total jornadas from jornada 1 page
          const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
          const totalJ = detectTotalJornadas(j1Html);
          
          // Try from the latest jornada backwards to find one with standings
          for (let tryJ = totalJ; tryJ >= 1 && standings.length === 0; tryJ--) {
            html = await fetchPage(buildClassificationUrl(p, tryJ), cookies);
            standings = parseStandings(html);
          }
        }
        
        return Response.json({ success: true, standings });
      }

      // Fetch scorers
      case 'scorers': {
        const html = await fetchPage(buildScorersUrl(p), cookies);
        const scorers = parseScorers(html);
        return Response.json({ success: true, scorers, total: scorers.length });
      }

      // Debug standings page structure - dump tables from the big page
      case 'debug_standings': {
        const tryJ = jornada || '13';
        const html = await fetchPage(buildClassificationUrl(p, tryJ), cookies);
        const $d = load(html);
        
        // Dump ALL tables with their content
        const tables = [];
        $d('table').each((i, table) => {
          const rows = [];
          $d(table).find('tr').each((_, tr) => {
            const cells = $d(tr).find('th, td').map((__, c) => $d(c).text().replace(/\s+/g, ' ').trim().substring(0, 60)).get();
            if (cells.some(c => c.length > 0)) rows.push(cells);
          });
          if (rows.length > 0) tables.push({ idx: i, rowCount: rows.length, colCount: rows[0]?.length || 0, rows: rows.slice(0, 8) });
        });
        
        // Also look for div-based tables or specific class names
        const divIds = [];
        $d('div[id]').each((_, d) => {
          const id = $d(d).attr('id') || '';
          if (id.toLowerCase().includes('clasif') || id.toLowerCase().includes('resumen') || id.toLowerCase().includes('detalle') || id.toLowerCase().includes('tabla')) {
            const text = $d(d).text().replace(/\s+/g, ' ').trim().substring(0, 200);
            divIds.push({ id, textSnippet: text });
          }
        });
        
        return Response.json({ 
          success: true, htmlLen: html.length, 
          tablesCount: tables.length, tables: tables.slice(0, 15),
          relevantDivs: divIds.slice(0, 10),
          noData: html.includes('No hay clasificaci')
        });
      }

      // Debug scorers page structure
      case 'debug_scorers': {
        // Correct URL from navigation: NFG_CMP_Goleadores (not NFG_CmpGoleadores)
        const scorersUrl = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&CodJornada=${p.CodJornada || '15'}&codcompeticion=${p.CodCompeticion}&codtemporada=${p.CodTemporada}&codgrupo=${p.CodGrupo}&cod_agrupacion=1`;
        const html = await fetchPage(scorersUrl, cookies);
        const $s = load(html);
        
        const frames = $s('frame, iframe').map((_, f) => ({ name: $s(f).attr('name') || '', src: ($s(f).attr('src') || '').substring(0, 300) })).get();
        
        const tables = [];
        $s('table').each((i, table) => {
          const rows = [];
          $s(table).find('tr').each((_, tr) => {
            const cells = $s(tr).find('th, td').map((__, c) => $s(c).text().replace(/\s+/g, ' ').trim().substring(0, 100)).get();
            if (cells.some(c => c.length > 0)) rows.push(cells);
          });
          if (rows.length > 0) tables.push({ idx: i, rowCount: rows.length, rows: rows.slice(0, 15) });
        });
        
        return Response.json({ 
          success: true, scorersUrl, htmlLength: html.length, frames, 
          tablesCount: tables.length, tables: tables.slice(0, 8),
        });
      }

      // Test/debug a single jornada
      case 'test': {
        const j = jornada || p.CodJornada || '1';
        const html = await fetchPage(buildJornadaUrl(p, j), cookies);
        const matches = parseJornadaMatches(html);
        const totalJornadas = detectTotalJornadas(html);
        return Response.json({ success: true, jornada: parseInt(j), totalJornadas, matches, matchCount: matches.length });
      }

      default:
        return Response.json({ error: 'Actions: test, results, all_results, next_match, standings, scorers, debug_standings' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});