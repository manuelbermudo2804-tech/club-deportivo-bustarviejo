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

// Build URLs for the RFFM intranet
function buildJornadaUrl(p, jornada) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}&CodJornada=${jornada}&cod_agrupacion=1&Sch_Tipo_Juego=`;
}

function buildClassificationUrl(p) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}`;
}

// Parse match data from NFG_CmpJornada page
// Structure: tables from index 3 onwards, every 2 tables = 1 match
// Table pattern: [campo info] then [local team | score | visitante team | date/time | field name]
function parseJornadaMatches(html) {
  const $ = load(html);
  const matches = [];
  const tables = $('table').toArray();
  
  // Skip first 3 tables (filter/form area), then process match tables
  for (let i = 3; i < tables.length; i++) {
    const table = tables[i];
    const rows = $(table).find('tr').toArray();
    
    for (const row of rows) {
      const cells = $(row).find('td').toArray();
      if (cells.length < 2) continue;
      
      // Get text from each cell
      const cellTexts = cells.map(c => $(c).text().replace(/\s+/g, ' ').trim());
      const cellHtmls = cells.map(c => $(c).html() || '');
      
      // Look for team name pattern: text with "C.D.", "C.F.", etc. or escudo image
      // and score pattern like "N -" or "- N" in h4 tags
      
      // Check if any cell has an escudo image (team indicator)
      const hasEscudo = cellHtmls.some(h => h.includes('escudo_clb') || h.includes('pimg/Clubes'));
      if (!hasEscudo) continue;
      
      // Extract team names from cells with escudo images
      const teamCells = [];
      cells.forEach((c, idx) => {
        if ($(c).html()?.includes('escudo_clb') || $(c).html()?.includes('pimg/Clubes')) {
          // Team name is in a span or direct text
          let teamName = $(c).find('span').first().text().trim();
          if (!teamName) teamName = cellTexts[idx].replace(/^\s*\d+\s*$/, '').trim();
          if (teamName) teamCells.push({ idx, name: teamName });
        }
      });
      
      // Extract score from h4 tags
      let golesLocal = null, golesVisitante = null, jugado = false;
      const h4s = $(row).find('h4');
      if (h4s.length > 0) {
        const scoreText = h4s.map((_, h) => $(h).text().trim()).get().join(' ');
        const scoreMatch = scoreText.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (scoreMatch) {
          golesLocal = parseInt(scoreMatch[1]);
          golesVisitante = parseInt(scoreMatch[2]);
          jugado = true;
        }
      }
      
      // Extract date, time, field from surrounding cells or text
      let fecha = null, hora = null, campo = null;
      const allText = cellTexts.join(' ');
      const dateM = allText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateM) fecha = dateM[1];
      const timeM = allText.match(/(\d{1,2}:\d{2})\s*h/);
      if (timeM) hora = timeM[1];
      
      // Also check previous table row / sibling for "Campo:" info
      const prevTable = i > 3 ? tables[i - 1] : null;
      if (prevTable) {
        const prevText = $(prevTable).text().replace(/\s+/g, ' ').trim();
        const campoM = prevText.match(/Campo:\s*(.+?)(?:\(|$)/);
        if (campoM) campo = campoM[1].trim();
        if (!fecha) {
          const pd = prevText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
          if (pd) fecha = pd[1];
        }
        if (!hora) {
          const pt = prevText.match(/(\d{1,2}:\d{2})\s*h/);
          if (pt) hora = pt[1];
        }
      }
      
      if (teamCells.length >= 2) {
        matches.push({
          local: teamCells[0].name,
          visitante: teamCells[1].name,
          goles_local: golesLocal,
          goles_visitante: golesVisitante,
          jugado,
          fecha,
          hora,
          campo
        });
      }
    }
  }
  
  // Deduplicate
  const seen = new Set();
  return matches.filter(m => {
    const key = `${m.local}__${m.visitante}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Alternative: parse based on the pattern we found in test results
// Each match block has: campo row, then team row with escudo + name + score
function parseJornadaMatchesV2(html) {
  const $ = load(html);
  const matches = [];
  
  // Find all escudo images and work outward to find match context
  const escudoEls = $('img.escudo_clb, img[src*="pimg/Clubes"]').toArray();
  
  // Group escudos in pairs (local, visitante)
  for (let i = 0; i < escudoEls.length - 1; i += 2) {
    const localEl = escudoEls[i];
    const visitanteEl = escudoEls[i + 1];
    
    // Get team names from the parent td/div
    const localTd = $(localEl).closest('td');
    const visitanteTd = $(visitanteEl).closest('td');
    
    let localName = localTd.find('span').first().text().trim() || localTd.text().replace(/\s+/g, ' ').trim();
    let visitanteName = visitanteTd.find('span').first().text().trim() || visitanteTd.text().replace(/\s+/g, ' ').trim();
    
    // Clean up names (remove extra whitespace, numbers)
    localName = localName.replace(/^\d+\s*/, '').replace(/\s+/g, ' ').trim();
    visitanteName = visitanteName.replace(/^\d+\s*/, '').replace(/\s+/g, ' ').trim();
    
    if (!localName || !visitanteName) continue;
    
    // Find the score - should be in h4 between the two teams
    const matchRow = $(localEl).closest('tr');
    let golesLocal = null, golesVisitante = null, jugado = false;
    
    const h4s = matchRow.find('h4');
    const allH4Text = h4s.map((_, h) => $(h).text().trim()).get().join(' ');
    const scoreMatch = allH4Text.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (scoreMatch) {
      golesLocal = parseInt(scoreMatch[1]);
      golesVisitante = parseInt(scoreMatch[2]);
      jugado = true;
    }
    
    // Find date, time, campo from surrounding context
    const matchTable = $(localEl).closest('table');
    const prevTable = matchTable.prev('table');
    const contextText = (prevTable.text() + ' ' + matchTable.text()).replace(/\s+/g, ' ');
    
    let fecha = null, hora = null, campo = null;
    const dateM = contextText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateM) fecha = dateM[1];
    const timeM = contextText.match(/(\d{1,2}:\d{2})\s*h/);
    if (timeM) hora = timeM[1];
    const campoM = contextText.match(/Campo:\s*(.+?)(?:\(|Fecha|$)/);
    if (campoM) campo = campoM[1].trim();
    
    matches.push({ local: localName, visitante: visitanteName, goles_local: golesLocal, goles_visitante: golesVisitante, jugado, fecha, hora, campo });
  }
  
  return matches;
}

// Parse standings from NFG_VisClasificacion page
function parseStandings(html) {
  const $ = load(html);
  const standings = [];
  
  $('table').each((_, table) => {
    const headerText = $(table).find('th').map((_, el) => $(el).text().trim().toLowerCase()).get().join(' ');
    if (headerText.includes('equipo') || headerText.includes('pts') || headerText.includes('ptos') || headerText.includes('pj')) {
      $(table).find('tr').each((__, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 8) {
          const t = cells.map((_, td) => $(td).text().trim()).get();
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
      case 'test': {
        const j = jornada || p.CodJornada || '1';
        const jornadaUrl = buildJornadaUrl(p, j);
        const html = await fetchPage(jornadaUrl, cookies);
        
        const matchesV1 = parseJornadaMatches(html);
        const matchesV2 = parseJornadaMatchesV2(html);
        
        return Response.json({ 
          success: true,
          htmlLength: html.length,
          jornada: j,
          matchesV1,
          matchesV2,
          matchCount: Math.max(matchesV1.length, matchesV2.length)
        });
      }

      case 'results': {
        const j = jornada || p.CodJornada;
        const jornadaUrl = buildJornadaUrl(p, j);
        const html = await fetchPage(jornadaUrl, cookies);
        // Try V2 first (escudo-based), fall back to V1
        let matches = parseJornadaMatchesV2(html);
        if (matches.length === 0) matches = parseJornadaMatches(html);
        return Response.json({ success: true, matches, jornada: j });
      }

      case 'next_match': {
        const j = jornada || p.CodJornada || '1';
        const jornadaUrl = buildJornadaUrl(p, j);
        const html = await fetchPage(jornadaUrl, cookies);
        let allMatches = parseJornadaMatchesV2(html);
        if (allMatches.length === 0) allMatches = parseJornadaMatches(html);
        const bust = allMatches.find(m =>
          m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO')
        );
        return Response.json({ success: true, jornada: j, all_matches: allMatches, bustarviejo_match: bust || null });
      }

      case 'standings': {
        const classUrl = buildClassificationUrl(p);
        const html = await fetchPage(classUrl, cookies);
        const standings = parseStandings(html);
        return Response.json({ success: true, standings });
      }

      default:
        return Response.json({ error: 'Use: test, results, next_match, standings' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});