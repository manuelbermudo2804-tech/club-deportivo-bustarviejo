import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

// Helper: Login to RFFM intranet and get session cookies
async function rffmLogin() {
  const user = Deno.env.get('RFFM_USER');
  const pass = Deno.env.get('RFFM_PASSWORD');
  
  if (!user || !pass) throw new Error('RFFM credentials not configured');

  // Step 1: GET the login page to get any session cookies/tokens
  const loginPageResp = await fetch('https://intranet.ffmadrid.es/nfg/login', {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  // Collect cookies from login page
  const setCookies = loginPageResp.headers.getSetCookie?.() || [];
  const cookieJar = setCookies.map(c => c.split(';')[0]).join('; ');

  // Step 2: POST login credentials
  const loginBody = new URLSearchParams({
    usuario: user,
    clave: pass,
    // Common form fields for RFFM
    Submit: 'Entrar'
  });

  const loginResp = await fetch('https://intranet.ffmadrid.es/nfg/login', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookieJar
    },
    body: loginBody.toString()
  });

  // Collect all cookies from login response
  const loginCookies = loginResp.headers.getSetCookie?.() || [];
  const allCookies = [...setCookies, ...loginCookies].map(c => c.split(';')[0]);
  
  // Deduplicate cookies (keep last value for each name)
  const cookieMap = {};
  for (const c of allCookies) {
    const [name] = c.split('=');
    cookieMap[name.trim()] = c;
  }
  const sessionCookies = Object.values(cookieMap).join('; ');

  return sessionCookies;
}

// Helper: Fetch a page with session cookies
async function fetchWithSession(url, cookies) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookies
    }
  });
  return await resp.text();
}

// Parse URL params to construct other tab URLs
function parseRffmUrl(url) {
  const u = new URL(url);
  const params = {
    cod_primaria: u.searchParams.get('cod_primaria'),
    CodCompeticion: u.searchParams.get('CodCompeticion'),
    CodGrupo: u.searchParams.get('CodGrupo'),
    CodTemporada: u.searchParams.get('CodTemporada'),
    CodJornada: u.searchParams.get('CodJornada'),
  };
  return params;
}

function buildStandingsUrl(params) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=${params.cod_primaria}&CodCompeticion=${params.CodCompeticion}&CodGrupo=${params.CodGrupo}&CodTemporada=${params.CodTemporada}`;
}

function buildResultsUrl(params, jornada) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${params.cod_primaria}&CodCompeticion=${params.CodCompeticion}&CodGrupo=${params.CodGrupo}&CodTemporada=${params.CodTemporada}&CodJornada=${jornada}&cod_agrupacion=1&Sch_Tipo_Juego=`;
}

