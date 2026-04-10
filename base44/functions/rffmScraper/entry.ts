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
  // Follow redirects manually to preserve cookies (RFFM sometimes redirects to login)
  let currentUrl = url;
  let maxRedirects = 5;
  let resp;
  while (maxRedirects-- > 0) {
    resp = await fetch(currentUrl, { 
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Cookie': cookies } 
    });
    const location = resp.headers.get('location');
    if (location && (resp.status === 301 || resp.status === 302 || resp.status === 303 || resp.status === 307)) {
      currentUrl = location.startsWith('http') ? location : `https://intranet.ffmadrid.es${location}`;
      // Merge any new cookies from redirect
      for (const c of (resp.headers.getSetCookie?.() || [])) {
        const pair = c.split(';')[0];
        cookies = cookies.replace(new RegExp(pair.split('=')[0] + '=[^;]*'), pair);
      }
      continue;
    }
    break;
  }
  // RFFM pages use ISO-8859-1 (Latin-1) encoding, not UTF-8
  // We must decode the raw bytes with the correct charset to preserve ñ, á, é, etc.
  const buf = await resp.arrayBuffer();
  const ct = resp.headers.get('content-type') || '';
  const charsetMatch = ct.match(/charset=([^\s;]+)/i);
  const charset = charsetMatch ? charsetMatch[1] : 'iso-8859-1';
  const html = new TextDecoder(charset).decode(buf);
  // Detect if we got the login page instead of data
  if (html.includes('Datos de Acceso') && html.includes('NLogin')) {
    console.log(`[RFFM] Got login page for URL: ${url.substring(0, 120)}`);
  }
  return html;
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
//   Tables from idx 3+, alternating: [campo-only table] [match-data table] [buttons table]
//   Match-data table has 8 tds:
//     td[0] = local team name (with escudo img)
//     td[1] = "SCORE  DATE  TIME" or just date/time if not played
//     td[2] = visitante team name (with escudo img)
//     td[3..7] = next campo info + padding (belongs to NEXT match visually)
//   After each match table there may be a buttons table containing:
//     - "Ver ficha del Partido" link: <a href="/nfg/NPcd/NFG_CmpPartido?...CodActa=XXX...">
function parseJornadaMatches(html) {
  const $ = load(html);
  const matches = [];
  const tables = $('table').toArray();
  
  let currentCampo = null;
  
  for (let i = 2; i < tables.length; i++) {
    const table = tables[i];
    const tableHtml = $(table).html() || '';
    const hasEscudo = tableHtml.includes('escudo_clb') || tableHtml.includes('pimg/Clubes');
    
    if (!hasEscudo) {
      const text = $(table).text().replace(/\s+/g, ' ').trim();
      const campoFull = text.match(/Campo:\s*(.+)/);
      if (campoFull) {
        let c = campoFull[1].trim();
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
    
    const localName = $(tds[0]).find('span').first().text().trim() || $(tds[0]).text().replace(/\s+/g, ' ').trim();
    const visitanteName = $(tds[2]).find('span').first().text().trim() || $(tds[2]).text().replace(/\s+/g, ' ').trim();
    
    if (!localName || !visitanteName) continue;
    
    const centerText = $(tds[1]).text().replace(/\s+/g, ' ').trim();
    
    let golesLocal = null, golesVisitante = null, jugado = false;
    let fecha = null, hora = null;
    
    const dateMatch = centerText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
    if (dateMatch) fecha = dateMatch[1].replace(/-/g, '/');
    
    const timeMatch = centerText.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) hora = timeMatch[1];
    
    let textWithoutDate = centerText;
    if (dateMatch) textWithoutDate = textWithoutDate.replace(dateMatch[0], '');
    if (timeMatch) textWithoutDate = textWithoutDate.replace(timeMatch[0], '');
    textWithoutDate = textWithoutDate.trim();
    
    const scoreMatch = textWithoutDate.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (scoreMatch) {
      golesLocal = parseInt(scoreMatch[1]);
      golesVisitante = parseInt(scoreMatch[2]);
      jugado = true;
    }
    
    let matchCampo = currentCampo;
    if (tds.length > 3) {
      const campoText = $(tds[3]).text().replace(/\s+/g, ' ').trim();
      const campoMatch = campoText.match(/Campo:\s*(.+?)(?:\s*-\s*Hierba|\s*-\s*Tierra|\s*-\s*Cesped|$)/i);
      if (campoMatch) {
        matchCampo = campoMatch[1].replace(/\s*\(HA\)\s*$/i, '').replace(/\s*\(H\.A\.\)\s*$/i, '').trim();
      } else {
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
      campo: matchCampo,
      acta_url: null, // will be filled in second pass
      _tableIdx: i    // track table index for ficha association
    });
  }
  
  // Second pass: find ficha links (NFG_CmpPartido) and associate with matches
  // The ficha button appears in non-match tables between match tables
  // Strategy: for each non-match table with a ficha link, assign it to the preceding match
  for (let i = 2; i < tables.length; i++) {
    const tableHtml = $(tables[i]).html() || '';
    if (tableHtml.includes('escudo_clb') || tableHtml.includes('pimg/Clubes')) continue;
    const fichaLink = $(tables[i]).find('a[href*="NFG_CmpPartido"]').first();
    if (!fichaLink.length) continue;
    const href = fichaLink.attr('href') || '';
    if (!href) continue;
    // Find the last match whose _tableIdx < i
    for (let m = matches.length - 1; m >= 0; m--) {
      if (matches[m]._tableIdx < i) {
        matches[m].acta_url = 'https://intranet.ffmadrid.es' + href;
        break;
      }
    }
  }
  
  // Clean up internal tracking field
  for (const m of matches) delete m._tableIdx;
  
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
// Structure varies by competition:
//   Standard (11 cols): [img] [equipo] [puntos] [pj] [pg] [pe] [pp] [gf] [gc] [últimos] [sanción]
//   With Pts/PJ (13 cols): [img] [pos#] [equipo] [pts/pj] [puntos] [pj] [pg] [pe] [pp] [gf] [gc] [últimos] [sanción]
function parseStandings(html) {
  const $ = load(html);
  const standings = [];
  
  const container = $('#CL_Resumen');
  const searchScope = container.length ? container : $('body');
  
  searchScope.find('table').each((_, table) => {
    const allText = $(table).text();
    if (!allText.includes('Puntos') || !allText.includes('J.')) return;
    
    const rows = $(table).find('tr').toArray();
    let posCounter = 0;
    
    for (const row of rows) {
      const cells = $(row).find('td').toArray();
      if (cells.length < 8) continue;
      
      const cellTexts = cells.map(c => {
        const clone = $(c).clone();
        clone.find('script, style').remove();
        return clone.text().replace(/\s+/g, ' ').trim();
      });
      
      // Strategy: Find 7 consecutive integer cells (puntos, pj, pg, pe, pp, gf, gc)
      // But also allow skipping a decimal cell (Pts/PJ like "2,7333") before them
      let numericStart = -1;
      
      for (let i = 0; i < cellTexts.length - 6; i++) {
        let allInt = true;
        for (let j = i; j <= i + 6; j++) {
          if (j >= cellTexts.length || !/^\d+$/.test(cellTexts[j])) { allInt = false; break; }
        }
        if (allInt) {
          numericStart = i;
          break;
        }
      }
      
      if (numericStart < 0) continue;
      
      // Now find the team name: search backwards from numericStart for a non-numeric, non-empty cell
      // Skip any decimal cells (Pts/PJ) and pure position number cells
      let teamIdx = -1;
      for (let i = numericStart - 1; i >= 0; i--) {
        const t = cellTexts[i];
        if (!t) continue;
        // Skip decimal values like "2,7333" (Pts/PJ column)
        if (/^\d+[.,]\d+$/.test(t)) continue;
        // Skip pure position numbers like "1", "2", etc.
        if (/^\d{1,2}$/.test(t)) continue;
        // This should be the team name
        teamIdx = i;
        break;
      }
      
      if (teamIdx < 0) continue;
      
      let teamName = cellTexts[teamIdx];
      // Remove JS artifacts
      for (const noise of ['eval(', 'ntype(', 'function(', 'var ', 'document.']) {
        const idx = teamName.indexOf(noise);
        if (idx > 0) teamName = teamName.substring(0, idx).trim();
      }
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
    
    if (standings.length > 0) return false;
  });
  
  return standings;
}

// Build the correct scorers URL: NFG_CMP_Goleadores (with underscores)
// Try both CamelCase and lowercase param variants (RFFM is inconsistent)
function buildScorersUrl(p, variant = 0) {
  if (variant === 1) {
    // Variant with CamelCase params (like jornada/results URLs use)
    return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&CodJornada=0&CodCompeticion=${p.CodCompeticion}&CodTemporada=${p.CodTemporada}&CodGrupo=${p.CodGrupo}&cod_agrupacion=1`;
  }
  if (variant === 2) {
    // Variant without CodJornada (some competitions don't use it)
    return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&codcompeticion=${p.CodCompeticion}&codtemporada=${p.CodTemporada}&codgrupo=${p.CodGrupo}&cod_agrupacion=1`;
  }
  // Default: lowercase params
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
    if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, url, jornada } = await req.json().catch(() => ({}));

    // Read-only actions allowed for all authenticated users; debug/write actions require admin
    const readOnlyActions = ['cross_table', 'standings', 'results', 'all_results', 'next_match', 'scorers', 'test'];
    if (!readOnlyActions.includes(action) && authUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

    let cookies = await rffmLogin();
    const p = extractParams(url);

    switch (action) {
      // Fetch a single jornada
      case 'results': {
        const j = jornada || p.CodJornada || '1';
        const html = await fetchPage(buildJornadaUrl(p, j), cookies);
        const matches = parseJornadaMatches(html);
        return Response.json({ success: true, jornada: parseInt(j), matches });
      }

      // Fetch ALL jornadas at once (sequentially with pauses to avoid rate limiting)
      case 'all_results': {
        const firstHtml = await fetchPage(buildJornadaUrl(p, 1), cookies);
        const totalJornadas = detectTotalJornadas(firstHtml);
        
        const allJornadas = [];
        const j1Matches = parseJornadaMatches(firstHtml);
        allJornadas.push({ jornada: 1, matches: j1Matches });
        
        // Fetch remaining jornadas in batches of 3 with pauses
        for (let batch = 2; batch <= totalJornadas; batch += 3) {
          const batchEnd = Math.min(batch + 2, totalJornadas);
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
          // Pause between batches
          if (batch + 3 <= totalJornadas) await new Promise(r => setTimeout(r, 1500));
        }
        
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
      // Sequential with pauses to avoid rate limiting
      case 'next_match': {
        const refJ = parseInt(jornada || p.CodJornada || '1');
        const j1Html = await fetchPage(buildJornadaUrl(p, refJ), cookies);
        const totalJ = detectTotalJornadas(j1Html);
        
        const candidates = [];
        
        // Scan in batches of 3 with pauses
        for (let batch = 1; batch <= totalJ; batch += 3) {
          const batchEnd = Math.min(batch + 2, totalJ);
          const promises = [];
          for (let j = batch; j <= batchEnd; j++) {
            promises.push(
              fetchPage(buildJornadaUrl(p, j), cookies)
                .then(html => {
                  const ms = parseJornadaMatches(html);
                  const bust = ms.find(m =>
                    !m.jugado &&
                    (m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO')) &&
                    !m.local?.toUpperCase().includes('DESCANSA') &&
                    !m.visitante?.toUpperCase().includes('DESCANSA')
                  );
                  if (bust) candidates.push({ jornada: j, match: bust });
                })
                .catch(() => {})
            );
          }
          await Promise.all(promises);
          if (batch + 3 <= totalJ) await new Promise(r => setTimeout(r, 1000));
        }
        
        if (candidates.length === 0) {
          return Response.json({ success: true, match: null, message: 'No upcoming matches found' });
        }
        
        // Sort candidates by date (earliest first), then by jornada
        candidates.sort((a, b) => {
          const dateA = a.match.fecha ? a.match.fecha.split('/').reverse().join('') : '99999999';
          const dateB = b.match.fecha ? b.match.fecha.split('/').reverse().join('') : '99999999';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return a.jornada - b.jornada;
        });
        
        const best = candidates[0];
        return Response.json({ success: true, jornada: best.jornada, match: best.match });
      }

      // Fetch classification/standings (with automatic retry if too few teams)
      case 'standings': {
        let standings = [];
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
            console.log(`[STANDINGS RETRY] attempt ${attempt + 1}/3 (got ${standings.length})`);
            await new Promise(r => setTimeout(r, 2000 + attempt * 1500));
          }
          // First try without jornada
          let html = await fetchPage(buildClassificationUrl(p), cookies);
          standings = parseStandings(html);
          
          // If empty, the page needs a CodJornada param - detect from jornada page
          if (standings.length === 0) {
            const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
            const totalJ = detectTotalJornadas(j1Html);
            for (let tryJ = totalJ; tryJ >= 1 && standings.length === 0; tryJ--) {
              html = await fetchPage(buildClassificationUrl(p, tryJ), cookies);
              standings = parseStandings(html);
            }
          }
          if (standings.length >= 5) break; // Got enough data
        }
        return Response.json({ success: true, standings, retried: standings.length < 5 });
      }

      // Fetch scorers - SEQUENTIAL with pauses to avoid rate limiting
      // 1. Load the page to get the real competition codes from the dropdown
      // 2. Submit the form with the correct codcompeticion + codgrupo
      case 'scorers': {
        let scorers = [];
        console.log(`[SCORERS] Starting with params: Comp=${p.CodCompeticion}, Grupo=${p.CodGrupo}, Temp=${p.CodTemporada}`);
        
        // Helper: fetch with session check
        async function scorerFetch(url) {
          let html = await fetchPage(url, cookies);
          if (html.includes('Datos de Acceso') && html.includes('NLogin')) {
            console.log(`[SCORERS] Session expired, re-logging in...`);
            cookies = await rffmLogin();
            await new Promise(r => setTimeout(r, 2000));
            html = await fetchPage(url, cookies);
          }
          return html;
        }
        
        // Step 1: Load goleadores landing page
        const landingUrl = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&cod_agrupacion=1`;
        const landingHtml = await scorerFetch(landingUrl);
        
        const $land = load(landingHtml);
        const competitionOptions = [];
        $land('select[name="codcompeticion"] option').each((_, opt) => {
          const val = $land(opt).attr('value');
          const txt = $land(opt).text().trim();
          if (val && val !== '0') competitionOptions.push({ value: val, text: txt });
        });
        console.log(`[SCORERS] Found ${competitionOptions.length} competition options`);
        
        const codTemporada = $land('select[name="codtemporada"] option[selected]').attr('value') || p.CodTemporada;
        
        // Sort: put likely matches first
        const priorityKeywords = ['SEGUNDA', 'PREFERENTE', 'PRIMERA', 'CADETE', 'JUVENIL', 'INFANTIL', 'ALEVIN', 'BENJAMIN', 'PREBENJAMIN', 'FEMENIN'];
        const sortedCompetitions = [...competitionOptions].sort((a, b) => {
          const aHit = priorityKeywords.findIndex(k => a.text.toUpperCase().includes(k));
          const bHit = priorityKeywords.findIndex(k => b.text.toUpperCase().includes(k));
          if (aHit >= 0 && bHit < 0) return -1;
          if (bHit >= 0 && aHit < 0) return 1;
          if (aHit >= 0 && bHit >= 0) return aHit - bHit;
          return 0;
        });
        
        for (let ci = 0; ci < sortedCompetitions.length; ci++) {
          const comp = sortedCompetitions[ci];
          if (scorers.length >= 3) break;
          
          // Pause between competition fetches
          if (ci > 0) await new Promise(r => setTimeout(r, 1500));
          
          const groupUrl = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&codcompeticion=${comp.value}&codtemporada=${codTemporada}&cod_agrupacion=1`;
          const groupHtml = await scorerFetch(groupUrl);
          const $g = load(groupHtml);
          
          const directScorers = parseScorers(groupHtml);
          if (directScorers.length > 0) {
            const hasBustar = directScorers.some(s => /bustarviejo/i.test(s.equipo || ''));
            if (hasBustar) {
              console.log(`[SCORERS] Found ${directScorers.length} scorers (with Bustarviejo) in comp "${comp.text}"`);
              scorers = directScorers;
              break;
            }
          }
          
          const groupOptions = [];
          $g('select[name="codgrupo"] option').each((_, opt) => {
            const val = $g(opt).attr('value');
            if (val && val !== '0') groupOptions.push(val);
          });
          
          // Try each group SEQUENTIALLY with pauses
          for (let gi = 0; gi < groupOptions.length; gi++) {
            const grp = groupOptions[gi];
            if (scorers.length >= 3) break;
            
            if (gi > 0) await new Promise(r => setTimeout(r, 1000));
            
            const fullUrl = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&codcompeticion=${comp.value}&codgrupo=${grp}&codtemporada=${codTemporada}&cod_agrupacion=1`;
            const fullHtml = await scorerFetch(fullUrl);
            const grpScorers = parseScorers(fullHtml);
            
            if (grpScorers.length > 0) {
              const hasBustar = grpScorers.some(s => /bustarviejo/i.test(s.equipo || ''));
              if (hasBustar) {
                console.log(`[SCORERS] Found ${grpScorers.length} scorers in comp "${comp.text}" group ${grp}`);
                scorers = grpScorers;
                break;
              }
            }
          }
        }
        
        console.log(`[SCORERS] Final result: ${scorers.length} scorers`);
        return Response.json({ success: true, scorers, total: scorers.length, retried: scorers.length < 3 });
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
        // Use CamelCase variant which returns data (81KB)
        const scorersUrl = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&CodJornada=0&CodCompeticion=${p.CodCompeticion}&CodTemporada=${p.CodTemporada}&CodGrupo=${p.CodGrupo}&cod_agrupacion=1`;
        const html = await fetchPage(scorersUrl, cookies);
        const $s = load(html);
        
        const frames = $s('frame, iframe').map((_, f) => ({ name: $s(f).attr('name') || '', src: ($s(f).attr('src') || '').substring(0, 300) })).get();
        
        // Find forms with their actions
        const forms = $s('form').map((_, f) => ({
          action: ($s(f).attr('action') || '').substring(0, 200),
          method: $s(f).attr('method') || 'GET',
          id: $s(f).attr('id') || '',
          name: $s(f).attr('name') || '',
        })).get();
        
        // Find select dropdowns with their options
        const selects = $s('select').map((_, sel) => ({
          name: $s(sel).attr('name') || $s(sel).attr('id') || '',
          options: $s(sel).find('option').map((__, opt) => ({
            value: ($s(opt).attr('value') || '').substring(0, 50),
            text: $s(opt).text().trim().substring(0, 80),
            selected: $s(opt).attr('selected') !== undefined,
          })).get().slice(0, 20),
        })).get();
        
        // Find any AJAX/onclick handlers that might load data
        const onclicks = [];
        $s('[onclick]').each((_, el) => {
          onclicks.push($s(el).attr('onclick').substring(0, 200));
        });
        
        // Find script content that might reveal API endpoints
        const scriptSnippets = [];
        $s('script').each((_, sc) => {
          const txt = $s(sc).text();
          if (txt.includes('Goleador') || txt.includes('goleador') || txt.includes('ajax') || txt.includes('fetch') || txt.includes('submit')) {
            scriptSnippets.push(txt.substring(0, 500));
          }
        });
        
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
          success: true, scorersUrl, htmlLength: html.length, frames, forms, selects,
          onclicks: onclicks.slice(0, 10), scriptSnippets: scriptSnippets.slice(0, 5),
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

      // Debug jornada HTML structure - show raw HTML for specific tables
      case 'debug_jornada': {
        const j = jornada || '1';
        const html = await fetchPage(buildJornadaUrl(p, j), cookies);
        const $j = load(html);
        const tables = $j('table').toArray();
        const tableInfos = [];
        // Show tables 2-5 with full HTML to diagnose first match detection
        for (let i = 2; i < Math.min(tables.length, 7); i++) {
          const table = tables[i];
          const tableHtml = $j(table).html() || '';
          const hasEscudo = tableHtml.includes('escudo_clb') || tableHtml.includes('pimg/Clubes');
          const hasImg = tableHtml.includes('<img');
          const tds = $j(table).find('td').toArray();
          const tdTexts = tds.map(td => $j(td).text().replace(/\s+/g, ' ').trim().substring(0, 200));
          tableInfos.push({ idx: i, hasEscudo, hasImg, tdCount: tds.length, tds: tdTexts, rawHtml: tableHtml.substring(0, 1200) });
        }
        return Response.json({ success: true, totalTables: tables.length, tables: tableInfos });
      }

      // Debug acta/ficha links - dump raw HTML per match table to see ficha buttons
      case 'debug_actas': {
        const ja = jornada || '19';
        const htmlA = await fetchPage(buildJornadaUrl(p, ja), cookies);
        const $da = load(htmlA);
        const tables = $da('table').toArray();
        // For each match table (with escudo), show the ficha link if present
        const matchDetails = [];
        for (let i = 2; i < tables.length && matchDetails.length < 8; i++) {
          const table = tables[i];
          const tableHtml = $da(table).html() || '';
          const hasEscudo = tableHtml.includes('escudo_clb') || tableHtml.includes('pimg/Clubes');
          if (!hasEscudo) continue;
          const tds = $da(table).find('td').toArray();
          if (tds.length < 3) continue;
          const localName = $da(tds[0]).find('span').first().text().trim();
          const visitanteName = $da(tds[2]).find('span').first().text().trim();
          // Look for ficha link: <a> with NFG_CmpPartido href
          const fichaLinks = [];
          $da(table).find('a[href*="NFG_CmpPartido"]').each((_, a) => {
            fichaLinks.push($da(a).attr('href'));
          });
          // Also check next sibling tables for the ficha button area
          let nextTable = $da(table).next('table');
          for (let k = 0; k < 3 && nextTable.length; k++) {
            const nh = nextTable.html() || '';
            if (nh.includes('NFG_CmpPartido')) {
              nextTable.find('a[href*="NFG_CmpPartido"]').each((_, a) => {
                fichaLinks.push($da(a).attr('href'));
              });
            }
            if (nh.includes('escudo_clb') || nh.includes('pimg/Clubes')) break;
            nextTable = nextTable.next('table');
          }
          matchDetails.push({ local: localName, visitante: visitanteName, fichaLinks });
        }
        return Response.json({ success: true, jornada: ja, matchDetails });
      }

      // Fetch cross table (tabla cruzada)
      case 'cross_table': {
        // Try multiple URL patterns - RFFM is inconsistent
        const urlVariants = [
          `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisTablaCruzada?cod_primaria=${p.cod_primaria}&codcompeticion=${p.CodCompeticion}&codgrupo=${p.CodGrupo}&codtemporada=${p.CodTemporada}`,
          `https://intranet.ffmadrid.es/nfg/NPcd/NFG_TablaCruzada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}`,
          `https://intranet.ffmadrid.es/nfg/NPcd/NFG_TablaCruzada?cod_primaria=${p.cod_primaria}&codcompeticion=${p.CodCompeticion}&codgrupo=${p.CodGrupo}&codtemporada=${p.CodTemporada}&cod_agrupacion=1`,
        ];
        
        let html = '';
        let usedUrl = '';
        for (const tryUrl of urlVariants) {
          console.log(`[CROSS_TABLE] Trying: ${tryUrl}`);
          html = await fetchPage(tryUrl, cookies);
          if (html.length > 500 && !html.includes('Datos de Acceso')) {
            usedUrl = tryUrl;
            break;
          }
          if (html.includes('Datos de Acceso') || html.length < 100) {
            console.log('[CROSS_TABLE] Session expired, re-logging...');
            cookies = await rffmLogin();
            await new Promise(r => setTimeout(r, 1500));
          }
        }
        
        if (!html || html.length < 500) {
          return Response.json({ success: false, error: 'Could not load cross table page' });
        }
        
        // Parse the JS inline arrays that contain all the data
        // Structure:
        //   equipos[j++] = ID;
        //   result[i] = new Array(4);
        //   result[i][0] = 'ID_LOCAL';
        //   result[i][1] = 'ID_VISITANTE';
        //   result[i][2] = '<b>3 - 2</b>';  // or date for unplayed
        //   result[i][3] = '1';  // flag
        
        // 1) Extract team IDs and names
        const $ct = load(html);
        const teamNames = {};
        const htmlStr = html;
        
        // Team names are generated by document.write (JS) so not in static HTML.
        // Strategy: fetch jornada pages, parse matches to get team names,
        // then match team IDs by cross-referencing the result data.
        // For each result, we know local_id vs visitante_id and the score.
        // In jornada pages, we know local team name, visitante team name, and score.
        // By matching scores, we can identify which ID = which name.
        
        // First, extract all equipos IDs
        const equiposOrderTemp = [];
        const eqPatternTemp = /equipos\[j\+\+\]\s*=\s*(\d+)/g;
        let eqM;
        while ((eqM = eqPatternTemp.exec(htmlStr)) !== null) {
          equiposOrderTemp.push(eqM[1]);
        }
        
        // Fetch jornada 1 to get team names from parsed matches
        const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
        const j1Matches = parseJornadaMatches(j1Html);
        
        // Build a lookup of results from the cross table JS for jornada reference
        // Parse temporary results first (before team names are resolved)
        const tempResults = [];
        let tempJsBlock = '';
        $ct('script:not([src])').each((_, s) => {
          const content = $ct(s).html() || '';
          if (content.includes('result[i]') && content.includes('equipos[')) {
            tempJsBlock = content;
            return false;
          }
        });
        if (tempJsBlock) {
          const blocks = tempJsBlock.split('i++;');
          for (const block of blocks) {
            if (!block.includes("result[i][0]")) continue;
            const lines = block.split('\n');
            let lid = null, vid = null, scoreH = '';
            let isR = false;
            for (const line of lines) {
              const tr = line.trim();
              if (tr.startsWith('result_excel')) continue;
              const f0 = tr.match(/^result\[i\]\[0\]\s*=\s*'([^']*)'/);
              if (f0) { lid = f0[1]; isR = true; }
              const f1 = tr.match(/^result\[i\]\[1\]\s*=\s*'([^']*)'/);
              if (f1) vid = f1[1];
              const f2s = tr.match(/^result\[i\]\[2\]\s*=\s*'([^']*)'/);
              if (f2s) scoreH = f2s[1];
              const f2a = tr.match(/^result\[i\]\[2\]\s*\+=\s*'([^']*)'/);
              if (f2a) scoreH += f2a[1];
            }
            if (isR && lid && vid) {
              const sc = scoreH.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
              const sm = sc.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
              tempResults.push({
                local_id: lid, visitante_id: vid,
                gl: sm ? parseInt(sm[1]) : null,
                gv: sm ? parseInt(sm[2]) : null,
              });
            }
          }
        }
        
        // Now match: for each jornada match, find the corresponding cross-table result
        // and map ID→team name. Mark used results to avoid duplicate mapping.
        const usedResults = new Set();
        
        // Helper: try to match jornada matches against cross-table results
        function matchJornadaResults(jMatches) {
          for (const jm of jMatches) {
            if (!jm.jugado || jm.goles_local == null || jm.goles_visitante == null) continue;
            const localName = jm.local;
            const visitName = jm.visitante;
            const gl = jm.goles_local;
            const gv = jm.goles_visitante;
            
            // Find matching result in cross table data (same score, unused)
            for (let ri = 0; ri < tempResults.length; ri++) {
              if (usedResults.has(ri)) continue;
              const r = tempResults[ri];
              if (r.gl !== gl || r.gv !== gv) continue;
              
              // Check if the IDs are already mapped to different names
              const existingLocal = teamNames[r.local_id];
              const existingVisit = teamNames[r.visitante_id];
              
              // If both already mapped, skip
              if (existingLocal && existingVisit) { usedResults.add(ri); continue; }
              
              // If one is mapped, verify consistency
              if (existingLocal && existingLocal !== localName) continue;
              if (existingVisit && existingVisit !== visitName) continue;
              
              // Map the names
              if (!existingLocal) teamNames[r.local_id] = localName;
              if (!existingVisit) teamNames[r.visitante_id] = visitName;
              usedResults.add(ri);
              break;
            }
          }
        }
        
        matchJornadaResults(j1Matches);
        
        // If still missing some, try more jornadas
        if (Object.keys(teamNames).length < equiposOrderTemp.length) {
          const totalJ = detectTotalJornadas(j1Html);
          for (let jn = 2; jn <= Math.min(totalJ, 8); jn++) {
            if (Object.keys(teamNames).length >= equiposOrderTemp.length) break;
            await new Promise(r => setTimeout(r, 800));
            const jnHtml = await fetchPage(buildJornadaUrl(p, jn), cookies);
            const jnMatches = parseJornadaMatches(jnHtml);
            matchJornadaResults(jnMatches);
          }
        }
        
        console.log(`[CROSS_TABLE] Extracted ${Object.keys(teamNames).length}/${equiposOrderTemp.length} team names from jornada pages`);
        
        // Also extract equipos[] array to get ordered list
        const equiposOrder = [];
        const equiposPattern = /equipos\[j\+\+\]\s*=\s*(\d+)/g;
        let eqMatch;
        while ((eqMatch = equiposPattern.exec(htmlStr)) !== null) {
          equiposOrder.push(eqMatch[1]);
        }
        
        // 2) Extract result arrays
        // The JS uses a counter variable i that increments after each block:
        //   result[i] = new Array(4);
        //   result[i][0]='LOCAL_ID';
        //   result[i][1]='VISITANTE_ID';
        //   result[i][2]='<b>3 - 2</b>';
        //   result[i][2]+='';
        //   result[i][3]='1';
        //   result_excel[i] = ...  (duplicate for excel)
        //   i++;
        // We split by 'i++;' to get each result block, then parse fields
        
        const results = [];
        
        // Find the main script block with result data
        let jsBlock = '';
        $ct('script:not([src])').each((_, s) => {
          const content = $ct(s).html() || '';
          if (content.includes('result[i]') && content.includes('equipos[')) {
            jsBlock = content;
            return false;
          }
        });
        
        if (jsBlock) {
          // Split into blocks by 'i++;'
          const blocks = jsBlock.split('i++;');
          let resultIdx = 0;
          
          for (const block of blocks) {
            // Only process blocks that have result[i][0] (skip excel duplicates and other code)
            if (!block.includes("result[i][0]")) continue;
            // Skip blocks that only have result_excel (not result)
            // We want the first result[i][0] assignment that is NOT inside result_excel
            const lines = block.split('\n');
            
            let localId = null;
            let visitanteId = null;
            let scoreHtml = '';
            let isResultBlock = false;
            
            for (const line of lines) {
              const trimmed = line.trim();
              // Skip result_excel lines
              if (trimmed.startsWith('result_excel')) continue;
              
              // result[i][0]='300137';
              const f0 = trimmed.match(/^result\[i\]\[0\]\s*=\s*'([^']*)'/);
              if (f0) { localId = f0[1]; isResultBlock = true; }
              
              // result[i][1]='12324027';
              const f1 = trimmed.match(/^result\[i\]\[1\]\s*=\s*'([^']*)'/);
              if (f1) visitanteId = f1[1];
              
              // result[i][2]='<b>3 - 2</b>';  or  result[i][2]+='...'
              const f2set = trimmed.match(/^result\[i\]\[2\]\s*=\s*'([^']*)'/);
              if (f2set) scoreHtml = f2set[1];
              
              const f2append = trimmed.match(/^result\[i\]\[2\]\s*\+=\s*'([^']*)'/);
              if (f2append) scoreHtml += f2append[1];
            }
            
            if (!isResultBlock || !localId || !visitanteId) continue;
            
            // Parse score
            const scoreClean = scoreHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
            const scoreM = scoreClean.match(/(\d+)\s*[-–]\s*(\d+)/);
            
            results.push({
              index: resultIdx++,
              local_id: localId,
              visitante_id: visitanteId,
              local: teamNames[localId] || `Equipo ${localId}`,
              visitante: teamNames[visitanteId] || `Equipo ${visitanteId}`,
              goles_local: scoreM ? parseInt(scoreM[1]) : null,
              goles_visitante: scoreM ? parseInt(scoreM[2]) : null,
              jugado: !!scoreM,
              score_raw: scoreClean || null,
            });
          }
        }
        
        // Results are already in order
        
        // Build the cross table matrix
        const teams = equiposOrder.map(id => ({
          id,
          name: teamNames[id] || `Equipo ${id}`,
        }));
        
        // Create matrix: matrix[localIdx][visitanteIdx] = { goles_local, goles_visitante, jugado }
        const matrix = {};
        for (const r of results) {
          const localIdx = equiposOrder.indexOf(r.local_id);
          const visitanteIdx = equiposOrder.indexOf(r.visitante_id);
          if (localIdx >= 0 && visitanteIdx >= 0) {
            if (!matrix[localIdx]) matrix[localIdx] = {};
            matrix[localIdx][visitanteIdx] = {
              goles_local: r.goles_local,
              goles_visitante: r.goles_visitante,
              jugado: r.jugado,
              score_raw: r.score_raw,
            };
          }
        }
        
        console.log(`[CROSS_TABLE] Parsed ${teams.length} teams, ${results.length} results`);
        
        // (debug block removed)
        
        return Response.json({
          success: true,
          teams,
          results,
          matrix,
          team_count: teams.length,
          result_count: results.length,
        });  
      }

      default:
        return Response.json({ error: 'Supported actions: test, results, all_results, next_match, standings, scorers, cross_table, debug_standings, debug_actas' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});