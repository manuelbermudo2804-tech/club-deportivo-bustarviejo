import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

// Helper: Login to RFFM intranet and get session cookies
async function rffmLogin() {
  const rffmUser = Deno.env.get('RFFM_USER');
  const rffmPass = Deno.env.get('RFFM_PASSWORD');
  
  if (!rffmUser || !rffmPass) throw new Error('RFFM credentials not configured');

  // Step 1: GET a protected page to get redirected to login
  const baseResp = await fetch('https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion', {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const setCookies1 = baseResp.headers.getSetCookie?.() || [];
  const cookieMap = {};
  for (const c of setCookies1) {
    const name = c.split(';')[0].split('=')[0].trim();
    cookieMap[name] = c.split(';')[0];
  }
  
  const loginUrl = baseResp.headers.get('location') || 'https://intranet.ffmadrid.es/nfg/NLogin';
  const fullLoginUrl = loginUrl.startsWith('http') ? loginUrl : `https://intranet.ffmadrid.es${loginUrl}`;
  
  // Step 2: GET the login page
  const loginPageResp = await fetch(fullLoginUrl, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': Object.values(cookieMap).join('; ')
    }
  });
  
  for (const c of (loginPageResp.headers.getSetCookie?.() || [])) {
    const name = c.split(';')[0].split('=')[0].trim();
    cookieMap[name] = c.split(';')[0];
  }
  
  const loginHtml = await loginPageResp.text();
  const $ = load(loginHtml);
  
  let formAction = $('form').attr('action') || '/nfg/NLogin';
  if (!formAction.startsWith('http')) formAction = `https://intranet.ffmadrid.es${formAction}`;
  
  const hiddenFields = {};
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value') || '';
    if (name) hiddenFields[name] = value;
  });
  
  const userField = $('input[type="text"]').attr('name') || 'NUser';
  const passField = $('input[type="password"]').attr('name') || 'NPass';

  // Step 3: POST login
  const loginBody = new URLSearchParams({ ...hiddenFields, [userField]: rffmUser, [passField]: rffmPass });

  const loginResp = await fetch(formAction, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': Object.values(cookieMap).join('; '),
      'Referer': fullLoginUrl
    },
    body: loginBody.toString()
  });

  for (const c of (loginResp.headers.getSetCookie?.() || [])) {
    const name = c.split(';')[0].split('=')[0].trim();
    cookieMap[name] = c.split(';')[0];
  }
  
  // Follow redirects
  let redirectUrl = loginResp.headers.get('location');
  let maxRedirects = 5;
  while (redirectUrl && maxRedirects > 0) {
    const full = redirectUrl.startsWith('http') ? redirectUrl : `https://intranet.ffmadrid.es${redirectUrl}`;
    const r = await fetch(full, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': Object.values(cookieMap).join('; ')
      }
    });
    for (const c of (r.headers.getSetCookie?.() || [])) {
      const name = c.split(';')[0].split('=')[0].trim();
      cookieMap[name] = c.split(';')[0];
    }
    redirectUrl = r.headers.get('location');
    maxRedirects--;
  }

  return Object.values(cookieMap).join('; ');
}

async function fetchWithSession(url, cookies) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookies
    }
  });
  return await resp.text();
}

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

function buildResultsUrl(p, jornada) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}&CodJornada=${jornada}&cod_agrupacion=1&Sch_Tipo_Juego=`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (authUser?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, url, jornada } = body;

    const cookies = await rffmLogin();
    const params = parseRffmUrl(url);

    if (action === 'debug_tables') {
      // Fetch page and return structured table data for analysis
      const html = await fetchWithSession(url, cookies);
      const $ = load(html);
      const title = $('title').text().trim();
      
      const tables = [];
      $('table').each((i, table) => {
        const rows = [];
        $(table).find('tr').each((j, tr) => {
          const cells = [];
          $(tr).find('th, td').each((k, cell) => {
            cells.push({
              tag: cell.tagName,
              text: $(cell).text().trim(),
              colspan: $(cell).attr('colspan') || null,
              class: $(cell).attr('class') || null
            });
          });
          if (cells.length > 0) rows.push(cells);
        });
        if (rows.length > 0) {
          tables.push({ index: i, rowCount: rows.length, rows: rows.slice(0, 15) }); // First 15 rows
        }
      });
      
      return Response.json({ success: true, title, tableCount: tables.length, tables, loginWorked: !title.toLowerCase().includes('login') });
    }

    if (action === 'debug_results') {
      const targetJornada = jornada || params.CodJornada;
      const resultsUrl = buildResultsUrl(params, targetJornada);
      const html = await fetchWithSession(resultsUrl, cookies);
      const $ = load(html);
      const title = $('title').text().trim();
      
      const tables = [];
      $('table').each((i, table) => {
        const rows = [];
        $(table).find('tr').each((j, tr) => {
          const cells = [];
          $(tr).find('th, td').each((k, cell) => {
            cells.push({
              tag: cell.tagName,
              text: $(cell).text().trim(),
              class: $(cell).attr('class') || null
            });
          });
          if (cells.length > 0) rows.push(cells);
        });
        if (rows.length > 0) {
          tables.push({ index: i, rowCount: rows.length, rows: rows.slice(0, 15) });
        }
      });
      
      return Response.json({ success: true, title, jornada: targetJornada, tableCount: tables.length, tables, url: resultsUrl, loginWorked: !title.toLowerCase().includes('login') });
    }

    return Response.json({ error: 'Invalid action. Use: debug_tables, debug_results' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});