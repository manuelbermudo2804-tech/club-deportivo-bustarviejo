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

// The RFFM uses frames. Main URL loads the frame container.
// Actual match data is in NFG_CmpJornada_Exec (inner frame).
// Classification data is in NFG_VisClasificacion_Exec.
// Scorers data is in NFG_VisGoleadores_Exec.

function buildExecUrl(type, p, extra = {}) {
  const base = 'https://intranet.ffmadrid.es/nfg/NPcd/';
  const params = new URLSearchParams({
    cod_primaria: p.cod_primaria,
    codtemporada: p.CodTemporada,
    codcompeticion: p.CodCompeticion,
    codgrupo: p.CodGrupo,
    ...extra
  });
  return `${base}${type}?${params.toString()}`;
}

// Parse match results from the _Exec page
function parseMatchesExec(html) {
  const $ = load(html);
  const matches = [];
  
  // The Exec page has direct match data in tables
  $('table').each((_, table) => {
    $(table).find('tr').each((__, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;
      
      const texts = cells.map((_, td) => $(td).text().trim()).get();
      const fullRow = texts.join(' | ');
      
      // Try to find score pattern: "N - N" 
      for (let i = 0; i < texts.length; i++) {
        const scoreMatch = texts[i].match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (scoreMatch && i > 0 && i < texts.length - 1) {
          const local = texts[i - 1].replace(/\s+/g, ' ').trim();
          const visitante = texts[i + 1].replace(/\s+/g, ' ').trim();
          if (local.length > 2 && visitante.length > 2 && !/^\d+$/.test(local)) {
            const match = {
              local, visitante,
              goles_local: parseInt(scoreMatch[1]),
              goles_visitante: parseInt(scoreMatch[2]),
              jugado: true
            };
            // Check for date and time in surrounding cells
            for (const t of texts) {
              const dateM = t.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
              if (dateM) match.fecha = dateM[1];
              const timeM = t.match(/(\d{1,2}:\d{2})/);
              if (timeM && !match.hora) match.hora = timeM[1];
            }
            matches.push(match);
          }
        }
        
        // Upcoming match: time in middle (no score yet)
        const timeOnlyMatch = texts[i].match(/^(\d{1,2}:\d{2})$/);
        if (timeOnlyMatch && i > 0 && i < texts.length - 1) {
          const local = texts[i - 1].replace(/\s+/g, ' ').trim();
          const visitante = texts[i + 1].replace(/\s+/g, ' ').trim();
          if (local.length > 2 && visitante.length > 2 && !/^\d+$/.test(local) && !/^\d+$/.test(visitante)) {
            const match = { local, visitante, hora: timeOnlyMatch[1], jugado: false };
            for (const t of texts) {
              const dateM = t.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
              if (dateM) match.fecha = dateM[1];
            }
            matches.push(match);
          }
        }
      }
      
      // Also check for "Descansa" (bye week)
      if (fullRow.toLowerCase().includes('descansa')) {
        const team = texts.find(t => t.length > 3 && !/descansa/i.test(t) && !/^\d/.test(t));
        if (team) matches.push({ local: team, visitante: 'DESCANSA', jugado: false, descansa: true });
      }
    });
  });
  
  // Deduplicate
  const seen = new Set();
  return matches.filter(m => {
    const key = `${m.local}__${m.visitante}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Parse classification/standings from _Exec page
function parseStandingsExec(html) {
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

// Parse scorers from _Exec page
function parseScorersExec(html) {
  const $ = load(html);
  const scorers = [];
  $('table').each((_, table) => {
    const headerText = $(table).find('th').map((_, el) => $(el).text().trim().toLowerCase()).get().join(' ');
    if (headerText.includes('gol') || headerText.includes('jugador')) {
      $(table).find('tr').each((__, row) => {
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
    const p = {
      cod_primaria: new URL(url).searchParams.get('cod_primaria'),
      CodCompeticion: new URL(url).searchParams.get('CodCompeticion') || new URL(url).searchParams.get('codcompeticion'),
      CodGrupo: new URL(url).searchParams.get('CodGrupo') || new URL(url).searchParams.get('codgrupo'),
      CodTemporada: new URL(url).searchParams.get('CodTemporada') || new URL(url).searchParams.get('codtemporada'),
      CodJornada: new URL(url).searchParams.get('CodJornada') || new URL(url).searchParams.get('codjornada'),
    };

    switch (action) {
      case 'test': {
        // Fetch the inner frame (Exec) to see actual match data
        const j = jornada || p.CodJornada || '1';
        const execUrl = buildExecUrl('NFG_CmpJornada_Exec', p, { codjornada: j, cod_agrupacion: 1, Sch_Tipo_Juego: '' });
        const html = await fetchPage(execUrl, cookies);
        const $ = load(html);
        
        // Extract all table data for debugging
        const tables = [];
        $('table').each((i, table) => {
          const rows = [];
          $(table).find('tr').each((_, tr) => {
            const cells = $(tr).find('th, td').map((__, c) => $(c).text().trim().substring(0, 150)).get();
            if (cells.some(c => c.length > 0)) rows.push(cells);
          });
          if (rows.length > 0) tables.push({ idx: i, rows: rows.slice(0, 15) });
        });
        
        const matches = parseMatchesExec(html);
        
        return Response.json({ 
          success: true,
          execUrl,
          htmlLength: html.length,
          tables: tables.slice(0, 10),
          parsedMatches: matches
        });
      }

      case 'results': {
        const j = jornada || p.CodJornada;
        const execUrl = buildExecUrl('NFG_CmpJornada_Exec', p, { codjornada: j, cod_agrupacion: 1, Sch_Tipo_Juego: '' });
        const html = await fetchPage(execUrl, cookies);
        const matches = parseMatchesExec(html);
        return Response.json({ success: true, matches, jornada: j });
      }

      case 'next_match': {
        const current = parseInt(p.CodJornada) || 1;
        const next = current + 1;
        const execUrl = buildExecUrl('NFG_CmpJornada_Exec', p, { codjornada: next, cod_agrupacion: 1, Sch_Tipo_Juego: '' });
        const html = await fetchPage(execUrl, cookies);
        const allMatches = parseMatchesExec(html);
        const bust = allMatches.find(m =>
          m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO')
        );
        return Response.json({ success: true, jornada: next, all_matches: allMatches, bustarviejo_match: bust || null });
      }

      case 'standings': {
        const execUrl = buildExecUrl('NFG_VisClasificacion_Exec', p);
        const html = await fetchPage(execUrl, cookies);
        const standings = parseStandingsExec(html);
        return Response.json({ success: true, standings });
      }

      case 'scorers': {
        const execUrl = buildExecUrl('NFG_VisGoleadores_Exec', p);
        const html = await fetchPage(execUrl, cookies);
        const scorers = parseScorersExec(html);
        return Response.json({ success: true, scorers });
      }

      default:
        return Response.json({ error: 'Use: test, standings, results, next_match, scorers' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});