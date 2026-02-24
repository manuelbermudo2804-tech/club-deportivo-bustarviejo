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
      // Full text example: "Campo: BUITRAGO (HA) - Hierba Artificial"
      // We want: "BUITRAGO" (city/facility name, without surface type)
      const text = $(table).text().replace(/\s+/g, ' ').trim();
      const campoFull = text.match(/Campo:\s*(.+)/);
      if (campoFull) {
        let c = campoFull[1].trim();
        // Remove surface type suffixes: "(HA) - Hierba Artificial", "- Tierra", etc.
        c = c.replace(/\s*\(H\.?A\.?\)\s*-\s*.*/i, '').trim();
        c = c.replace(/\s*-\s*Hierba\s*.*/i, '').trim();
        c = c.replace(/\s*-\s*Tierra\s*.*/i, '').trim();
        c = c.replace(/\s*-\s*Cesped\s*.*/i, '').trim();
        if (c) currentCampo = c;
      }
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
    
    // Campo: The REAL campo for THIS match is in tds[3] of the match table itself.
    // The preceding campo-only table is just a visual header/duplicate.
    // Extract campo from tds[3], keeping the full name (city + facility).
    let matchCampo = currentCampo; // fallback to preceding campo table
    if (tds.length > 3) {
      const campoText = $(tds[3]).text().replace(/\s+/g, ' ').trim();
      const campoMatch = campoText.match(/Campo:\s*(.+?)(?:\s*-\s*Hierba|\s*-\s*Tierra|\s*-\s*Cesped|$)/i);
      if (campoMatch) {
        matchCampo = campoMatch[1].replace(/\s*\(HA\)\s*$/i, '').replace(/\s*\(H\.A\.\)\s*$/i, '').trim();
      } else {
        // Fallback: just take everything after "Campo:"
        const simpleCampo = campoText.match(/Campo:\s*(.+)/);
        if (simpleCampo) matchCampo = simpleCampo[1].trim();
      }
    }
    
    matches.push({
      local: localName,
      visitante: visitanteName,
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      jugado,
      fecha,
      hora,
      campo: matchCampo
    });
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
// Structure: Inside #CL_Resumen div, second table has the classification
// Header row has: (icon col) | Ordenar por: | Puntos | J. | G. | E. | P. | F. | C. | (últimos) | (sanción)
// Data rows: (pos icon) | Team name (with JS noise) | pts | pj | pg | pe | pp | gf | gc | ... 
function parseStandings(html) {
  const $ = load(html);
  const standings = [];
  
  // Strategy: find the table inside #CL_Resumen that has "Puntos" and "J." headers
  const container = $('#CL_Resumen');
  const searchScope = container.length ? container : $('body');
  
  searchScope.find('table').each((_, table) => {
    // Check if this table has classification headers
    const allText = $(table).text();
    if (!allText.includes('Puntos') || !allText.includes('J.')) return;
    
    const rows = $(table).find('tr').toArray();
    // Skip header rows - find first data row (has a number in position column)
    let posCounter = 0;
    
    for (const row of rows) {
      const cells = $(row).find('td').toArray();
      if (cells.length < 8) continue;
      
      // The first cell might be an icon/position indicator
      // The second cell should be team name
      // Try to find a pattern: look for a cell with just a number (position)
      // or a cell with team name followed by numeric cells
      
      // Get clean text from each cell (direct text only, not nested script content)
      const cellTexts = cells.map(c => {
        // Remove script tags and their content before extracting text
        const clone = $(c).clone();
        clone.find('script, style').remove();
        return clone.text().replace(/\s+/g, ' ').trim();
      });
      
      // Find the team name cell - it's the one with the longest text that isn't a number
      // Typical pattern: cell[0] = empty/pos, cell[1] = team name, cell[2+] = numbers
      
      // Try to extract: check if we can find sequential numeric values for pts, pj, pg, pe, pp, gf, gc
      let teamIdx = -1;
      let numericStart = -1;
      
      for (let i = 0; i < cellTexts.length - 6; i++) {
        // Check if cells i through i+6 are all numeric
        let allNumeric = true;
        for (let j = i; j <= i + 6; j++) {
          if (j >= cellTexts.length || !/^\d+$/.test(cellTexts[j])) { allNumeric = false; break; }
        }
        if (allNumeric) {
          numericStart = i;
          teamIdx = i - 1;
          break;
        }
      }
      
      if (teamIdx < 0 || numericStart < 0) continue;
      
      // Clean team name
      let teamName = cellTexts[teamIdx];
      // Remove JS artifacts (eval, ntype, etc.)
      for (const noise of ['eval(', 'ntype(', 'function(', 'var ', 'document.']) {
        const idx = teamName.indexOf(noise);
        if (idx > 0) teamName = teamName.substring(0, idx).trim();
      }
      // Remove trailing special chars
      teamName = teamName.replace(/[#\-\s]+$/, '').trim();
      
      if (!teamName || teamName.length < 2) continue;
      
      posCounter++;
      const nums = cellTexts.slice(numericStart, numericStart + 7).map(n => parseInt(n) || 0);
      
      standings.push({
        posicion: posCounter,
        equipo: teamName,
        puntos: nums[0],
        pj: nums[1],
        pg: nums[2],
        pe: nums[3],
        pp: nums[4],
        gf: nums[5],
        gc: nums[6]
      });
    }
    
    // If we found standings in this table, stop looking
    if (standings.length > 0) return false;
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

      // Debug standings page structure
      case 'debug_standings': {
        const tryJ = jornada || '16';
        const html = await fetchPage(buildClassificationUrl(p, tryJ), cookies);
        const $d = load(html);
        
        const container = $d('#CL_Resumen');
        const scope = container.length ? container : $d('body');
        const debugRows = [];
        
        scope.find('table').each((tIdx, table) => {
          const allText = $d(table).text();
          if (!allText.includes('Puntos') || !allText.includes('J.')) return;
          
          $d(table).find('tr').each((rIdx, tr) => {
            const cells = $d(tr).find('td').toArray();
            const cellData = cells.map((c, cIdx) => {
              const clone = $d(c).clone();
              clone.find('script, style').remove();
              const text = clone.text().replace(/\s+/g, ' ').trim().substring(0, 120);
              const hasImg = $d(c).find('img').length > 0;
              return { i: cIdx, t: text, img: hasImg };
            });
            debugRows.push({ r: rIdx, n: cells.length, cells: cellData });
          });
          return false;
        });
        
        return Response.json({ success: true, totalRows: debugRows.length, rows: debugRows.slice(0, 6) });
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

      // Debug jornada HTML structure to see campo mapping
      case 'debug_jornada': {
        const j = jornada || '1';
        const html = await fetchPage(buildJornadaUrl(p, j), cookies);
        const $j = load(html);
        const tables = $j('table').toArray();
        const tableInfos = [];
        for (let i = 3; i < Math.min(tables.length, 25); i++) {
          const table = tables[i];
          const tableHtml = $j(table).html() || '';
          const hasEscudo = tableHtml.includes('escudo_clb') || tableHtml.includes('pimg/Clubes');
          const tds = $j(table).find('td').toArray();
          const tdTexts = tds.map(td => $j(td).text().replace(/\s+/g, ' ').trim().substring(0, 120));
          tableInfos.push({ idx: i, hasEscudo, tdCount: tds.length, tds: tdTexts });
        }
        return Response.json({ success: true, tablesFrom3: tableInfos });
      }

      default:
        return Response.json({ error: 'Actions: test, results, all_results, next_match, standings, scorers, debug_standings' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});