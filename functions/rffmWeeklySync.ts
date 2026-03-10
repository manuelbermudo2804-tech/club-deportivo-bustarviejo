import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * RFFM Weekly Sync — runs Monday 8:00 AM
 * Accepts optional { categoria } param to sync only one category.
 * If no param, it syncs ALL categories sequentially (one login).
 * Self-contained: does its own RFFM login + scraping.
 */

// ---- RFFM helpers ----

async function rffmLogin() {
  const rffmUser = Deno.env.get('RFFM_USER');
  const rffmPass = Deno.env.get('RFFM_PASSWORD');
  if (!rffmUser || !rffmPass) throw new Error('RFFM credentials not configured');
  const baseResp = await fetch('https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion', {
    redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const cookieMap = {};
  const addCookies = (resp) => { for (const c of (resp.headers.getSetCookie?.() || [])) { const n = c.split(';')[0].split('=')[0].trim(); cookieMap[n] = c.split(';')[0]; } };
  addCookies(baseResp);
  const loginUrl = baseResp.headers.get('location') || 'https://intranet.ffmadrid.es/nfg/NLogin';
  const full = loginUrl.startsWith('http') ? loginUrl : `https://intranet.ffmadrid.es${loginUrl}`;
  const lpResp = await fetch(full, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; ') } });
  addCookies(lpResp);
  const lHtml = await lpResp.text();
  const $ = load(lHtml);
  let formAction = $('form').attr('action') || '/nfg/NLogin';
  if (!formAction.startsWith('http')) formAction = `https://intranet.ffmadrid.es${formAction}`;
  const hf = {};
  $('input[type="hidden"]').each((_, el) => { const n2 = $(el).attr('name'); if (n2) hf[n2] = $(el).attr('value') || ''; });
  const uf = $('input[type="text"]').attr('name') || 'NUser';
  const pf = $('input[type="password"]').attr('name') || 'NPass';
  const lResp = await fetch(formAction, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; '), 'Referer': full },
    body: new URLSearchParams({ ...hf, [uf]: rffmUser, [pf]: rffmPass }).toString()
  });
  addCookies(lResp);
  let rUrl = lResp.headers.get('location'); let maxR = 5;
  while (rUrl && maxR-- > 0) { const f2 = rUrl.startsWith('http') ? rUrl : `https://intranet.ffmadrid.es${rUrl}`; const r = await fetch(f2, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; ') } }); addCookies(r); rUrl = r.headers.get('location'); }
  return Object.values(cookieMap).join('; ');
}

async function fetchPage(url, cookies) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies } });
  // RFFM pages use ISO-8859-1 (Latin-1) encoding, not UTF-8
  // We must decode the raw bytes with the correct charset to preserve ñ, á, é, etc.
  const buf = await resp.arrayBuffer();
  // Try to detect charset from Content-Type header
  const ct = resp.headers.get('content-type') || '';
  const charsetMatch = ct.match(/charset=([^\s;]+)/i);
  const charset = charsetMatch ? charsetMatch[1] : 'iso-8859-1';
  return new TextDecoder(charset).decode(buf);
}

function extractParams(url) {
  const u = new URL(url);
  return { cod_primaria: u.searchParams.get('cod_primaria') || '1000128', CodCompeticion: u.searchParams.get('CodCompeticion') || u.searchParams.get('codcompeticion'), CodGrupo: u.searchParams.get('CodGrupo') || u.searchParams.get('codgrupo'), CodTemporada: u.searchParams.get('CodTemporada') || u.searchParams.get('codtemporada') };
}

