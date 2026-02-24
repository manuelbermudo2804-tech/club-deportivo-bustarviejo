import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * RFFM Weekly Sync — runs Monday 8:00 AM
 * For each category with configured RFFM URLs:
 *   1. Sync standings (clasificación)
 *   2. Sync latest results
 *   3. Sync scorers (goleadores)
 * Self-contained: does its own RFFM login + scraping (no cross-function calls).
 */

// ---- Inline RFFM helpers ----

async function rffmLogin() {
  const rffmUser = Deno.env.get('RFFM_USER');
  const rffmPass = Deno.env.get('RFFM_PASSWORD');
  if (!rffmUser || !rffmPass) throw new Error('RFFM credentials not configured');
  const baseResp = await fetch('https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion', {
    redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const cookieMap = {};
  const addCookies = (resp) => { for (const c of (resp.headers.getSetCookie?.() || [])) { const name = c.split(';')[0].split('=')[0].trim(); cookieMap[name] = c.split(';')[0]; } };
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
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies } });
  return await resp.text();
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

function buildClassificationUrl(p, jornada) {
  let url = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=${p.cod_primaria}&codcompeticion=${p.CodCompeticion}&codgrupo=${p.CodGrupo}&codtemporada=${p.CodTemporada}`;
  if (jornada) url += `&codjornada=${jornada}`;
  return url;
}

function buildScorersUrl(p) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&CodJornada=0&codcompeticion=${p.CodCompeticion}&codtemporada=${p.CodTemporada}&codgrupo=${p.CodGrupo}&cod_agrupacion=1`;
}

function parseJornadaMatches(html) {
  const $ = load(html);
  const matches = [];
  const tables = $('table').toArray();
  let currentCampo = null;
  for (let i = 3; i < tables.length; i++) {
    const table = tables[i];
    const tableHtml = $(table).html() || '';
    const hasEscudo = tableHtml.includes('escudo_clb') || tableHtml.includes('pimg/Clubes');
    if (!hasEscudo) {
      const text = $(table).text().replace(/\s+/g, ' ').trim();
      const campoFull = text.match(/Campo:\s*(.+)/);
      if (campoFull) { let c = campoFull[1].trim(); c = c.replace(/\s*\(H\.?A\.?\)\s*-\s*.*/i, '').replace(/\s*-\s*Hierba\s*.*/i, '').replace(/\s*-\s*Tierra\s*.*/i, '').replace(/\s*-\s*Cesped\s*.*/i, '').trim(); if (c) currentCampo = c; }
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
      else { const simpleCampo = campoText.match(/Campo:\s*(.+)/); if (simpleCampo) matchCampo = simpleCampo[1].trim(); }
    }
    matches.push({ local: localName, visitante: visitanteName, goles_local: golesLocal, goles_visitante: golesVisitante, jugado, fecha, hora, campo: matchCampo });
  }
  return matches;
}

function detectTotalJornadas(html) {
  const $ = load(html);
  let maxJornada = 0;
  $('select option').each((_, opt) => { const num = parseInt($(opt).attr('value')); if (!isNaN(num) && num > 0 && num < 100 && num > maxJornada) maxJornada = num; });
  if (maxJornada === 0) { const m = html.match(/Jornada\s+(\d+)/gi) || []; for (const jm of m) { const n = parseInt(jm.match(/(\d+)/)[1]); if (n > maxJornada) maxJornada = n; } }
  return maxJornada || 30;
}

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
      const cellTexts = cells.map(c => { const clone = $(c).clone(); clone.find('script, style').remove(); return clone.text().replace(/\s+/g, ' ').trim(); });
      let numericStart = -1;
      for (let i = 0; i < cellTexts.length - 6; i++) { let allInt = true; for (let j = i; j <= i + 6; j++) { if (j >= cellTexts.length || !/^\d+$/.test(cellTexts[j])) { allInt = false; break; } } if (allInt) { numericStart = i; break; } }
      if (numericStart < 0) continue;
      let teamIdx = -1;
      for (let i = numericStart - 1; i >= 0; i--) { const t = cellTexts[i]; if (!t) continue; if (/^\d+[.,]\d+$/.test(t)) continue; if (/^\d{1,2}$/.test(t)) continue; teamIdx = i; break; }
      if (teamIdx < 0) continue;
      let teamName = cellTexts[teamIdx];
      for (const noise of ['eval(', 'ntype(', 'function(', 'var ', 'document.']) { const idx = teamName.indexOf(noise); if (idx > 0) teamName = teamName.substring(0, idx).trim(); }
      teamName = teamName.replace(/[#\-\s]+$/, '').trim();
      if (!teamName || teamName.length < 2) continue;
      posCounter++;
      const nums = cellTexts.slice(numericStart, numericStart + 7).map(n => parseInt(n) || 0);
      standings.push({ posicion: posCounter, equipo: teamName, puntos: nums[0], pj: nums[1], pg: nums[2], pe: nums[3], pp: nums[4], gf: nums[5], gc: nums[6] });
    }
    if (standings.length > 0) return false;
  });
  return standings;
}

