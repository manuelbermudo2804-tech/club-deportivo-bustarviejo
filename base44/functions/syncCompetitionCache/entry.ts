import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { load } from 'npm:cheerio@1.0.0';

// ═══ RFFM LOGIN & FETCH (copiado de rffmScraper) ═══

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
  const loginPageResp = await fetch(fullLoginUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; ') } });
  addCookies(loginPageResp);
  const loginHtml = await loginPageResp.text();
  const $ = load(loginHtml);
  let formAction = $('form').attr('action') || '/nfg/NLogin';
  if (!formAction.startsWith('http')) formAction = `https://intranet.ffmadrid.es${formAction}`;
  const hiddenFields = {};
  $('input[type="hidden"]').each((_, el) => { const name = $(el).attr('name'); if (name) hiddenFields[name] = $(el).attr('value') || ''; });
  const userField = $('input[type="text"]').attr('name') || 'NUser';
  const passField = $('input[type="password"]').attr('name') || 'NPass';
  const loginResp = await fetch(formAction, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; '), 'Referer': fullLoginUrl },
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
  let currentUrl = url;
  let maxRedirects = 5;
  let resp;
  while (maxRedirects-- > 0) {
    resp = await fetch(currentUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Cookie': cookies } });
    const location = resp.headers.get('location');
    if (location && [301,302,303,307].includes(resp.status)) {
      currentUrl = location.startsWith('http') ? location : `https://intranet.ffmadrid.es${location}`;
      for (const c of (resp.headers.getSetCookie?.() || [])) {
        const pair = c.split(';')[0];
        cookies = cookies.replace(new RegExp(pair.split('=')[0] + '=[^;]*'), pair);
      }
      continue;
    }
    break;
  }
  const buf = await resp.arrayBuffer();
  const ct = resp.headers.get('content-type') || '';
  const charsetMatch = ct.match(/charset=([^\s;]+)/i);
  const charset = charsetMatch ? charsetMatch[1] : 'iso-8859-1';
  return new TextDecoder(charset).decode(buf);
}

function extractParams(url) {
  const u = new URL(url);
  return {
    cod_primaria: u.searchParams.get('cod_primaria') || '1000128',
    CodCompeticion: u.searchParams.get('CodCompeticion') || u.searchParams.get('codcompeticion'),
    CodGrupo: u.searchParams.get('CodGrupo') || u.searchParams.get('codgrupo'),
    CodTemporada: u.searchParams.get('CodTemporada') || u.searchParams.get('codtemporada'),
  };
}

function buildJornadaUrl(p, jornada) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}&CodJornada=${jornada}&cod_agrupacion=1&Sch_Tipo_Juego=`;
}

function detectTotalJornadas(html) {
  const $ = load(html);
  let maxJ = 0;
  $('select option').each((_, opt) => {
    const num = parseInt($(opt).attr('value'));
    if (!isNaN(num) && num > 0 && num < 100 && num > maxJ) maxJ = num;
  });
  return maxJ || 30;
}

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
        c = c.replace(/\s*\(H\.?A\.?\)\s*-\s*.*/i, '').replace(/\s*-\s*Hierba\s*.*/i, '').replace(/\s*-\s*Tierra\s*.*/i, '').replace(/\s*-\s*Cesped\s*.*/i, '').trim();
        if (c) currentCampo = c;
      }
      continue;
    }
    const tds = $(table).find('td').toArray();
    if (tds.length < 3) continue;
    const localName = $(tds[0]).find('span').first().text().trim() || $(tds[0]).text().replace(/\s+/g, ' ').trim();
    const visitanteName = $(tds[2]).find('span').first().text().trim() || $(tds[2]).text().replace(/\s+/g, ' ').trim();
    if (!localName || !visitanteName) continue;
    const centerText = $(tds[1]).text().replace(/\s+/g, ' ').trim();
    let golesLocal = null, golesVisitante = null, jugado = false, fecha = null, hora = null;
    const dateMatch = centerText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
    if (dateMatch) fecha = dateMatch[1].replace(/-/g, '/');
    const timeMatch = centerText.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) hora = timeMatch[1];
    let textWithoutDate = centerText;
    if (dateMatch) textWithoutDate = textWithoutDate.replace(dateMatch[0], '');
    if (timeMatch) textWithoutDate = textWithoutDate.replace(timeMatch[0], '');
    textWithoutDate = textWithoutDate.trim();
    const scoreMatch = textWithoutDate.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (scoreMatch) { golesLocal = parseInt(scoreMatch[1]); golesVisitante = parseInt(scoreMatch[2]); jugado = true; }
    let matchCampo = currentCampo;
    if (tds.length > 3) {
      const campoText = $(tds[3]).text().replace(/\s+/g, ' ').trim();
      const campoMatch = campoText.match(/Campo:\s*(.+?)(?:\s*-\s*Hierba|\s*-\s*Tierra|\s*-\s*Cesped|$)/i);
      if (campoMatch) matchCampo = campoMatch[1].replace(/\s*\(HA\)\s*$/i, '').replace(/\s*\(H\.A\.\)\s*$/i, '').trim();
      else { const sc = campoText.match(/Campo:\s*(.+)/); if (sc) matchCampo = sc[1].trim(); }
    }
    matches.push({ local: localName, visitante: visitanteName, goles_local: golesLocal, goles_visitante: golesVisitante, jugado, fecha, hora, campo: matchCampo });
  }
  return matches;
}

// ═══ CROSS TABLE PARSER ═══

async function fetchCrossTable(p, cookies) {
  const urlVariants = [
    `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisTablaCruzada?cod_primaria=${p.cod_primaria}&codcompeticion=${p.CodCompeticion}&codgrupo=${p.CodGrupo}&codtemporada=${p.CodTemporada}`,
    `https://intranet.ffmadrid.es/nfg/NPcd/NFG_TablaCruzada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}`,
  ];
  let html = '';
  for (const tryUrl of urlVariants) {
    html = await fetchPage(tryUrl, cookies);
    if (html.length > 500 && !html.includes('Datos de Acceso')) break;
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!html || html.length < 500) return null;

  const $ct = load(html);
  const htmlStr = html;

  // Extract team IDs
  const equiposOrder = [];
  const eqPattern = /equipos\[j\+\+\]\s*=\s*(\d+)/g;
  let eqM;
  while ((eqM = eqPattern.exec(htmlStr)) !== null) equiposOrder.push(eqM[1]);
  if (equiposOrder.length === 0) return null;

  // Extract results from JS
  const tempResults = [];
  let jsBlock = '';
  $ct('script:not([src])').each((_, s) => {
    const content = $ct(s).html() || '';
    if (content.includes('result[i]') && content.includes('equipos[')) { jsBlock = content; return false; }
  });
  if (jsBlock) {
    const blocks = jsBlock.split('i++;');
    for (const block of blocks) {
      if (!block.includes("result[i][0]")) continue;
      const lines = block.split('\n');
      let lid = null, vid = null, scoreH = '', isR = false;
      for (const line of lines) {
        const tr = line.trim();
        if (tr.startsWith('result_excel')) continue;
        const f0 = tr.match(/^result\[i\]\[0\]\s*=\s*'([^']*)'/); if (f0) { lid = f0[1]; isR = true; }
        const f1 = tr.match(/^result\[i\]\[1\]\s*=\s*'([^']*)'/); if (f1) vid = f1[1];
        const f2s = tr.match(/^result\[i\]\[2\]\s*=\s*'([^']*)'/); if (f2s) scoreH = f2s[1];
        const f2a = tr.match(/^result\[i\]\[2\]\s*\+=\s*'([^']*)'/); if (f2a) scoreH += f2a[1];
      }
      if (isR && lid && vid) {
        const sc = scoreH.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const sm = sc.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
        tempResults.push({ local_id: lid, visitante_id: vid, gl: sm ? parseInt(sm[1]) : null, gv: sm ? parseInt(sm[2]) : null, jugado: !!sm });
      }
    }
  }

  // Resolve team names from jornada pages
  const teamNames = {};
  const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
  const j1Matches = parseJornadaMatches(j1Html);
  const usedResults = new Set();

  function matchJornadaResults(jMatches) {
    for (const jm of jMatches) {
      if (!jm.jugado || jm.goles_local == null) continue;
      for (let ri = 0; ri < tempResults.length; ri++) {
        if (usedResults.has(ri)) continue;
        const r = tempResults[ri];
        if (r.gl !== jm.goles_local || r.gv !== jm.goles_visitante) continue;
        const eL = teamNames[r.local_id], eV = teamNames[r.visitante_id];
        if (eL && eV) { usedResults.add(ri); continue; }
        if (eL && eL !== jm.local) continue;
        if (eV && eV !== jm.visitante) continue;
        if (!eL) teamNames[r.local_id] = jm.local;
        if (!eV) teamNames[r.visitante_id] = jm.visitante;
        usedResults.add(ri);
        break;
      }
    }
  }
  matchJornadaResults(j1Matches);

  if (Object.keys(teamNames).length < equiposOrder.length) {
    const totalJ = detectTotalJornadas(j1Html);
    for (let jn = 2; jn <= Math.min(totalJ, 8); jn++) {
      if (Object.keys(teamNames).length >= equiposOrder.length) break;
      await new Promise(r => setTimeout(r, 800));
      const jnHtml = await fetchPage(buildJornadaUrl(p, jn), cookies);
      matchJornadaResults(parseJornadaMatches(jnHtml));
    }
  }

  const teams = equiposOrder.map(id => ({ id, name: teamNames[id] || `Equipo ${id}` }));
  const matrix = {};
  for (const r of tempResults) {
    const li = equiposOrder.indexOf(r.local_id);
    const vi = equiposOrder.indexOf(r.visitante_id);
    if (li >= 0 && vi >= 0) {
      if (!matrix[li]) matrix[li] = {};
      matrix[li][vi] = { goles_local: r.gl, goles_visitante: r.gv, jugado: r.jugado };
    }
  }
  return { teams, matrix, result_count: tempResults.length };
}