function buildJornadaUrl(p, j) { return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}&CodJornada=${j}&cod_agrupacion=1&Sch_Tipo_Juego=`; }
function buildClassUrl(p, j) { let u = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=${p.cod_primaria}&codcompeticion=${p.CodCompeticion}&codgrupo=${p.CodGrupo}&codtemporada=${p.CodTemporada}`; if (j) u += `&codjornada=${j}`; return u; }
function buildScorersUrl(p) { return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${p.cod_primaria}&CodJornada=0&codcompeticion=${p.CodCompeticion}&codtemporada=${p.CodTemporada}&codgrupo=${p.CodGrupo}&cod_agrupacion=1`; }

function parseMatches(html) {
  const $ = load(html); const matches = []; const tables = $('table').toArray(); let campo = null;
  for (let i = 3; i < tables.length; i++) {
    const t = tables[i]; const th = $(t).html() || ''; const hasE = th.includes('escudo_clb') || th.includes('pimg/Clubes');
    if (!hasE) { const tx = $(t).text().replace(/\s+/g,' ').trim(); const cm = tx.match(/Campo:\s*(.+)/); if (cm) { let c = cm[1].trim().replace(/\s*\(H\.?A\.?\)\s*-\s*.*/i,'').replace(/\s*-\s*Hierba\s*.*/i,'').replace(/\s*-\s*Tierra\s*.*/i,'').replace(/\s*-\s*Cesped\s*.*/i,'').trim(); if (c) campo = c; } continue; }
    const tds = $(t).find('td').toArray(); if (tds.length < 3) continue;
    const loc = $(tds[0]).find('span').first().text().trim() || $(tds[0]).text().replace(/\s+/g,' ').trim();
    const vis = $(tds[2]).find('span').first().text().trim() || $(tds[2]).text().replace(/\s+/g,' ').trim();
    if (!loc || !vis) continue;
    const ct = $(tds[1]).text().replace(/\s+/g,' ').trim();
    let gl = null, gv = null, jug = false, fecha = null, hora = null;
    const dm = ct.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/); if (dm) fecha = dm[1].replace(/-/g,'/');
    const tm = ct.match(/(\d{1,2}:\d{2})/); if (tm) hora = tm[1];
    let noDate = ct; if (dm) noDate = noDate.replace(dm[0],''); if (tm) noDate = noDate.replace(tm[0],''); noDate = noDate.trim();
    const sm = noDate.match(/(\d+)\s*[-–]\s*(\d+)/); if (sm) { gl = parseInt(sm[1]); gv = parseInt(sm[2]); jug = true; }
    let mc = campo;
    if (tds.length > 3) { const ctx = $(tds[3]).text().replace(/\s+/g,' ').trim(); const cmm = ctx.match(/Campo:\s*(.+?)(?:\s*-\s*Hierba|\s*-\s*Tierra|\s*-\s*Cesped|$)/i); if (cmm) mc = cmm[1].replace(/\s*\(HA\)\s*$/i,'').replace(/\s*\(H\.A\.\)\s*$/i,'').trim(); else { const sc = ctx.match(/Campo:\s*(.+)/); if (sc) mc = sc[1].trim(); } }
    matches.push({ local: loc, visitante: vis, goles_local: gl, goles_visitante: gv, jugado: jug, fecha, hora, campo: mc });
  }
  return matches;
}

function detectTotal(html) { const $ = load(html); let mx = 0; $('select option').each((_, o) => { const n = parseInt($(o).attr('value')); if (!isNaN(n) && n > 0 && n < 100 && n > mx) mx = n; }); return mx || 30; }

function parseStandings(html) {
  const $ = load(html); const st = []; const cont = $('#CL_Resumen'); const scope = cont.length ? cont : $('body');
  scope.find('table').each((_, table) => {
    if (!$(table).text().includes('Puntos') || !$(table).text().includes('J.')) return;
    let pos = 0;
    for (const row of $(table).find('tr').toArray()) {
      const cells = $(row).find('td').toArray(); if (cells.length < 8) continue;
      const ct2 = cells.map(c => { const cl = $(c).clone(); cl.find('script,style').remove(); return cl.text().replace(/\s+/g,' ').trim(); });
      let ns = -1;
      for (let i = 0; i < ct2.length - 6; i++) { let ok = true; for (let j = i; j <= i+6; j++) { if (j >= ct2.length || !/^\d+$/.test(ct2[j])) { ok = false; break; } } if (ok) { ns = i; break; } }
      if (ns < 0) continue;
      let ti = -1;
      for (let i = ns-1; i >= 0; i--) { const t = ct2[i]; if (!t) continue; if (/^\d+[.,]\d+$/.test(t)) continue; if (/^\d{1,2}$/.test(t)) continue; ti = i; break; }
      if (ti < 0) continue;
      let tn = ct2[ti]; for (const noise of ['eval(','ntype(','function(','var ','document.']) { const idx = tn.indexOf(noise); if (idx > 0) tn = tn.substring(0,idx).trim(); }
      tn = tn.replace(/[#\-\s]+$/,'').trim(); if (!tn || tn.length < 2) continue;
      pos++; const nums = ct2.slice(ns, ns+7).map(n => parseInt(n)||0);
      st.push({ posicion: pos, equipo: tn, puntos: nums[0], pj: nums[1], pg: nums[2], pe: nums[3], pp: nums[4], gf: nums[5], gc: nums[6] });
    }
    if (st.length > 0) return false;
  });
  return st;
}

function parseScorers(html) {
  const $ = load(html);
  let rows = [];

  // ── APPROACH 1: Standard HTML table with "Goles"/"Jugador" headers ──
  $('table').each((_, table) => {
    const headers = $(table).find('th').map((__, th) => $(th).text().toLowerCase().trim()).get();
    const looksLike = headers.some(h => /gole(s|adores)/i.test(h)) || (headers.includes('jugador') && headers.some(h => h.includes('gol')));
    if (looksLike) {
      $(table).find('tbody tr, tr').each((__, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 3) return;
        const texts = tds.map((___, td) => $(td).text().trim()).get();
        const nums = texts.map(t => Number((t.match(/\d+/)?.[0]) || NaN));
        const goalsIdx = texts.findIndex(t => /^\d+$/.test(t));
        const goles = goalsIdx >= 0 ? Number(texts[goalsIdx]) : (nums.find(n => !Number.isNaN(n)) ?? null);
        if (goles !== null && goles > 0) {
          const jugador = texts[0] || '';
          const equipo = texts.find((t, i) => i > 0 && !/^\d+$/.test(t)) || '';
          if (jugador && equipo) rows.push({ jugador, equipo, goles });
        }
      });
    }
  });

  // ── APPROACH 2: RFFM multi-line format (same as PasteScorersForm/fetchRfefScorers) ──
  // The RFFM page often renders scorers as text blocks, not proper tables.
  // Pattern per scorer:
  //   APELLIDO, NOMBRE        (name - has comma)
  //   C.D. EQUIPO             (team - no comma, not a number)
  //   CADETE - INFANTIL...    (group/competition - skip)
  //   16                      (goals - bare number)
  //   (0P)                    (penalties - optional, skip)
  if (rows.length < 3) {
    const bodyText = $('body').text();
    const lines = bodyText.split(/\n|\r/).map(l => l.trim()).filter(Boolean);

    const isGoalsLine = (l) => /^\d{1,3}$/.test(l);
    const isPenaltyLine = (l) => /^\(\d+P\)$/i.test(l);
    const isNameLine = (l) => l.includes(',') && !isGoalsLine(l) && !isPenaltyLine(l) && l.length > 3 && l.length < 80;
    const isPositionLine = (l) => /^\d{1,3}º?\.?$/.test(l);

    const nameIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (isNameLine(lines[i])) nameIndices.push(i);
    }

    const parsedFromText = [];
    for (let k = 0; k < nameIndices.length; k++) {
      const ni = nameIndices[k];
      const nextNi = k + 1 < nameIndices.length ? nameIndices[k + 1] : Math.min(ni + 8, lines.length);
      const nombre = lines[ni];

      let equipo = "";
      let goles = 0;
      const blockLines = lines.slice(ni + 1, nextNi);

      let teamFound = false;
      for (const bl of blockLines) {
        if (isPositionLine(bl) || isPenaltyLine(bl)) continue;
        if (!teamFound && !isGoalsLine(bl)) {
          equipo = bl;
          teamFound = true;
          continue;
        }
        if (isGoalsLine(bl)) {
          goles = parseInt(bl, 10);
          break;
        }
      }

      if (nombre && equipo && goles > 0) {
        parsedFromText.push({ jugador: nombre.trim(), equipo: equipo.trim(), goles });
      }
    }

    if (parsedFromText.length > rows.length) {
      rows = parsedFromText;
    }
  }

  // ── APPROACH 3: Fallback regex for "NOMBRE - EQUIPO  GOLES" format ──
  if (rows.length === 0) {
    const lines = $('body').text().split(/\n|\r/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s\.'-]{3,})\s+-\s+([A-ZÁÉÍÓÚÜÑ0-9\s\.'-]{2,})\s+(\d{1,3})$/i);
      if (m) rows.push({ jugador: m[1].trim(), equipo: m[2].trim(), goles: Number(m[3]) });
    }
  }

  // Deduplicate by jugador+equipo
  const seen = new Set();
  return rows.filter(r => {
    const key = `${r.jugador}__${r.equipo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return r.jugador && r.equipo && Number.isFinite(r.goles);
  });
}

