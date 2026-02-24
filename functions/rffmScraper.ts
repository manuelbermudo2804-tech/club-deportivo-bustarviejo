import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

// Helper: Login to RFFM intranet and get session cookies
async function rffmLogin() {
  const user = Deno.env.get('RFFM_USER');
  const pass = Deno.env.get('RFFM_PASSWORD');
  
  if (!user || !pass) throw new Error('RFFM credentials not configured');

  // Step 1: GET the intranet base to get redirected to login and capture cookies
  const baseResp = await fetch('https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion', {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  // Collect cookies
  const setCookies1 = baseResp.headers.getSetCookie?.() || [];
  let cookieJar = setCookies1.map(c => c.split(';')[0]).join('; ');
  
  // Follow redirect if needed
  const loginUrl = baseResp.headers.get('location') || 'https://intranet.ffmadrid.es/nfg/NLogin';
  
  // Step 2: GET the login page
  const loginPageResp = await fetch(loginUrl.startsWith('http') ? loginUrl : `https://intranet.ffmadrid.es${loginUrl}`, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookieJar
    }
  });
  
  const loginPageCookies = loginPageResp.headers.getSetCookie?.() || [];
  const loginHtml = await loginPageResp.text();
  
  // Update cookie jar
  const allCookies1 = [...setCookies1, ...loginPageCookies];
  const cookieMap = {};
  for (const c of allCookies1) {
    const name = c.split(';')[0].split('=')[0].trim();
    cookieMap[name] = c.split(';')[0];
  }
  cookieJar = Object.values(cookieMap).join('; ');

  // Parse login form to find action URL and any hidden fields
  const $ = load(loginHtml);
  let formAction = $('form').attr('action') || '/nfg/NLogin';
  if (!formAction.startsWith('http')) {
    formAction = `https://intranet.ffmadrid.es${formAction}`;
  }
  
  // Get hidden fields
  const hiddenFields = {};
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value') || '';
    if (name) hiddenFields[name] = value;
  });
  
  // Find username and password field names
  const userField = $('input[type="text"]').attr('name') || 'NUser';
  const passField = $('input[type="password"]').attr('name') || 'NPass';

  // Step 3: POST login
  const loginBody = new URLSearchParams({
    ...hiddenFields,
    [userField]: user,
    [passField]: pass,
  });

  const loginResp = await fetch(formAction, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookieJar,
      'Referer': loginUrl.startsWith('http') ? loginUrl : `https://intranet.ffmadrid.es${loginUrl}`
    },
    body: loginBody.toString()
  });

  // Collect cookies from login response
  const loginRespCookies = loginResp.headers.getSetCookie?.() || [];
  for (const c of loginRespCookies) {
    const name = c.split(';')[0].split('=')[0].trim();
    cookieMap[name] = c.split(';')[0];
  }
  
  // Follow redirect chain after login
  let redirectUrl = loginResp.headers.get('location');
  let maxRedirects = 5;
  while (redirectUrl && maxRedirects > 0) {
    const fullUrl = redirectUrl.startsWith('http') ? redirectUrl : `https://intranet.ffmadrid.es${redirectUrl}`;
    const redirResp = await fetch(fullUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': Object.values(cookieMap).join('; ')
      }
    });
    const redirCookies = redirResp.headers.getSetCookie?.() || [];
    for (const c of redirCookies) {
      const name = c.split(';')[0].split('=')[0].trim();
      cookieMap[name] = c.split(';')[0];
    }
    redirectUrl = redirResp.headers.get('location');
    maxRedirects--;
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

// Parse URL params
function parseRffmUrl(url) {
  const u = new URL(url);
  return {
    cod_primaria: u.searchParams.get('cod_primaria'),
    CodCompeticion: u.searchParams.get('CodCompeticion'),
    CodGrupo: u.searchParams.get('CodGrupo'),
    CodTemporada: u.searchParams.get('CodTemporada'),
    CodJornada: u.searchParams.get('CodJornada'),
  };
}

function buildStandingsUrl(p) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}`;
}

function buildResultsUrl(p, jornada) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}&CodJornada=${jornada}&cod_agrupacion=1&Sch_Tipo_Juego=`;
}

function buildScorersUrl(p) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisGoleadores?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}`;
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
      // Fetch the given URL and return debug info
      const html = await fetchWithSession(url, cookies);
      const $ = load(html);
      const title = $('title').text().trim();
      const tableCount = $('table').length;
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);
      const tablesHtml = [];
      $('table').each((i, table) => {
        if (i < 5) tablesHtml.push($(table).html()?.substring(0, 3000));
      });
      return Response.json({ 
        success: true, 
        title, 
        tableCount, 
        bodyTextPreview: bodyText,
        tablesPreview: tablesHtml,
        params,
        loginWorked: !title.toLowerCase().includes('login')
      });
    }

    if (action === 'standings') {
      const standingsUrl = buildStandingsUrl(params);
      const html = await fetchWithSession(standingsUrl, cookies);
      const $ = load(html);
      const title = $('title').text().trim();
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);
      return Response.json({ success: true, title, bodyPreview: bodyText, url: standingsUrl, loginWorked: !title.toLowerCase().includes('login') });
    }

    if (action === 'results') {
      const targetJornada = jornada || params.CodJornada;
      const resultsUrl = buildResultsUrl(params, targetJornada);
      const html = await fetchWithSession(resultsUrl, cookies);
      const $ = load(html);
      const title = $('title').text().trim();
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);
      return Response.json({ success: true, title, bodyPreview: bodyText, jornada: targetJornada, url: resultsUrl, loginWorked: !title.toLowerCase().includes('login') });
    }

    return Response.json({ error: 'Invalid action. Use: test, standings, results' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});