// ═══ MAIN: Sync all categories ═══

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const configs = await base44.asServiceRole.entities.StandingsConfig.list();
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'No StandingsConfig found' }, { status: 400 });
    }

    let cookies = await rffmLogin();
    console.log(`[SYNC] Logged in to RFFM. Processing ${configs.length} categories...`);

    const results = [];

    for (const config of configs) {
      const cat = config.categoria;
      const rfefUrl = config.rfef_url || config.rfef_results_url;
      if (!rfefUrl) { results.push({ cat, status: 'skipped', reason: 'no URL' }); continue; }

      const p = extractParams(rfefUrl);
      console.log(`[SYNC] Processing ${cat}...`);

      // 1) Fetch all jornadas
      let jornadasData = null;
      try {
        const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
        if (j1Html.includes('Datos de Acceso')) {
          cookies = await rffmLogin();
          await new Promise(r => setTimeout(r, 2000));
        }
        const totalJ = detectTotalJornadas(j1Html);
        const jornadas = [{ jornada: 1, matches: parseJornadaMatches(j1Html) }];
        for (let batch = 2; batch <= totalJ; batch += 3) {
          const batchEnd = Math.min(batch + 2, totalJ);
          const promises = [];
          for (let j = batch; j <= batchEnd; j++) {
            promises.push(
              fetchPage(buildJornadaUrl(p, j), cookies)
                .then(html => ({ jornada: j, matches: parseJornadaMatches(html) }))
                .catch(() => ({ jornada: j, matches: [], error: true }))
            );
          }
          jornadas.push(...(await Promise.all(promises)));
          if (batch + 3 <= totalJ) await new Promise(r => setTimeout(r, 1500));
        }
        jornadas.sort((a, b) => a.jornada - b.jornada);
        jornadasData = { total_jornadas: totalJ, jornadas };
        console.log(`[SYNC] ${cat}: ${totalJ} jornadas fetched`);
      } catch (e) {
        console.error(`[SYNC] ${cat} jornadas error:`, e.message);
        results.push({ cat, tipo: 'jornadas', status: 'error', error: e.message });
      }

      await new Promise(r => setTimeout(r, 2000));

      // 2) Fetch cross table
      let crossData = null;
      try {
        crossData = await fetchCrossTable(p, cookies);
        console.log(`[SYNC] ${cat}: cross table ${crossData ? crossData.teams.length + ' teams' : 'failed'}`);
      } catch (e) {
        console.error(`[SYNC] ${cat} cross_table error:`, e.message);
        results.push({ cat, tipo: 'tabla_cruzada', status: 'error', error: e.message });
      }

      await new Promise(r => setTimeout(r, 2000));

      // 3) Save to CompetitionCache (upsert by categoria + tipo)
      const existing = await base44.asServiceRole.entities.CompetitionCache.filter({ categoria: cat });
      const existingMap = {};
      for (const e of existing) existingMap[e.tipo] = e;

      if (jornadasData) {
        const payload = { categoria: cat, tipo: 'jornadas', datos: jornadasData, ultima_sync: new Date().toISOString() };
        if (existingMap['jornadas']) {
          await base44.asServiceRole.entities.CompetitionCache.update(existingMap['jornadas'].id, payload);
        } else {
          await base44.asServiceRole.entities.CompetitionCache.create(payload);
        }
        results.push({ cat, tipo: 'jornadas', status: 'ok', jornadas: jornadasData.total_jornadas });
      }

      if (crossData) {
        const payload = { categoria: cat, tipo: 'tabla_cruzada', datos: crossData, ultima_sync: new Date().toISOString() };
        if (existingMap['tabla_cruzada']) {
          await base44.asServiceRole.entities.CompetitionCache.update(existingMap['tabla_cruzada'].id, payload);
        } else {
          await base44.asServiceRole.entities.CompetitionCache.create(payload);
        }
        results.push({ cat, tipo: 'tabla_cruzada', status: 'ok', teams: crossData.teams.length });
      }
    }

    console.log(`[SYNC] Complete. Results:`, JSON.stringify(results));
    return Response.json({ success: true, results });
  } catch (error) {
    console.error('[SYNC] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});