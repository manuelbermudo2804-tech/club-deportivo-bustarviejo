import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { load } from 'npm:cheerio@1.0.0';

// Helper: send email via Resend (no integration credits)
async function sendViaResend(to, subject, html) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.error('[RFFM] RESEND_API_KEY not set'); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'noreply@cdbustarviejo.com', to: [to], subject, html })
  });
  if (!resp.ok) console.error(`[RFFM] Resend error ${resp.status}:`, await resp.text().catch(() => ''));
}

/**
 * RFFM Weekly Sync
 * Accepts optional { categoria } param to sync only one category.
 * If no param, syncs ALL categories sequentially.
 * 
 * ANTI-RATE-LIMIT: processes one category at a time with pauses between
 * each data type (standings → results → scorers) and between categories.
 * Re-authenticates if session expires mid-run.
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
  const buf = await resp.arrayBuffer();
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
  const scorers = [];

  // PRIMARY: Find the RFFM table with "Jugador" header (standard authenticated RFFM page)
  // Structure: Jugador | Equipo | Grupo | Partidos Jugados | Goles | Goles partido
  $('table').each((_, table) => {
    if (scorers.length > 0) return; // already found a good table
    
    // Check if first row contains "Jugador" header (th or td)
    const firstRow = $(table).find('tr').first();
    const headerCells = firstRow.find('td, th').map((__, c) => $(c).text().trim().toLowerCase()).get();
    const hasJugadorHeader = headerCells.some(h => h.includes('jugador'));
    const hasGolesHeader = headerCells.some(h => h.includes('gol'));
    if (!hasJugadorHeader || !hasGolesHeader) return;

    // Find column indices from headers
    const jugadorIdx = headerCells.findIndex(h => h.includes('jugador'));
    const equipoIdx = headerCells.findIndex(h => h.includes('equipo'));
    const golesIdx = headerCells.findIndex(h => /^goles$/.test(h));
    // If no exact "goles" found, try partial match but exclude "goles partido"
    const golesColIdx = golesIdx >= 0 ? golesIdx : headerCells.findIndex(h => h.includes('gol') && !h.includes('partido'));
    
    console.log(`[SCORERS-PARSER] Found table: jugadorIdx=${jugadorIdx}, equipoIdx=${equipoIdx}, golesIdx=${golesColIdx}, headers=${headerCells.length}`);

    let isHeader = true;
    $(table).find('tr').each((__, row) => {
      if (isHeader) { isHeader = false; return; } // Skip header row
      
      const cells = $(row).find('td');
      if (cells.length < 5) return;
      
      const texts = cells.map((___, td) => $(td).text().trim()).get();
      
      // Use identified column indices, with fallback to fixed positions
      const jugador = texts[jugadorIdx >= 0 ? jugadorIdx : 0] || '';
      const equipo = texts[equipoIdx >= 0 ? equipoIdx : 1] || '';
      const golesText = texts[golesColIdx >= 0 ? golesColIdx : 4] || '0';
      const goles = parseInt(golesText) || 0;
      
      if (jugador && equipo && goles > 0) {
        scorers.push({ jugador, equipo, goles });
      }
    });
  });

  console.log(`[SCORERS-PARSER] parsed=${scorers.length}`);

  // Deduplicate
  const seen = new Set();
  return scorers.filter(r => {
    const key = `${r.jugador}__${r.equipo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSeason() { const n = new Date(); const y = n.getFullYear(); return n.getMonth() >= 8 ? `${y}/${y+1}` : `${y-1}/${y}`; }

// ---- Helpers (ANTI-RATE-LIMIT: generous pauses) ----

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOnRateLimit(fn, label = '', maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (e) {
      if (/rate limit|429|503|502|timeout/i.test(e.message || '') && attempt < maxRetries) {
        const wait = 3000 + attempt * 5000; // 3s, 8s, 13s
        console.log(`[RATE-LIMIT] ${label}: waiting ${wait/1000}s (retry ${attempt+1}/${maxRetries})`);
        await sleep(wait);
      } else { throw e; }
    }
  }
}

async function batchDelete(entity, items) {
  // Safety: ensure items is an array
  const arr = Array.isArray(items) ? items : (items?.results || items?.items || []);
  if (!arr.length) return;
  // Smaller batches (4) with longer pauses (1.5s) to avoid Base44 rate limits
  for (let i = 0; i < arr.length; i += 4) {
    const batch = arr.slice(i, i + 4);
    await retryOnRateLimit(() => Promise.all(batch.map(o => entity.delete(o.id))), `del ${i}`);
    if (i + 4 < arr.length) await sleep(1500);
  }
}

async function batchCreate(entity, records, label = '') {
  // Smaller batches (10) with longer pauses (1.5s) to avoid Base44 rate limits
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    await retryOnRateLimit(() => entity.bulkCreate(batch), `${label} ${i}`);
    if (i + 10 < records.length) await sleep(1500);
  }
}

// ---- Sync one category ----
// Returns { ...result, cookies } so the caller can use refreshed cookies

async function syncCategory(config, cookies, base44, temporada) {
  const cat = config.categoria;
  const t0 = Date.now();
  const result = { cat, standings: null, results: null, scorers: null, errors: [], cookies };

  // Helper: fetch page with session-expiry detection and auto-relogin
  async function safeFetch(url) {
    let html = await fetchPage(url, result.cookies);
    // Detect session expiry (RFFM redirects to login page)
    if (html.includes('Datos de Acceso') && html.includes('NLogin')) {
      console.log(`[RFFM] Session expired during ${cat}, re-logging in...`);
      result.cookies = await rffmLogin();
      await sleep(2000);
      html = await fetchPage(url, result.cookies);
    }
    return html;
  }

  // --- STANDINGS ---
  if (config.rfef_url) {
    try {
      const p = extractParams(config.rfef_url);
      let html = await safeFetch(buildClassUrl(p));
      let standings = parseStandings(html);
      if (!standings.length) {
        const j1 = await safeFetch(buildJornadaUrl(p, 1));
        const tot = detectTotal(j1);
        for (let j = tot; j >= Math.max(1, tot - 3) && !standings.length; j--) {
          html = await safeFetch(buildClassUrl(p, j));
          standings = parseStandings(html);
          await sleep(500); // small pause between jornada attempts
        }
      }
      if (standings.length) {
        const old = await retryOnRateLimit(() => base44.asServiceRole.entities.Clasificacion.filter({ categoria: cat, temporada }));
        if (old.length) await batchDelete(base44.asServiceRole.entities.Clasificacion, old);
        const jornada = standings[0]?.pj || 0;
        const records = standings.map(s => ({
          temporada, categoria: cat, jornada, posicion: s.posicion, nombre_equipo: s.equipo,
          puntos: s.puntos, partidos_jugados: s.pj, ganados: s.pg, empatados: s.pe, perdidos: s.pp,
          goles_favor: s.gf, goles_contra: s.gc, fecha_actualizacion: new Date().toISOString(),
        }));
        await batchCreate(base44.asServiceRole.entities.Clasificacion, records, `St ${cat}`);
        result.standings = { teams: standings.length, jornada };
      }
    } catch (e) { result.errors.push({ type: 'standings', error: e.message }); }
  }

  // Pause between data types to avoid rate limiting
  await sleep(2000);

  // --- RESULTS (latest jornada, scan backwards max 5) ---
  if (config.rfef_results_url || config.rfef_url) {
    try {
      const url = config.rfef_results_url || config.rfef_url;
      const p = extractParams(url);
      const j1Html = await safeFetch(buildJornadaUrl(p, 1));
      const total = detectTotal(j1Html);
      let latestJ = null, latestM = null;
      for (let j = total; j >= Math.max(1, total - 5); j--) {
        const html = j === 1 ? j1Html : await safeFetch(buildJornadaUrl(p, j));
        const matches = parseMatches(html);
        if (matches.some(m => m.jugado)) { latestJ = j; latestM = matches; break; }
        await sleep(500); // small pause between jornada scans
      }
      if (latestJ && latestM) {
        const existing = await retryOnRateLimit(() => base44.asServiceRole.entities.Resultado.filter({ categoria: cat, temporada, jornada: latestJ }));
        
        // Normalize team name for matching
        const norm = (s) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');
        
        if (existing.length) {
          // UPDATE existing records (pendiente → finalizado) instead of creating duplicates
          let updated = 0;
          for (const m of latestM.filter(m2 => m2.jugado)) {
            const match = existing.find(e => 
              norm(e.local) === norm(m.local) && norm(e.visitante) === norm(m.visitante)
            );
            if (match && match.estado !== 'finalizado') {
              await retryOnRateLimit(() => base44.asServiceRole.entities.Resultado.update(match.id, {
                goles_local: m.goles_local, goles_visitante: m.goles_visitante,
                estado: 'finalizado', fecha_actualizacion: new Date().toISOString(),
                ...(m.fecha ? { fecha_partido: m.fecha } : {}),
                ...(m.hora ? { hora_partido: m.hora } : {}),
                ...(m.campo ? { campo: m.campo } : {}),
              }));
              updated++;
              await sleep(500);
            }
          }
          result.results = updated > 0 
            ? { jornada: latestJ, updated, matches: updated } 
            : { jornada: latestJ, skipped: true };
        } else {
          // No existing records for this jornada — create new ones
          const records = latestM.filter(m => m.jugado).map(m => ({
            temporada, categoria: cat, jornada: latestJ, local: m.local, visitante: m.visitante,
            goles_local: m.goles_local, goles_visitante: m.goles_visitante,
            estado: 'finalizado', fecha_actualizacion: new Date().toISOString(),
            ...(m.fecha ? { fecha_partido: m.fecha } : {}),
            ...(m.hora ? { hora_partido: m.hora } : {}),
            ...(m.campo ? { campo: m.campo } : {}),
          }));
          if (records.length) {
            await retryOnRateLimit(() => base44.asServiceRole.entities.Resultado.bulkCreate(records));
            result.results = { jornada: latestJ, matches: records.length };
          }
        }

          // Auto-generate MatchObservation for Bustarviejo
          try {
            const bustMatch = latestM.find(m => m.jugado && (/bustarviejo/i.test(m.local) || /bustarviejo/i.test(m.visitante)));
            if (bustMatch) {
              const isLocal = /bustarviejo/i.test(bustMatch.local);
              const rival = isLocal ? bustMatch.visitante : bustMatch.local;
              const gf = isLocal ? bustMatch.goles_local : bustMatch.goles_visitante;
              const gc = isLocal ? bustMatch.goles_visitante : bustMatch.goles_local;
              const tipo = gf > gc ? 'Victoria' : gf === gc ? 'Empate' : 'Derrota';
              const emoji = tipo === 'Victoria' ? '\u2705' : tipo === 'Empate' ? '\ud83e\udd1d' : '\u274c';
              const existingObs = await retryOnRateLimit(() => base44.asServiceRole.entities.MatchObservation.filter({ categoria: cat, temporada, jornada: latestJ }));
              if (!existingObs.length) {
                await base44.asServiceRole.entities.MatchObservation.create({
                  categoria: cat, rival,
                  fecha_partido: bustMatch.fecha ? bustMatch.fecha.split('/').reverse().join('-') : new Date().toISOString().split('T')[0],
                  resultado: `${bustMatch.goles_local}-${bustMatch.goles_visitante} (${tipo})`,
                  temporada, jornada: latestJ, auto_generada: true,
                  local_visitante: isLocal ? 'Local' : 'Visitante',
                  goles_favor: gf, goles_contra: gc, resultado_tipo: tipo,
                  campo: bustMatch.campo || '', completada_por_entrenador: false,
                  email_enviado: false, entrenador_email: '', entrenador_nombre: '',
                });
                result.autoObservation = { rival, resultado: `${gf}-${gc}`, tipo };
                try {
                  const users = await retryOnRateLimit(() => base44.asServiceRole.entities.User.list());
                  const coaches = users.filter(u => u.es_entrenador && (u.categorias_entrenador || []).some(c => c === cat));
                  for (const coach of coaches) {
                    if (!coach.email) continue;
                    await sendViaResend(coach.email, `${emoji} Ficha de partido: ${gf}-${gc} vs ${rival} (${cat})`, `<div style="font-family:Arial;max-width:600px;margin:0 auto"><div style="background:linear-gradient(to right,#ea580c,#c2410c);padding:20px;border-radius:12px 12px 0 0"><h2 style="color:white;margin:0">\u26bd Ficha de partido</h2><p style="color:#fed7aa;margin:4px 0">${cat} \u2014 J${latestJ}</p></div><div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px"><p style="font-size:24px;font-weight:bold;text-align:center">${emoji} CD Bustarviejo ${gf} - ${gc} ${rival}</p><p>Hola ${coach.full_name||'Entrenador'}, ya est\u00e1 la ficha del partido. Puedes a\u00f1adir tus observaciones desde la app.</p></div></div>`);
                    const obs = await base44.asServiceRole.entities.MatchObservation.filter({ categoria: cat, temporada, jornada: latestJ });
                    if (obs[0]) await base44.asServiceRole.entities.MatchObservation.update(obs[0].id, { entrenador_email: coach.email, entrenador_nombre: coach.full_name || '', email_enviado: true });
                  }
                } catch (ce) { console.error(`Coach email error (${cat}):`, ce.message); }
              }
            }
          } catch (oe) { console.error(`Observation error (${cat}):`, oe.message); }
      }
    } catch (e) { result.errors.push({ type: 'results', error: e.message }); }
  }

  // Pause between data types
  await sleep(2000);

  // --- SCORERS (with retry — most fragile data type) ---
  if (config.rfef_scorers_url) {
    let scorerAttempts = 0;
    const maxScorerAttempts = 3;
    while (scorerAttempts < maxScorerAttempts && !result.scorers) {
      scorerAttempts++;
      try {
        if (scorerAttempts > 1) {
          const retryWait = 3000 + (scorerAttempts - 1) * 4000;
          console.log(`[SCORERS] ${cat}: retry ${scorerAttempts}/${maxScorerAttempts} after ${retryWait/1000}s...`);
          await sleep(retryWait);
        }
        const html = await safeFetch(config.rfef_scorers_url);
        // Verify we got actual data, not an error page
        if (html.length < 500 || (html.includes('Datos de Acceso') && html.includes('NLogin'))) {
          console.log(`[SCORERS] ${cat}: got login/empty page (attempt ${scorerAttempts})`);
          // Force re-login for next attempt
          result.cookies = await rffmLogin();
          await sleep(2000);
          continue;
        }
        const scorers = parseScorers(html);
        console.log(`[SCORERS] ${cat}: ${scorers.length} scorers (attempt ${scorerAttempts})`);
        if (scorers.length) {
          const old = await retryOnRateLimit(() => base44.asServiceRole.entities.Goleador.filter({ categoria: cat, temporada }));
          if (old.length) await batchDelete(base44.asServiceRole.entities.Goleador, old);
          const records = scorers.map((s, i) => ({
            temporada, categoria: cat, jugador_nombre: s.jugador, equipo: s.equipo,
            goles: s.goles, posicion: i + 1, fecha_actualizacion: new Date().toISOString(),
          }));
          await batchCreate(base44.asServiceRole.entities.Goleador, records, `Sc ${cat}`);
          result.scorers = { players: scorers.length };
        } else {
          // 0 scorers could mean bad page — retry
          console.log(`[SCORERS] ${cat}: 0 scorers, may retry...`);
        }
      } catch (e) {
        console.error(`[SCORERS] ${cat}: error attempt ${scorerAttempts}:`, e.message);
        if (scorerAttempts >= maxScorerAttempts) {
          result.errors.push({ type: 'scorers', error: e.message });
        }
      }
    }
  }

  console.log(`[SYNC] ${cat}: ${((Date.now()-t0)/1000).toFixed(1)}s — st:${result.standings?'ok':'skip'} res:${result.results?'ok':'skip'} sc:${result.scorers?'ok':'skip'} err:${result.errors.length}`);
  return result;
}

// Re-export cookies from a sync result so next category uses fresh session
function getLatestCookies(syncResult, fallback) {
  return syncResult?.cookies || fallback;
}

// ---- Main handler ----

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const targetCat = body?.categoria;

    console.log(`[RFFM] Starting sync${targetCat ? ` for ${targetCat}` : ' (all)'}...`);
    const t0 = Date.now();

    const cookies = await rffmLogin();
    console.log(`[RFFM] Login OK (${((Date.now()-t0)/1000).toFixed(1)}s)`);

    const allConfigs = await base44.asServiceRole.entities.StandingsConfig.list();
    const configs = targetCat
      ? allConfigs.filter(c => c.categoria === targetCat)
      : allConfigs.filter(c => c.rfef_url || c.rfef_results_url || c.rfef_scorers_url);
    const temporada = getSeason();
    const results = [];

    console.log(`[RFFM] ${configs.length} categories to sync`);

    let currentCookies = cookies;
    for (let ci = 0; ci < configs.length; ci++) {
      if (ci > 0) {
        // Generous pause between categories (4s) to avoid RFFM rate limiting
        const pauseMs = 4000;
        console.log(`[RFFM] Pausing ${pauseMs/1000}s before category ${ci+1}/${configs.length}...`);
        await sleep(pauseMs);
      }
      const r = await syncCategory(configs[ci], currentCookies, base44, temporada);
      // Use refreshed cookies if the category had to re-login
      currentCookies = getLatestCookies(r, currentCookies);
      results.push(r);
    }

    // Build summary
    const summaryLines = [];
    let totalErrors = 0;
    const bustResults = [];

    for (const r of results) {
      const parts = [];
      if (r.standings) parts.push(`Clasificación (J${r.standings.jornada}, ${r.standings.teams} eq)`);
      if (r.results && !r.results.skipped) parts.push(`J${r.results.jornada}: ${r.results.matches} resultados`);
      if (r.results?.skipped) parts.push(`J${r.results.jornada}: ya importada`);
      if (r.scorers) parts.push(`${r.scorers.players} goleadores`);
      if (r.errors?.length) { parts.push(`⚠️ ${r.errors.length} error(es)`); totalErrors += r.errors.length; }
      if (parts.length) summaryLines.push(`• ${r.cat}: ${parts.join(' | ')}`);

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

    const elapsed = ((Date.now()-t0)/1000).toFixed(1);
    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    let resumen = `📊 *Resumen RFFM — ${fecha}*\n✅ ${results.length} categorías en ${elapsed}s\n`;
    if (summaryLines.length) resumen += summaryLines.join('\n') + '\n';
    if (totalErrors) resumen += `\n⚠️ Errores: ${totalErrors}\n`;
    if (bustResults.length) resumen += `\n🏆 *Bustarviejo:*\n${bustResults.join('\n')}\n`;

    // Send summary email
    try {
      const admins = await retryOnRateLimit(() => base44.asServiceRole.entities.User.filter({ role: 'admin' }));
      const emailBody = `<div style="font-family:Arial;max-width:600px;margin:0 auto"><div style="background:linear-gradient(to right,#ea580c,#15803d);padding:20px;border-radius:12px 12px 0 0"><h2 style="color:white;margin:0">📊 Resumen RFFM</h2><p style="color:#fed7aa;margin:4px 0">${fecha} · ${elapsed}s</p></div><div style="background:#fff;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px"><p><strong>${results.length} categorías sincronizadas</strong></p><ul style="padding-left:20px">${summaryLines.map(l => `<li>${l.replace('• ', '')}</li>`).join('')}</ul>${totalErrors ? `<div style="background:#fef2f2;border:1px solid #ef4444;border-radius:8px;padding:12px;margin:12px 0"><strong>⚠️ ${totalErrors} error(es)</strong><ul style="margin:8px 0 0;padding-left:16px;font-size:13px;color:#991b1b">${results.filter(r => r.errors?.length).map(r => r.errors.map(e => `<li>${r.cat} → ${e.type}: ${e.error}</li>`).join('')).join('')}</ul></div>` : ''}${bustResults.length ? `<h3>🏆 Bustarviejo</h3><ul>${bustResults.map(r2 => `<li>${r2}</li>`).join('')}</ul>` : ''}</div></div>`;
      for (const admin of admins) {
        await sendViaResend(admin.email, `📊 Resumen RFFM — ${fecha}`, emailBody);
      }
    } catch (emailErr) { console.error('Summary email error:', emailErr.message); }

    console.log(`[RFFM] Complete: ${results.length} cats, ${totalErrors} errors, ${elapsed}s`);
    return Response.json({ success: true, temporada, synced: results, summary: resumen, timestamp: new Date().toISOString(), elapsed: `${elapsed}s` });
  } catch (error) {
    console.error('[RFFM] Fatal:', error.message);
    try {
      const base44Err = createClientFromRequest(req);
      const admins = await base44Err.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await sendViaResend(admin.email, '🚨 Error RFFM sync', `<div style="font-family:Arial;max-width:600px"><div style="background:#dc2626;padding:16px;border-radius:12px 12px 0 0"><h2 style="color:white;margin:0">🚨 Fallo rffmWeeklySync</h2></div><div style="background:#fff;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px"><pre style="background:#f1f5f9;padding:12px;border-radius:8px">${error.message}</pre></div></div>`);
      }
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});