function buildScorersUrl(params) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisGoleadores?cod_primaria=${params.cod_primaria}&CodCompeticion=${params.CodCompeticion}&CodGrupo=${params.CodGrupo}&CodTemporada=${params.CodTemporada}`;
}

// Parse standings table
function parseStandings(html) {
  const $ = load(html);
  const standings = [];
  
  // Look for the main classification table
  $('table tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 8) {
      const texts = cells.map((_, td) => $(td).text().trim()).get();
      // Typical: Pos, Equipo, Pts, PJ, PG, PE, PP, GF, GC, ...
      const pos = parseInt(texts[0]);
      if (!isNaN(pos)) {
        standings.push({
          posicion: pos,
          equipo: texts[1],
          puntos: parseInt(texts[2]) || 0,
          partidos_jugados: parseInt(texts[3]) || 0,
          ganados: parseInt(texts[4]) || 0,
          empatados: parseInt(texts[5]) || 0,
          perdidos: parseInt(texts[6]) || 0,
          goles_favor: parseInt(texts[7]) || 0,
          goles_contra: parseInt(texts[8]) || 0,
        });
      }
    }
  });
  
  return standings;
}

// Parse results/fixtures for a jornada
function parseResults(html) {
  const $ = load(html);
  const matches = [];
  
  // Look for match rows - typically have two teams and a score or time
  $('table tr').each((i, row) => {
    const cells = $(row).find('td');
    const texts = cells.map((_, td) => $(td).text().trim()).get();
    const fullText = texts.join(' ');
    
    // Look for patterns like "EQUIPO A  2 - 1  EQUIPO B" or "EQUIPO A  - EQUIPO B  10:00"
    if (cells.length >= 3) {
      // Try to find team names and score
      const match = {};
      
      for (let j = 0; j < texts.length; j++) {
        const scoreMatch = texts[j].match(/^(\d+)\s*-\s*(\d+)$/);
        if (scoreMatch) {
          match.goles_local = parseInt(scoreMatch[1]);
          match.goles_visitante = parseInt(scoreMatch[2]);
          // Team before score is local, after is visitor
          if (j > 0) match.local = texts[j - 1];
          if (j < texts.length - 1) match.visitante = texts[j + 1];
        }
      }
      
      // Check for time pattern (HH:MM) - means upcoming match
      const timeMatch = fullText.match(/(\d{1,2}:\d{2})/);
      if (timeMatch) match.hora = timeMatch[1];
      
      // Check for date
      const dateMatch = fullText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateMatch) match.fecha = dateMatch[1];
      
      if (match.local || match.visitante) {
        matches.push(match);
      }
    }
  });
  
  return matches;
}

// Parse scorers table
function parseScorers(html) {
  const $ = load(html);
  const scorers = [];
  
  $('table tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 3) {
      const texts = cells.map((_, td) => $(td).text().trim()).get();
      // Look for rows with a number (goals)
      const goalsIdx = texts.findIndex(t => /^\d+$/.test(t));
      if (goalsIdx >= 0 && texts[0] && !/^\d+$/.test(texts[0])) {
        scorers.push({
          jugador: texts[0],
          equipo: texts.find((t, i) => i > 0 && i !== goalsIdx && !/^\d+$/.test(t)) || '',
          goles: parseInt(texts[goalsIdx])
        });
      }
    }
  });
  
  return scorers;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, url, jornada } = body;

    // Login to RFFM
    const cookies = await rffmLogin();
    const params = parseRffmUrl(url);

    if (action === 'test') {
      // Just fetch the given URL and return raw HTML snippet for debugging
      const html = await fetchWithSession(url, cookies);
      const $ = load(html);
      // Return a summary: page title, table count, and first 3000 chars of body text
      const title = $('title').text().trim();
      const tableCount = $('table').length;
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);
      const tablesHtml = [];
      $('table').each((i, table) => {
        if (i < 5) tablesHtml.push($(table).html().substring(0, 2000));
      });
      return Response.json({ 
        success: true, 
        title, 
        tableCount, 
        bodyTextPreview: bodyText,
        tablesPreview: tablesHtml,
        params,
        loginWorked: !bodyText.toLowerCase().includes('login') || bodyText.length > 500
      });
    }

    if (action === 'standings') {
      const standingsUrl = buildStandingsUrl(params);
      const html = await fetchWithSession(standingsUrl, cookies);
      const standings = parseStandings(html);
      return Response.json({ success: true, standings, url: standingsUrl });
    }

    if (action === 'results') {
      const targetJornada = jornada || params.CodJornada;
      const resultsUrl = buildResultsUrl(params, targetJornada);
      const html = await fetchWithSession(resultsUrl, cookies);
      const results = parseResults(html);
      return Response.json({ success: true, results, jornada: targetJornada, url: resultsUrl });
    }

    if (action === 'scorers') {
      const scorersUrl = buildScorersUrl(params);
      const html = await fetchWithSession(scorersUrl, cookies);
      const scorers = parseScorers(html);
      return Response.json({ success: true, scorers, url: scorersUrl });
    }

    if (action === 'next_match') {
      // Get current jornada, then fetch next one to find upcoming match
      const currentJornada = parseInt(params.CodJornada) || 1;
      const nextJornada = currentJornada + 1;
      const resultsUrl = buildResultsUrl(params, nextJornada);
      const html = await fetchWithSession(resultsUrl, cookies);
      const allMatches = parseResults(html);
      
      // Filter for Bustarviejo match
      const bustarMatch = allMatches.find(m => 
        (m.local && m.local.toUpperCase().includes('BUSTARVIEJO')) ||
        (m.visitante && m.visitante.toUpperCase().includes('BUSTARVIEJO'))
      );
      
      return Response.json({ 
        success: true, 
        jornada: nextJornada,
        all_matches: allMatches,
        bustarviejo_match: bustarMatch || null,
        url: resultsUrl
      });
    }

    return Response.json({ error: 'Invalid action. Use: test, standings, results, scorers, next_match' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});