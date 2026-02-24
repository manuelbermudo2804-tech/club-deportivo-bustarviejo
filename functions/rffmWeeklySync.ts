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

async function fetchPage(url, cookies) { return await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies } })).text(); }

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
  const $ = load(html); const sc = [];
  $('table').each((_, table) => {
    const fr = $(table).find('tr').first().find('td,th').map((__,c) => $(c).text().trim().toLowerCase()).get().join(' ');
    if (!fr.includes('jugador')) return;
    let hdr = true;
    $(table).find('tr').each((__,row) => { if (hdr) { hdr = false; return; } const cells = $(row).find('td'); if (cells.length < 5) return; const t = cells.map((___,td) => $(td).text().trim()).get(); if (t[0] && (parseInt(t[4])||0) > 0) sc.push({ jugador: t[0], equipo: t[1], goles: parseInt(t[4])||0 }); });
  });
  return sc;
}

function getSeason() { const n = new Date(); const y = n.getFullYear(); return n.getMonth() >= 8 ? `${y}/${y+1}` : `${y-1}/${y}`; }

// ---- Main ----

async function syncCategory(config, cookies, base44, temporada) {
  const cat = config.categoria;
  const result = { cat, standings: null, results: null, scorers: null, errors: [] };

  // STANDINGS
  if (config.rfef_url) {
    try {
      const p = extractParams(config.rfef_url);
      let html = await fetchPage(buildClassUrl(p), cookies);
      let standings = parseStandings(html);
      if (!standings.length) {
        const j1 = await fetchPage(buildJornadaUrl(p, 1), cookies);
        const tot = detectTotal(j1);
        for (let j = tot; j >= 1 && !standings.length; j--) { html = await fetchPage(buildClassUrl(p, j), cookies); standings = parseStandings(html); }
      }
      if (standings.length) {
        const old = await base44.asServiceRole.entities.Clasificacion.filter({ categoria: cat, temporada });
        for (const o of old) await base44.asServiceRole.entities.Clasificacion.delete(o.id);
        const jornada = standings[0]?.pj || 0;
        await base44.asServiceRole.entities.Clasificacion.bulkCreate(standings.map(s => ({
          temporada, categoria: cat, jornada, posicion: s.posicion, nombre_equipo: s.equipo,
          puntos: s.puntos, partidos_jugados: s.pj, ganados: s.pg, empatados: s.pe, perdidos: s.pp,
          goles_favor: s.gf, goles_contra: s.gc, fecha_actualizacion: new Date().toISOString(),
        })));
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
        const existing = await base44.asServiceRole.entities.Resultado.filter({ categoria: cat, temporada, jornada: latestJ });
        if (!existing.length) {
          const records = latestM.filter(m => m.jugado).map(m => ({
            temporada, categoria: cat, jornada: latestJ, local: m.local, visitante: m.visitante,
            goles_local: m.goles_local, goles_visitante: m.goles_visitante,
            estado: 'finalizado', fecha_actualizacion: new Date().toISOString(),
          }));
          if (records.length) { await base44.asServiceRole.entities.Resultado.bulkCreate(records); result.results = { jornada: latestJ, matches: records.length }; }
        } else { result.results = { jornada: latestJ, skipped: true }; }
      }
    } catch (e) { result.errors.push({ type: 'results', error: e.message }); }
  }

  // SCORERS
  if (config.rfef_scorers_url) {
    try {
      const p = extractParams(config.rfef_scorers_url);
      const html = await fetchPage(buildScorersUrl(p), cookies);
      const scorers = parseScorers(html);
      if (scorers.length) {
        const old = await base44.asServiceRole.entities.Goleador.filter({ categoria: cat, temporada });
        for (const o of old) await base44.asServiceRole.entities.Goleador.delete(o.id);
        await base44.asServiceRole.entities.Goleador.bulkCreate(scorers.map((s, i) => ({
          temporada, categoria: cat, jugador_nombre: s.jugador, equipo: s.equipo,
          goles: s.goles, posicion: i + 1, fecha_actualizacion: new Date().toISOString(),
        })));
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

    for (const config of configs) {
      if (!config.rfef_url && !config.rfef_results_url && !config.rfef_scorers_url) continue;
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
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #ea580c, #15803d); padding: 20px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0;">📊 Resumen semanal RFFM</h2>
            <p style="color: #fed7aa; margin: 4px 0 0;">${fecha}</p>
          </div>
          <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <p><strong>${results.length} categorías sincronizadas</strong></p>
            <ul style="padding-left: 20px;">${summaryLines.map(l => `<li>${l.replace('• ', '')}</li>`).join('')}</ul>
            ${totalErrors ? `<div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin: 12px 0;"><strong>⚠️ ${totalErrors} error(es) detectados</strong></div>` : ''}
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