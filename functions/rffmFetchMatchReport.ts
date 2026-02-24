import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * Scrapes a match report (ficha) from the RFFM intranet and saves it to MatchReport entity.
 * Admin only. Requires acta_url (intranet URL) and resultado_id.
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

function parseMatchReport(html) {
  const $ = load(html);
  const report = {
    arbitro: null,
    fecha: null,
    hora: null,
    campo: null,
    alineacion_local: [],
    alineacion_visitante: [],
    goles: [],
    tarjetas: [],
    cambios: []
  };

  const allText = $('body').text();

  // Extract referee - look for "Árbitro" or "Arbitro" pattern
  const arbitroMatch = allText.match(/[ÁA]rbitro[:\s]+([^\n\r]+)/i);
  if (arbitroMatch) {
    report.arbitro = arbitroMatch[1].trim().replace(/\s+/g, ' ').substring(0, 100);
  }

  // Extract campo
  const campoMatch = allText.match(/Campo[:\s]+([^\n\r]+)/i);
  if (campoMatch) {
    let c = campoMatch[1].trim().replace(/\s+/g, ' ');
    c = c.replace(/\s*\(H\.?A\.?\)\s*-\s*.*/i, '').replace(/\s*-\s*Hierba\s*.*/i, '').replace(/\s*-\s*Tierra\s*.*/i, '').replace(/\s*-\s*Cesped\s*.*/i, '').trim();
    if (c.length > 3) report.campo = c.substring(0, 150);
  }

  // Extract fecha/hora
  const fechaMatch = allText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
  if (fechaMatch) report.fecha = fechaMatch[1].replace(/-/g, '/');
  const horaMatch = allText.match(/(\d{1,2}:\d{2})/);
  if (horaMatch) report.hora = horaMatch[1];

  // Parse player tables - look for tables with dorsal numbers
  // RFFM ficha has two player tables: local and visitante
  const playerTables = [];
  
  $('table').each((_, table) => {
    const rows = $(table).find('tr').toArray();
    const players = [];
    let hasPlayerData = false;
    
    for (const row of rows) {
      const cells = $(row).find('td').toArray();
      if (cells.length < 2) continue;
      
      const cellTexts = cells.map(c => $(c).text().replace(/\s+/g, ' ').trim());
      
      // Check if first cell looks like a dorsal number (1-99)
      const dorsalMatch = cellTexts[0].match(/^\s*(\d{1,2})\s*$/);
      if (dorsalMatch) {
        const dorsal = dorsalMatch[1];
        const nombre = cellTexts[1] || '';
        if (nombre && nombre.length > 1 && !/^\d+$/.test(nombre)) {
          hasPlayerData = true;
          players.push({
            dorsal,
            nombre: nombre.substring(0, 80),
            titular: true // Will be adjusted below
          });
        }
      }
    }
    
    if (hasPlayerData && players.length >= 5) {
      playerTables.push(players);
    }
  });

  // Assign player tables to local/visitante (first = local, second = visitante)
  if (playerTables.length >= 1) report.alineacion_local = playerTables[0];
  if (playerTables.length >= 2) report.alineacion_visitante = playerTables[1];

  // Mark suplentes: typically after the 11th player (or after a separator)
  for (const alineacion of [report.alineacion_local, report.alineacion_visitante]) {
    if (alineacion.length > 11) {
      for (let i = 11; i < alineacion.length; i++) {
        alineacion[i].titular = false;
      }
    }
  }

  // Parse goals - look for patterns like "min XX - Jugador" or goal-related tables
  $('table').each((_, table) => {
    const tableText = $(table).text().toLowerCase();
    if (!tableText.includes('gol') && !tableText.includes('min')) return;
    
    $(table).find('tr').each((__, row) => {
      const cells = $(row).find('td').toArray();
      const cellTexts = cells.map(c => $(c).text().replace(/\s+/g, ' ').trim());
      const rowText = cellTexts.join(' ');
      
      // Pattern: minute + player name near goal indicators
      const goalMatch = rowText.match(/(\d{1,3})['\s]*[-–]?\s*(.+)/);
      if (goalMatch && rowText.toLowerCase().includes('gol')) {
        report.goles.push({
          minuto: goalMatch[1],
          jugador: goalMatch[2].substring(0, 80).trim(),
          equipo: ''
        });
      }
    });
  });

  // Parse cards (tarjetas) - look for yellow/red card indicators
  $('table').each((_, table) => {
    const tableText = $(table).text().toLowerCase();
    if (!tableText.includes('tarjeta') && !tableText.includes('amarilla') && !tableText.includes('roja') && !tableText.includes('amonest')) return;
    
    $(table).find('tr').each((__, row) => {
      const cells = $(row).find('td').toArray();
      const cellTexts = cells.map(c => $(c).text().replace(/\s+/g, ' ').trim());
      const rowText = cellTexts.join(' ').toLowerCase();
      
      let tipo = 'amarilla';
      if (rowText.includes('roja') || rowText.includes('expuls')) tipo = 'roja';
      if (rowText.includes('doble')) tipo = 'doble_amarilla';
      
      const minMatch = cellTexts.join(' ').match(/(\d{1,3})['\s]/);
      const nameCell = cellTexts.find(t => t.length > 3 && !/^\d+$/.test(t) && !t.toLowerCase().includes('tarjeta'));
      
      if (nameCell) {
        report.tarjetas.push({
          minuto: minMatch ? minMatch[1] : '',
          jugador: nameCell.substring(0, 80),
          equipo: '',
          tipo
        });
      }
    });
  });

  // Parse substitutions (cambios)
  $('table').each((_, table) => {
    const tableText = $(table).text().toLowerCase();
    if (!tableText.includes('cambio') && !tableText.includes('sustitu')) return;
    
    $(table).find('tr').each((__, row) => {
      const cells = $(row).find('td').toArray();
      const cellTexts = cells.map(c => $(c).text().replace(/\s+/g, ' ').trim());
      const rowText = cellTexts.join(' ');
      
      const minMatch = rowText.match(/(\d{1,3})['\s]/);
      // Look for two player names (sale/entra)
      const names = cellTexts.filter(t => t.length > 3 && !/^\d+$/.test(t) && !t.toLowerCase().includes('cambio'));
      
      if (names.length >= 2) {
        report.cambios.push({
          minuto: minMatch ? minMatch[1] : '',
          sale: names[0].substring(0, 80),
          entra: names[1].substring(0, 80),
          equipo: ''
        });
      }
    });
  });

  return report;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { acta_url, resultado_id, categoria, temporada, jornada, local, visitante, goles_local, goles_visitante } = body;

    if (!acta_url || !resultado_id) {
      return Response.json({ error: 'Missing acta_url or resultado_id' }, { status: 400 });
    }

    // Check if already scraped
    const existing = await base44.asServiceRole.entities.MatchReport.filter({ resultado_id });
    if (existing.length > 0) {
      return Response.json({ success: true, report: existing[0], already_existed: true });
    }

    // Login and fetch the ficha page
    const cookies = await rffmLogin();
    const html = await (await fetch(acta_url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies } })).text();

    // Parse the report
    const parsed = parseMatchReport(html);

    // Save to entity
    const reportData = {
      resultado_id,
      categoria: categoria || '',
      temporada: temporada || '',
      jornada: jornada || 0,
      local: local || '',
      visitante: visitante || '',
      goles_local: goles_local ?? null,
      goles_visitante: goles_visitante ?? null,
      fecha: parsed.fecha || '',
      hora: parsed.hora || '',
      campo: parsed.campo || '',
      arbitro: parsed.arbitro || '',
      alineacion_local: parsed.alineacion_local || [],
      alineacion_visitante: parsed.alineacion_visitante || [],
      goles: parsed.goles || [],
      tarjetas: parsed.tarjetas || [],
      cambios: parsed.cambios || [],
      acta_url_original: acta_url
    };

    const created = await base44.asServiceRole.entities.MatchReport.create(reportData);

    return Response.json({ success: true, report: created, parsed_stats: {
      jugadores_local: parsed.alineacion_local.length,
      jugadores_visitante: parsed.alineacion_visitante.length,
      goles: parsed.goles.length,
      tarjetas: parsed.tarjetas.length,
      cambios: parsed.cambios.length,
    }});
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});