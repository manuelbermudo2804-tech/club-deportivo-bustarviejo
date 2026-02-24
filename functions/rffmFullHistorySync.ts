import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * RFFM Full History Sync — one-time import of ALL jornadas for a category.
 * Requires { categoria } param. Admin only.
 * Imports all played jornadas that don't already exist in the DB.
 */

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

function detectTotal(html) { const $ = load(html); let mx = 0; $('select option').each((_, o) => { const n = parseInt($(o).attr('value')); if (!isNaN(n) && n > 0 && n < 100 && n > mx) mx = n; }); return mx || 30; }

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
    // Look for ficha link in sibling tables after this match table
    let actaUrl = null;
    let nextT = $(t).next('table');
    for (let k = 0; k < 3 && nextT.length; k++) {
      const nh = nextT.html() || '';
      if (nh.includes('escudo_clb') || nh.includes('pimg/Clubes')) break;
      const fichaLink = nextT.find('a[href*="NFG_CmpPartido"]').first();
      if (fichaLink.length) { const h = fichaLink.attr('href') || ''; if (h) actaUrl = 'https://intranet.ffmadrid.es' + h; break; }
      nextT = nextT.next('table');
    }
    matches.push({ local: loc, visitante: vis, goles_local: gl, goles_visitante: gv, jugado: jug, fecha, hora, campo: mc, acta_url: actaUrl });
  }
  return matches;
}

function getSeason() { const n = new Date(); const y = n.getFullYear(); return n.getMonth() >= 8 ? `${y}/${y+1}` : `${y-1}/${y}`; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const targetCat = body?.categoria;
    if (!targetCat) return Response.json({ error: 'Se requiere el parámetro "categoria"' }, { status: 400 });

    const cookies = await rffmLogin();
    const temporada = getSeason();

    // Get config for this category
    const configs = await base44.asServiceRole.entities.StandingsConfig.filter({ categoria: targetCat });
    const config = configs[0];
    if (!config || (!config.rfef_results_url && !config.rfef_url)) {
      return Response.json({ error: `No hay URL de RFFM configurada para ${targetCat}` }, { status: 400 });
    }

    const url = config.rfef_results_url || config.rfef_url;
    const p = extractParams(url);

    // Detect total jornadas
    const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
    const totalJornadas = detectTotal(j1Html);

    // Get existing jornadas in DB to skip them
    const existing = await base44.asServiceRole.entities.Resultado.filter({ categoria: targetCat, temporada }, '-jornada', 5000);
    const existingJornadas = new Set(existing.map(r => r.jornada));

    const imported = [];
    const skipped = [];
    const errors = [];

    // Scan all jornadas
    for (let j = 1; j <= totalJornadas; j++) {
      // Skip if already in DB
      if (existingJornadas.has(j)) {
        skipped.push(j);
        continue;
      }

      try {
        const html = j === 1 ? j1Html : await fetchPage(buildJornadaUrl(p, j), cookies);
        const matches = parseMatches(html);
        const played = matches.filter(m => m.jugado);

        if (played.length === 0) continue; // Jornada not played yet

        const records = played.map(m => ({
          temporada, categoria: targetCat, jornada: j,
          local: m.local, visitante: m.visitante,
          goles_local: m.goles_local, goles_visitante: m.goles_visitante,
          estado: 'finalizado', fecha_actualizacion: new Date().toISOString(),
          ...(m.acta_url ? { acta_url: m.acta_url } : {}),
        }));

        // bulkCreate in batches of 10
        for (let b = 0; b < records.length; b += 10) {
          await base44.asServiceRole.entities.Resultado.bulkCreate(records.slice(b, b + 10));
        }

        imported.push({ jornada: j, matches: records.length });
      } catch (e) {
        errors.push({ jornada: j, error: e.message });
      }

      // Small delay to avoid hammering RFFM
      await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({
      success: true,
      categoria: targetCat,
      temporada,
      totalJornadas,
      imported,
      skipped: skipped.length,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});