function getSeason() { const n = new Date(); const y = n.getFullYear(); return n.getMonth() >= 8 ? `${y}/${y+1}` : `${y-1}/${y}`; }

// ---- Helpers ----

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOnRateLimit(fn, label = '', maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const is429 = /rate limit|429/i.test(e.message || '');
      if (is429 && attempt < maxRetries) {
        const wait = 5000 + attempt * 5000; // 5s, 10s, 15s
        console.log(`[RATE-LIMIT] ${label}: waiting ${wait/1000}s before retry ${attempt+1}/${maxRetries}`);
        await sleep(wait);
      } else {
        throw e;
      }
    }
  }
}

async function batchDelete(entity, items) {
  // Delete in batches of 3 with generous pauses to avoid rate limits
  for (let i = 0; i < items.length; i += 3) {
    const batch = items.slice(i, i + 3);
    await retryOnRateLimit(
      () => Promise.all(batch.map(o => entity.delete(o.id))),
      `delete batch ${i}`
    );
    if (i + 3 < items.length) await sleep(1500);
  }
}

async function batchCreate(entity, records, label = '') {
  // bulkCreate in batches of 10 with pauses and retry
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    await retryOnRateLimit(
      () => entity.bulkCreate(batch),
      `${label} create batch ${i}`
    );
    if (i + 10 < records.length) await sleep(1500);
  }
}

