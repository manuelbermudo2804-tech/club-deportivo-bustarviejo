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

function buildClassificationUrl(p) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}`;
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
    
    // Try to extract score
    const scoreMatch = centerText.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (scoreMatch) {
      golesLocal = parseInt(scoreMatch[1]);
      golesVisitante = parseInt(scoreMatch[2]);
      jugado = true;
    }
    
    // Extract date (dd-mm-yyyy or dd/mm/yyyy)
    const dateMatch = centerText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
    if (dateMatch) fecha = dateMatch[1].replace(/-/g, '/');
    
    // Extract time (HH:MM)
    const timeMatch = centerText.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) hora = timeMatch[1];
    
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
        const html = await fetchPage(buildClassificationUrl(p), cookies);
        const standings = parseStandings(html);
        return Response.json({ success: true, standings });
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
        return Response.json({ error: 'Actions: test, results, all_results, next_match, standings' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});