function parseScorers(html) {
  const $ = load(html);
  const scorers = [];
  $('table').each((_, table) => {
    const firstRowText = $(table).find('tr').first().find('td, th').map((__, c) => $(c).text().trim().toLowerCase()).get().join(' ');
    if (!firstRowText.includes('jugador')) return;
    let isHeader = true;
    $(table).find('tr').each((__, row) => {
      if (isHeader) { isHeader = false; return; }
      const cells = $(row).find('td');
      if (cells.length < 5) return;
      const t = cells.map((___, td) => $(td).text().trim()).get();
      if (t[0] && (parseInt(t[4]) || 0) > 0) scorers.push({ jugador: t[0], equipo: t[1], goles: parseInt(t[4]) || 0 });
    });
  });
  return scorers;
}

// ---- End helpers ----

function getCurrentSeason() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const cookies = await rffmLogin();
    const configs = await base44.asServiceRole.entities.StandingsConfig.list();
    const temporada = getCurrentSeason();
    const summary = { standings: [], results: [], scorers: [], errors: [] };

    for (const config of configs) {
      const cat = config.categoria;

      // --- STANDINGS ---
      if (config.rfef_url) {
        try {
          const p = extractParams(config.rfef_url);
          let html = await fetchPage(buildClassificationUrl(p), cookies);
          let standings = parseStandings(html);
          if (standings.length === 0) {
            const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
            const totalJ = detectTotalJornadas(j1Html);
            for (let tryJ = totalJ; tryJ >= 1 && standings.length === 0; tryJ--) {
              html = await fetchPage(buildClassificationUrl(p, tryJ), cookies);
              standings = parseStandings(html);
            }
          }
          if (standings.length) {
            const old = await base44.asServiceRole.entities.Clasificacion.filter({ categoria: cat, temporada });
            for (const o of old) await base44.asServiceRole.entities.Clasificacion.delete(o.id);
            const jornada = standings[0]?.pj || 0;
            const records = standings.map(s => ({
              temporada, categoria: cat, jornada,
              posicion: s.posicion, nombre_equipo: s.equipo,
              puntos: s.puntos, partidos_jugados: s.pj,
              ganados: s.pg, empatados: s.pe, perdidos: s.pp,
              goles_favor: s.gf, goles_contra: s.gc,
              fecha_actualizacion: new Date().toISOString(),
            }));
            await base44.asServiceRole.entities.Clasificacion.bulkCreate(records);
            summary.standings.push({ cat, teams: standings.length, jornada });
          }
        } catch (e) { summary.errors.push({ cat, type: 'standings', error: e.message }); }
      }

      // --- RESULTS (scan backwards from last jornada to find latest played) ---
      if (config.rfef_results_url || config.rfef_url) {
        try {
          const url = config.rfef_results_url || config.rfef_url;
          const p = extractParams(url);
          const firstHtml = await fetchPage(buildJornadaUrl(p, 1), cookies);
          const totalJornadas = detectTotalJornadas(firstHtml);
          
          // Scan backwards from the last jornada to find the latest one with played matches
          let latestJornada = null;
          let latestMatches = null;
          for (let j = totalJornadas; j >= 1; j--) {
            const html = j === 1 ? firstHtml : await fetchPage(buildJornadaUrl(p, j), cookies);
            const matches = parseJornadaMatches(html);
            if (matches.some(m => m.jugado)) {
              latestJornada = j;
              latestMatches = matches;
              break;
            }
          }
          
          if (latestJornada && latestMatches) {
            const existing = await base44.asServiceRole.entities.Resultado.filter({ categoria: cat, temporada, jornada: latestJornada });
            if (existing.length === 0) {
              const records = latestMatches.filter(m => m.jugado).map(m => ({
                temporada, categoria: cat, jornada: latestJornada,
                local: m.local, visitante: m.visitante,
                goles_local: m.goles_local, goles_visitante: m.goles_visitante,
                estado: 'finalizado', fecha_actualizacion: new Date().toISOString(),
              }));
              if (records.length) {
                await base44.asServiceRole.entities.Resultado.bulkCreate(records);
                summary.results.push({ cat, jornada: latestJornada, matches: records.length });
              }
            } else {
              summary.results.push({ cat, jornada: latestJornada, skipped: true });
            }
          }
        } catch (e) { summary.errors.push({ cat, type: 'results', error: e.message }); }
      }

      // --- SCORERS ---
      if (config.rfef_scorers_url) {
        try {
          const p = extractParams(config.rfef_scorers_url);
          const html = await fetchPage(buildScorersUrl(p), cookies);
          const scorers = parseScorers(html);
          if (scorers.length) {
            const old = await base44.asServiceRole.entities.Goleador.filter({ categoria: cat, temporada });
            for (const o of old) await base44.asServiceRole.entities.Goleador.delete(o.id);
            const records = scorers.map((s, i) => ({
              temporada, categoria: cat,
              jugador_nombre: s.jugador, equipo: s.equipo,
              goles: s.goles, posicion: i + 1,
              fecha_actualizacion: new Date().toISOString(),
            }));
            await base44.asServiceRole.entities.Goleador.bulkCreate(records);
            summary.scorers.push({ cat, players: scorers.length });
          }
        } catch (e) { summary.errors.push({ cat, type: 'scorers', error: e.message }); }
      }
    }

    return Response.json({ success: true, temporada, categories_checked: configs.length, summary, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});