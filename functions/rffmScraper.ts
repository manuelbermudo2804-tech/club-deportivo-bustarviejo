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

function parseParams(url) {
  const u = new URL(url);
  return {
    cod_primaria: u.searchParams.get('cod_primaria'),
    CodCompeticion: u.searchParams.get('CodCompeticion'),
    CodGrupo: u.searchParams.get('CodGrupo'),
    CodTemporada: u.searchParams.get('CodTemporada'),
    CodJornada: u.searchParams.get('CodJornada'),
  };
}

function buildUrl(base, p, extra = {}) {
  const params = new URLSearchParams({ cod_primaria: p.cod_primaria, CodCompeticion: p.CodCompeticion, CodGrupo: p.CodGrupo, CodTemporada: p.CodTemporada, ...extra });
  return `https://intranet.ffmadrid.es/nfg/NPcd/${base}?${params.toString()}`;
}

// ---- PARSERS ----

function parseStandings(html) {
  const $ = load(html);
  const standings = [];
  // Find table with classification headers (Equipo, Pts, PJ, etc.)
  $('table').each((_, table) => {
    const headerText = $(table).find('th, thead td').map((_, el) => $(el).text().trim().toLowerCase()).get().join(' ');
    if (headerText.includes('equipo') || headerText.includes('pts') || headerText.includes('ptos')) {
      $(table).find('tbody tr, tr').each((__, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 8) {
          const t = cells.map((_, td) => $(td).text().trim()).get();
          const pos = parseInt(t[0]);
          if (!isNaN(pos) && pos > 0 && pos < 30) {
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

function parseMatchesFromJornada(html) {
  const $ = load(html);
  const matches = [];
  
  // Each match typically in a table with local team, score/time, visitor team
  // Try multiple strategies
  
  // Strategy 1: Look for tables with match-like structure (3+ cells, team - score - team)
  $('table').each((_, table) => {
    $(table).find('tr').each((__, row) => {
      const cells = $(row).find('td');
      const texts = cells.map((_, td) => $(td).text().trim()).get();
      const fullRow = texts.join('|');
      
      // Match pattern: team name | score like "2 - 1" or time like "12:00" | team name
      for (let i = 0; i < texts.length; i++) {
        // Score pattern
        const scoreMatch = texts[i].match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (scoreMatch && i > 0 && i < texts.length - 1) {
          const local = texts[i - 1];
          const visitante = texts[i + 1];
          if (local.length > 2 && visitante.length > 2) {
            matches.push({
              local, visitante,
              goles_local: parseInt(scoreMatch[1]),
              goles_visitante: parseInt(scoreMatch[2]),
              jugado: true
            });
          }
        }
        
        // Time pattern (upcoming match)
        const timeMatch = texts[i].match(/^(\d{1,2}:\d{2})$/);
        if (timeMatch && i > 0 && i < texts.length - 1) {
          const local = texts[i - 1];
          const visitante = texts[i + 1];
          if (local.length > 2 && visitante.length > 2) {
            matches.push({ local, visitante, hora: timeMatch[1], jugado: false });
          }
        }
      }
      
      // Check for date in the row
      const dateMatch = fullRow.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateMatch && matches.length > 0) {
        matches[matches.length - 1].fecha = dateMatch[1];
      }
    });
  });
  
  // Strategy 2: If no matches found, try more aggressive text parsing
  if (matches.length === 0) {
    const bodyText = $('body').text();
    // Look for "EQUIPO A  2 - 1  EQUIPO B" patterns
    const re = /([A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ\.\s\-']{2,40}?)\s+(\d+)\s*[-–]\s*(\d+)\s+([A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ\.\s\-']{2,40})/g;
    let m;
    while ((m = re.exec(bodyText)) !== null) {
      matches.push({
        local: m[1].trim(), visitante: m[4].trim(),
        goles_local: parseInt(m[2]), goles_visitante: parseInt(m[3]),
        jugado: true
      });
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

function parseScorers(html) {
  const $ = load(html);
  const scorers = [];
  $('table').each((_, table) => {
    const headerText = $(table).find('th').map((_, el) => $(el).text().trim().toLowerCase()).get().join(' ');
    if (headerText.includes('gol') || headerText.includes('jugador')) {
      $(table).find('tbody tr, tr').each((__, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const t = cells.map((_, td) => $(td).text().trim()).get();
          const golesIdx = t.findIndex(x => /^\d+$/.test(x));
          if (golesIdx >= 0 && t[0] && !/^\d+$/.test(t[0])) {
            scorers.push({
              jugador: t[0],
              equipo: t.find((x, i) => i > 0 && i !== golesIdx && !/^\d+$/.test(x)) || '',
              goles: parseInt(t[golesIdx])
            });
          }
        }
      });
    }
  });
  return scorers;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (authUser?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { action, url, jornada } = await req.json().catch(() => ({}));
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

    const cookies = await rffmLogin();
    const p = parseParams(url);

    switch (action) {
      case 'test': {
        const html = await fetchPage(url, cookies);
        const $ = load(html);
        const title = $('title').text().trim();
        
        // Extract ALL Ajax/fetch calls and URLs from scripts
        const scriptContent = [];
        $('script').each((_, s) => {
          const text = $(s).html() || '';
          if (text.includes('Nova_Ajax') || text.includes('NFG_') || text.includes('jornada') || text.includes('partido')) {
            scriptContent.push(text.substring(0, 2000));
          }
        });
        
        // Find Nova_Ajax calls with their full parameters
        const ajaxCalls = [];
        const allScripts = $('script').map((_, s) => $(s).html() || '').get().join('\n');
        const ajaxRe = /Nova_Ajax\s*\([^)]{5,500}\)/g;
        let m;
        while ((m = ajaxRe.exec(allScripts)) !== null) {
          ajaxCalls.push(m[0]);
        }
        
        // Also find any direct URL references to NFG_ endpoints
        const urlRefs = [];
        const urlRe = /['"]([^'"]*NFG_[^'"]+)['"]/g;
        while ((m = urlRe.exec(allScripts)) !== null) {
          urlRefs.push(m[1].substring(0, 300));
        }
        
        return Response.json({ 
          success: true, title, loginWorked: !title.toLowerCase().includes('login'),
          ajaxCalls: ajaxCalls.slice(0, 15),
          urlRefs: [...new Set(urlRefs)].slice(0, 20),
          scriptSnippets: scriptContent.slice(0, 5)
        });
      }

      case 'standings': {
        const sUrl = buildUrl('NFG_VisClasificacion', p);
        const html = await fetchPage(sUrl, cookies);
        return Response.json({ success: true, standings: parseStandings(html) });
      }

      case 'results': {
        const j = jornada || p.CodJornada;
        const rUrl = buildUrl('NFG_CmpJornada', p, { CodJornada: j, cod_agrupacion: 1, Sch_Tipo_Juego: '' });
        const html = await fetchPage(rUrl, cookies);
        return Response.json({ success: true, matches: parseMatchesFromJornada(html), jornada: j });
      }

      case 'next_match': {
        const current = parseInt(p.CodJornada) || 1;
        const next = current + 1;
        const rUrl = buildUrl('NFG_CmpJornada', p, { CodJornada: next, cod_agrupacion: 1, Sch_Tipo_Juego: '' });
        const html = await fetchPage(rUrl, cookies);
        const allMatches = parseMatchesFromJornada(html);
        const bust = allMatches.find(m =>
          m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO')
        );
        return Response.json({ success: true, jornada: next, all_matches: allMatches, bustarviejo_match: bust || null });
      }

      case 'scorers': {
        const gUrl = buildUrl('NFG_VisGoleadores', p);
        const html = await fetchPage(gUrl, cookies);
        return Response.json({ success: true, scorers: parseScorers(html) });
      }

      default:
        return Response.json({ error: 'Use: test, standings, results, next_match, scorers' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});