/**
 * Retry wrapper: fetches + parses data, and retries up to maxRetries times
 * if the result count is suspiciously low (below minExpected).
 * Waits progressively longer between retries.
 */
async function fetchWithRetry(fetchFn, { minExpected = 5, maxRetries = 2, label = '' } = {}) {
  let lastResult = [];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`[RETRY] ${label}: attempt ${attempt + 1}/${maxRetries + 1} (got ${lastResult.length}, expected >= ${minExpected})`);
      await sleep(2000 + attempt * 1500); // 3.5s, 5s
    }
    lastResult = await fetchFn();
    if (lastResult.length >= minExpected) return lastResult;
  }
  console.log(`[RETRY] ${label}: returning ${lastResult.length} after ${maxRetries + 1} attempts (min was ${minExpected})`);
  return lastResult;
}

// ---- Main ----

async function syncCategory(config, cookies, base44, temporada) {
  const cat = config.categoria;
  const result = { cat, standings: null, results: null, scorers: null, errors: [] };

  // STANDINGS (with retry if too few teams)
  if (config.rfef_url) {
    try {
      const p = extractParams(config.rfef_url);
      const standings = await fetchWithRetry(async () => {
        let html = await fetchPage(buildClassUrl(p), cookies);
        let st = parseStandings(html);
        if (!st.length) {
          const j1 = await fetchPage(buildJornadaUrl(p, 1), cookies);
          const tot = detectTotal(j1);
          for (let j = tot; j >= 1 && !st.length; j--) { html = await fetchPage(buildClassUrl(p, j), cookies); st = parseStandings(html); }
        }
        return st;
      }, { minExpected: 5, maxRetries: 2, label: `Standings ${cat}` });
      if (standings.length) {
        const old = await retryOnRateLimit(
          () => base44.asServiceRole.entities.Clasificacion.filter({ categoria: cat, temporada }),
          `Standings old ${cat}`
        );
        if (old.length) await batchDelete(base44.asServiceRole.entities.Clasificacion, old);
        await sleep(2000);
        const jornada = standings[0]?.pj || 0;
        const records = standings.map(s => ({
          temporada, categoria: cat, jornada, posicion: s.posicion, nombre_equipo: s.equipo,
          puntos: s.puntos, partidos_jugados: s.pj, ganados: s.pg, empatados: s.pe, perdidos: s.pp,
          goles_favor: s.gf, goles_contra: s.gc, fecha_actualizacion: new Date().toISOString(),
        }));
        await batchCreate(base44.asServiceRole.entities.Clasificacion, records, `Standings ${cat}`);
        result.standings = { teams: standings.length, jornada };
      }
    } catch (e) { result.errors.push({ type: 'standings', error: e.message }); }
  }

  // RESULTS - only latest jornada (scan backwards, max 10 pages)
  if (config.rfef_results_url || config.rfef_url) {
    try {
      const url = config.rfef_results_url || config.rfef_url;
      const p = extractParams(url);
      const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
      const total = detectTotal(j1Html);
      let latestJ = null, latestM = null;
      for (let j = total; j >= Math.max(1, total - 10); j--) {
        const html = j === 1 ? j1Html : await fetchPage(buildJornadaUrl(p, j), cookies);
        const matches = parseMatches(html);
        if (matches.some(m => m.jugado)) { latestJ = j; latestM = matches; break; }
      }
      if (latestJ && latestM) {
        const existing = await retryOnRateLimit(
          () => base44.asServiceRole.entities.Resultado.filter({ categoria: cat, temporada, jornada: latestJ }),
          `Results filter ${cat}`
        );
        if (!existing.length) {
          const records = latestM.filter(m => m.jugado).map(m => ({
            temporada, categoria: cat, jornada: latestJ, local: m.local, visitante: m.visitante,
            goles_local: m.goles_local, goles_visitante: m.goles_visitante,
            estado: 'finalizado', fecha_actualizacion: new Date().toISOString(),
            ...(m.acta_url ? { acta_url: m.acta_url } : {}),
          }));
          if (records.length) {
            await retryOnRateLimit(
              () => base44.asServiceRole.entities.Resultado.bulkCreate(records),
              `Results create ${cat}`
            );
            result.results = { jornada: latestJ, matches: records.length };
          }

          // AUTO-GENERATE MatchObservation for Bustarviejo matches
          try {
            const bustMatch = latestM.find(m => m.jugado && (/bustarviejo/i.test(m.local) || /bustarviejo/i.test(m.visitante)));
            if (bustMatch) {
              const isLocal = /bustarviejo/i.test(bustMatch.local);
              const rival = isLocal ? bustMatch.visitante : bustMatch.local;
              const gf = isLocal ? bustMatch.goles_local : bustMatch.goles_visitante;
              const gc = isLocal ? bustMatch.goles_visitante : bustMatch.goles_local;
              const tipo = gf > gc ? 'Victoria' : gf === gc ? 'Empate' : 'Derrota';
              const emoji = tipo === 'Victoria' ? '✅' : tipo === 'Empate' ? '🤝' : '❌';

              // Check if observation already exists for this jornada+category
              const existingObs = await retryOnRateLimit(
                () => base44.asServiceRole.entities.MatchObservation.filter({ categoria: cat, temporada, jornada: latestJ }),
                `MatchObs filter ${cat}`
              );
              if (!existingObs.length) {
                await base44.asServiceRole.entities.MatchObservation.create({
                  categoria: cat,
                  rival,
                  fecha_partido: bustMatch.fecha ? bustMatch.fecha.split('/').reverse().join('-') : new Date().toISOString().split('T')[0],
                  resultado: `${bustMatch.goles_local}-${bustMatch.goles_visitante} (${tipo})`,
                  temporada,
                  jornada: latestJ,
                  auto_generada: true,
                  local_visitante: isLocal ? 'Local' : 'Visitante',
                  goles_favor: gf,
                  goles_contra: gc,
                  resultado_tipo: tipo,
                  campo: bustMatch.campo || '',
                  completada_por_entrenador: false,
                  email_enviado: false,
                  entrenador_email: '',
                  entrenador_nombre: '',
                });
                result.autoObservation = { rival, resultado: `${gf}-${gc}`, tipo };

                // Find coach for this category and send email
                try {
                  await sleep(2000);
                  const users = await retryOnRateLimit(
                    () => base44.asServiceRole.entities.User.list(),
                    `Users for coach email ${cat}`
                  );
                  const coaches = users.filter(u => u.es_entrenador && (u.categorias_entrenador || []).some(c => c === cat));
                  for (const coach of coaches) {
                    if (!coach.email) continue;
                    const appUrl = 'https://app.base44.com'; // Will be replaced by actual app URL
                    const emailBody = `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(to right, #ea580c, #c2410c); padding: 20px; border-radius: 12px 12px 0 0;">
                          <h2 style="color: white; margin: 0;">⚽ Ficha de partido generada</h2>
                          <p style="color: #fed7aa; margin: 4px 0 0;">${cat} — Jornada ${latestJ}</p>
                        </div>
                        <div style="background: #fff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                          <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 16px;">
                            <p style="font-size: 28px; margin: 0;">${emoji}</p>
                            <p style="font-size: 24px; font-weight: bold; margin: 4px 0;">CD Bustarviejo ${gf} - ${gc} ${rival}</p>
                            <p style="color: #64748b; margin: 4px 0;">${tipo} · ${isLocal ? 'Local' : 'Visitante'}${bustMatch.campo ? ' · ' + bustMatch.campo : ''}</p>
                          </div>
                          <p style="color: #334155;">Hola ${coach.full_name || 'Entrenador'},</p>
                          <p style="color: #334155;">Ya hemos registrado automáticamente la ficha del partido de <strong>${cat}</strong> contra <strong>${rival}</strong>.</p>
                          <p style="color: #334155;">Si quieres, puedes <strong>añadir tus observaciones</strong> (valoración táctica, estado físico, qué mejorar...). Solo te llevará 30 segundos:</p>
                          <div style="text-align: center; margin: 24px 0;">
                            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(to right, #ea580c, #c2410c); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
                              📋 Completar ficha del partido
                            </a>
                          </div>
                          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Si no añades nada, la ficha se guarda con los datos oficiales de la RFFM. ¡No es obligatorio!</p>
                        </div>
                      </div>`;
                    await base44.asServiceRole.integrations.Core.SendEmail({
                      to: coach.email,
                      subject: `${emoji} Ficha de partido: ${gf}-${gc} vs ${rival} (${cat})`,
                      body: emailBody,
                      from_name: 'CD Bustarviejo',
                    });
                    // Update observation with coach info
                    const obs = await base44.asServiceRole.entities.MatchObservation.filter({ categoria: cat, temporada, jornada: latestJ });
                    if (obs[0]) await base44.asServiceRole.entities.MatchObservation.update(obs[0].id, { entrenador_email: coach.email, entrenador_nombre: coach.full_name || '', email_enviado: true });
                  }
                } catch (coachErr) { console.error('Error sending coach email:', coachErr.message); }
              }
            }
          } catch (obsErr) { console.error('Error auto-generating observation:', obsErr.message); }

        } else { result.results = { jornada: latestJ, skipped: true }; }
      }
    } catch (e) { result.errors.push({ type: 'results', error: e.message }); }
  }

  // SCORERS (with retry if too few scorers)
  if (config.rfef_scorers_url) {
    try {
      const scorers = await fetchWithRetry(async () => {
        const html = await fetchPage(config.rfef_scorers_url, cookies);
        return parseScorers(html);
      }, { minExpected: 5, maxRetries: 2, label: `Scorers ${cat}` });
      console.log(`[SCORERS] ${cat}: parsed ${scorers.length} scorers (after retry logic)`);
      if (scorers.length) {
        const old = await retryOnRateLimit(
          () => base44.asServiceRole.entities.Goleador.filter({ categoria: cat, temporada }),
          `Scorers old ${cat}`
        );
        if (old.length) await batchDelete(base44.asServiceRole.entities.Goleador, old);
        await sleep(3000);
        const records = scorers.map((s, i) => ({
          temporada, categoria: cat, jugador_nombre: s.jugador, equipo: s.equipo,
          goles: s.goles, posicion: i + 1, fecha_actualizacion: new Date().toISOString(),
        }));
        await batchCreate(base44.asServiceRole.entities.Goleador, records, `Scorers ${cat}`);
        result.scorers = { players: scorers.length };
      }
    } catch (e) { result.errors.push({ type: 'scorers', error: e.message }); }
  }

  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const targetCat = body?.categoria;

    const cookies = await rffmLogin();
    const allConfigs = await base44.asServiceRole.entities.StandingsConfig.list();
    const configs = targetCat ? allConfigs.filter(c => c.categoria === targetCat) : allConfigs;
    const temporada = getSeason();
    const results = [];

    for (let ci = 0; ci < configs.length; ci++) {
      const config = configs[ci];
      if (!config.rfef_url && !config.rfef_results_url && !config.rfef_scorers_url) continue;
      if (ci > 0) await sleep(6000); // Pause between categories to avoid rate limits
      const r = await syncCategory(config, cookies, base44, temporada);
      results.push(r);
    }

    // Build weekly summary for admin
    const summaryLines = [];
    let totalErrors = 0;
    const bustResults = [];

    for (const r of results) {
      const parts = [];
      if (r.standings) parts.push(`Clasificación (J${r.standings.jornada}, ${r.standings.teams} equipos)`);
      if (r.results && !r.results.skipped) parts.push(`Jornada ${r.results.jornada}: ${r.results.matches} resultados`);
      if (r.results?.skipped) parts.push(`Jornada ${r.results.jornada}: ya importada`);
      if (r.scorers) parts.push(`${r.scorers.players} goleadores`);
      if (r.errors.length) { parts.push(`⚠️ ${r.errors.length} error(es)`); totalErrors += r.errors.length; }
      if (parts.length) summaryLines.push(`• ${r.cat}: ${parts.join(' | ')}`);

      // Check Bustarviejo results this week
      if (r.results && !r.results.skipped) {
        try {
          const recs = await base44.asServiceRole.entities.Resultado.filter({ categoria: r.cat, temporada, jornada: r.results.jornada });
          const bust = recs.find(m => m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO'));
          if (bust) {
            const isLocal = bust.local?.toUpperCase().includes('BUSTARVIEJO');
            const rival = isLocal ? bust.visitante : bust.local;
            const won = isLocal ? bust.goles_local > bust.goles_visitante : bust.goles_visitante > bust.goles_local;
            const draw = bust.goles_local === bust.goles_visitante;
            const emoji = won ? '✅' : draw ? '🤝' : '❌';
            bustResults.push(`${emoji} ${r.cat}: ${bust.goles_local}-${bust.goles_visitante} vs ${rival}`);
          }
        } catch {}
      }
    }

    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    let resumen = `📊 *Resumen semanal RFFM — ${fecha}*\n\n`;
    resumen += `✅ Sincronizadas ${results.length} categorías\n`;
    if (summaryLines.length) resumen += summaryLines.join('\n') + '\n';
    if (totalErrors) resumen += `\n⚠️ Errores totales: ${totalErrors}\n`;
    if (bustResults.length) resumen += `\n🏆 *Bustarviejo esta semana:*\n${bustResults.join('\n')}\n`;

    // Send summary email to admin
    try {
      await sleep(3000); // Wait before sending emails to avoid rate limits
      const admins = await retryOnRateLimit(
        () => base44.asServiceRole.entities.User.filter({ role: 'admin' }),
        'Admin list for email'
      );
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #ea580c, #15803d); padding: 20px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0;">📊 Resumen semanal RFFM</h2>
            <p style="color: #fed7aa; margin: 4px 0 0;">${fecha}</p>
          </div>
          <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <p><strong>${results.length} categorías sincronizadas</strong></p>
            <ul style="padding-left: 20px;">${summaryLines.map(l => `<li>${l.replace('• ', '')}</li>`).join('')}</ul>
            ${totalErrors ? `<div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin: 12px 0;">
              <strong>⚠️ ${totalErrors} error(es) detectados</strong>
              <ul style="margin: 8px 0 0; padding-left: 16px; font-size: 13px; color: #991b1b;">
                ${results.filter(r => r.errors.length > 0).map(r => r.errors.map(e => `<li>${r.cat} → ${e.type}: ${e.error}</li>`).join('')).join('')}
              </ul>
            </div>` : ''}
            ${bustResults.length ? `<h3>🏆 Bustarviejo esta semana</h3><ul>${bustResults.map(r2 => `<li>${r2}</li>`).join('')}</ul>` : ''}
          </div>
        </div>`;
      for (const admin of admins) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `📊 Resumen RFFM semanal — ${fecha}`,
          body: emailBody,
          from_name: 'CD Bustarviejo',
        });
      }
    } catch (emailErr) { console.error('Error sending summary email:', emailErr.message); }

    return Response.json({ success: true, temporada, synced: results, summary: resumen, timestamp: new Date().toISOString() });
  } catch (error) {
    // Alert admin on failure
    try {
      const base44Err = createClientFromRequest(req);
      const admins = await base44Err.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44Err.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: '🚨 Error en sincronización RFFM semanal',
          body: `<div style="font-family: Arial; max-width: 600px;"><div style="background: #dc2626; padding: 16px; border-radius: 12px 12px 0 0;"><h2 style="color: white; margin: 0;">🚨 Fallo en rffmWeeklySync</h2></div><div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;"><p>La sincronización semanal ha fallado:</p><pre style="background: #f1f5f9; padding: 12px; border-radius: 8px; overflow-x: auto;">${error.message}</pre><p style="color: #64748b; font-size: 12px;">Fecha: ${new Date().toISOString()}</p></div></div>`,
          from_name: 'CD Bustarviejo',
        });
      }
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});