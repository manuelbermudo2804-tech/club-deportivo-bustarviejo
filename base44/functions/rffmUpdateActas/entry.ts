import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * RFFM Update Actas — updates acta_url for ALL existing results that are missing it.
 * Can run for a single category or all categories.
 * Admin only.
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

function parseMatchesWithActas(html) {
  const $ = load(html); const matches = []; const tables = $('table').toArray(); let campo = null;
  for (let i = 3; i < tables.length; i++) {
    const t = tables[i]; const th = $(t).html() || ''; const hasE = th.includes('escudo_clb') || th.includes('pimg/Clubes');
    if (!hasE) { const tx = $(t).text().replace(/\s+/g,' ').trim(); const cm = tx.match(/Campo:\s*(.+)/); if (cm) { let c = cm[1].trim().replace(/\s*\(H\.?A\.?\)\s*-\s*.*/i,'').replace(/\s*-\s*Hierba\s*.*/i,'').replace(/\s*-\s*Tierra\s*.*/i,'').replace(/\s*-\s*Cesped\s*.*/i,'').trim(); if (c) campo = c; } continue; }
    const tds = $(t).find('td').toArray(); if (tds.length < 3) continue;
    const loc = $(tds[0]).find('span').first().text().trim() || $(tds[0]).text().replace(/\s+/g,' ').trim();
    const vis = $(tds[2]).find('span').first().text().trim() || $(tds[2]).text().replace(/\s+/g,' ').trim();
    if (!loc || !vis) continue;
    // Look for ficha link: first inside the match table itself, then in sibling tables
    let actaUrl = null;
    const inlineLink = $(t).find('a[href*="NFG_CmpPartido"]').first();
    if (inlineLink.length) { const h = inlineLink.attr('href') || ''; if (h) actaUrl = 'https://intranet.ffmadrid.es' + h; }
    if (!actaUrl) {
      let nextT = $(t).next('table');
      for (let k = 0; k < 3 && nextT.length; k++) {
        const nh = nextT.html() || '';
        if (nh.includes('escudo_clb') || nh.includes('pimg/Clubes')) break;
        const fichaLink = nextT.find('a[href*="NFG_CmpPartido"]').first();
        if (fichaLink.length) { const h = fichaLink.attr('href') || ''; if (h) actaUrl = 'https://intranet.ffmadrid.es' + h; break; }
        nextT = nextT.next('table');
      }
    }
    if (actaUrl) matches.push({ local: loc, visitante: vis, acta_url: actaUrl });
  }
  return matches;
}

function detectTotal(html) { const $ = load(html); let mx = 0; $('select option').each((_, o) => { const n = parseInt($(o).attr('value')); if (!isNaN(n) && n > 0 && n < 100 && n > mx) mx = n; }); return mx || 30; }

function normalizeTeam(name) {
  return (name || '').toUpperCase().replace(/["\s]+/g, ' ').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const targetCat = body?.categoria; // optional - if omitted, update all categories

    const cookies = await rffmLogin();

    // Get all StandingsConfigs
    let configs;
    if (targetCat) {
      configs = await base44.asServiceRole.entities.StandingsConfig.filter({ categoria: targetCat });
    } else {
      configs = await base44.asServiceRole.entities.StandingsConfig.filter({});
    }

    const results = [];

    for (const config of configs) {
      const cat = config.categoria;
      const url = config.rfef_results_url || config.rfef_url;
      if (!url) { results.push({ categoria: cat, error: 'No URL configured' }); continue; }

      try {
        const p = extractParams(url);

        // Get results missing acta_url for this category (paginated to avoid rate limits)
        let allResults = [];
        let offset = 0;
        const pageSize = 100;
        while (true) {
          const batch = await base44.asServiceRole.entities.Resultado.filter({ categoria: cat }, '-jornada', pageSize, offset);
          allResults = allResults.concat(batch);
          if (batch.length < pageSize) break;
          offset += pageSize;
          await new Promise(r => setTimeout(r, 800));
        }
        const missingActa = allResults.filter(r => !r.acta_url && r.estado === 'finalizado');
        
        if (missingActa.length === 0) {
          results.push({ categoria: cat, updated: 0, message: 'All results already have actas' });
          continue;
        }

        // Group missing by jornada
        const jornadasToFetch = [...new Set(missingActa.map(r => r.jornada))].sort((a, b) => a - b);

        let updated = 0;
        for (const j of jornadasToFetch) {
          const html = await fetchPage(buildJornadaUrl(p, j), cookies);
          const scraped = parseMatchesWithActas(html);

          // Match scraped actas to DB records
          const dbRecords = missingActa.filter(r => r.jornada === j);
          // Collect updates, then apply with delay between each
          const updates = [];
          for (const dbr of dbRecords) {
            const match = scraped.find(s => 
              normalizeTeam(s.local) === normalizeTeam(dbr.local) && 
              normalizeTeam(s.visitante) === normalizeTeam(dbr.visitante)
            );
            if (match?.acta_url) {
              updates.push({ id: dbr.id, acta_url: match.acta_url });
            }
          }

          // Apply updates one by one with delay
          for (const u of updates) {
            await base44.asServiceRole.entities.Resultado.update(u.id, { acta_url: u.acta_url });
            updated++;
            await new Promise(r => setTimeout(r, 300));
          }

          // Delay between jornadas to avoid RFFM + DB rate limits
          await new Promise(r => setTimeout(r, 2000));
        }

        results.push({ categoria: cat, jornadasChecked: jornadasToFetch.length, updated });
      } catch (e) {
        results.push({ categoria: cat, error: e.message });
      }
    }

    return Response.json({ success: true, results, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});