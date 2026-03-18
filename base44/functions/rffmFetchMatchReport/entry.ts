import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * Scrapes a match report (ficha) from the RFFM intranet.
 *
 * RFFM ficha text structure (verified Feb 2026):
 * ─────────────────────────────────────────
 * [menu noise...]
 * Ficha de Partido Temporada YYYY-YYYY Fecha: DD-MM-YYYY Hora: HH:MM h
 * COMPETICION (Grupo X) Jornada N
 * EQUIPO_LOCAL
 *   Titulares: dorsal NAME, ... Suplentes: ... CUERPO TÉCNICO ...
 *   SUSTITUCIONES entra sale (min') ...
 *   TARJETAS NAME (min') ...
 * SCORE_LOCAL - SCORE_VISITANTE
 * ÁRBITROS ARBITRO : NAME
 * GOLES score1 - score2 NAME (min') ...
 * ESTADIO: CAMPO ...
 * EQUIPO_VISITANTE
 *   Titulares: dorsal NAME, ... Suplentes: ... CUERPO TÉCNICO ...
 *   SUSTITUCIONES ... TARJETAS ...
 * Anterior [end]
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

function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

/**
 * Extract players from a "Titulares:" or "Suplentes:" block.
 * Pattern: dorsal(1-2 digits) SURNAME, FirstName
 */
function extractPlayers(text, isTitular) {
  const players = [];
  const re = /(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s]+,\s*[A-ZÁÉÍÓÚÑÜa-záéíóúñü\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜa-záéíóúñü\u0080-\uFFFF\s]*?)(?=\s+\d{1,2}\s+[A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF]|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const nombre = clean(m[2]);
    if (nombre.length > 3 && nombre.length < 80) {
      players.push({ dorsal: m[1], nombre, titular: isTitular });
    }
  }
  return players;
}

/**
 * Extract substitutions: "dorsal ENTRA_NAME dorsal SALE_NAME (min')"
 */
function extractSubstitutions(text) {
  const subs = [];
  const re = /(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s,]+?)\s+(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s,]+?)\s*\((\d+)'\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const entra = clean(m[2]);
    const sale = clean(m[4]);
    if (entra.length > 3 && sale.length > 3) {
      subs.push({ minuto: m[5], entra, sale, equipo: '' });
    }
  }
  return subs;
}

/**
 * Extract cards: "PLAYER_NAME (min')" — but NOT goal patterns like "1 - 0 NAME (min')"
 */
function extractCards(text) {
  const cards = [];
  // Match "NAME (min')" but ensure it's not preceded by a score like "1 - 0"
  const re = /([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s,]+?)\s*\((\d+)'\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const jugador = clean(m[1]);
    if (jugador.length > 3 && jugador.length < 80) {
      cards.push({ minuto: m[2], jugador, equipo: '', tipo: 'amarilla' });
    }
  }
  return cards;
}

/**
 * Parse a single team block.
 * Input: text from team name through end of TARJETAS section.
 */
function parseTeamBlock(text) {
  const result = { players: [], subs: [], cards: [] };

  const titularesIdx = text.indexOf('Titulares:');
  const suplentesIdx = text.indexOf('Suplentes:');
  const cuerpoIdx = text.indexOf('CUERPO');
  const subsIdx = text.indexOf('SUSTITUCIONES');
  const tarjetasIdx = text.indexOf('TARJETAS');

  if (titularesIdx < 0) return result;

  // Titulares
  const titEnd = suplentesIdx > titularesIdx ? suplentesIdx : (cuerpoIdx > titularesIdx ? cuerpoIdx : text.length);
  result.players.push(...extractPlayers(text.substring(titularesIdx + 10, titEnd), true));

  // Suplentes
  if (suplentesIdx > 0) {
    const supEnd = cuerpoIdx > suplentesIdx ? cuerpoIdx : (subsIdx > suplentesIdx ? subsIdx : text.length);
    result.players.push(...extractPlayers(text.substring(suplentesIdx + 10, supEnd), false));
  }

  // Substitutions
  if (subsIdx >= 0) {
    const subsEnd = tarjetasIdx > subsIdx ? tarjetasIdx : text.length;
    result.subs = extractSubstitutions(text.substring(subsIdx + 14, subsEnd));
  }

  // Cards
  if (tarjetasIdx >= 0) {
    // Cards section ends at the end of the block
    result.cards = extractCards(text.substring(tarjetasIdx + 9));
  }

  return result;
}

function parseMatchReport(html) {
  const $ = load(html);
  $('script').remove();
  $('style').remove();
  const allText = $('body').text().replace(/\s+/g, ' ').trim();

  const report = {
    arbitro: null, fecha: null, hora: null, campo: null,
    alineacion_local: [], alineacion_visitante: [],
    goles: [], tarjetas: [], cambios: []
  };

  // Find the ficha content
  const fichaStart = allText.indexOf('Ficha de Partido');
  if (fichaStart < 0) return report;
  const fichaText = allText.substring(fichaStart);

  // Header
  const fechaMatch = fichaText.match(/Fecha:\s*(\d{1,2}-\d{1,2}-\d{4})/i);
  if (fechaMatch) report.fecha = fechaMatch[1].replace(/-/g, '/');
  const horaMatch = fichaText.match(/Hora:\s*(\d{1,2}:\d{2})/i);
  if (horaMatch) report.hora = horaMatch[1];

  // ── KEY INSIGHT: The separator between LOCAL team block and the middle section
  // is a score line like "2 - 03" or "0 - 15" followed by "ÁRBITROS".
  // We find "ÁRBITROS" as the reliable landmark. ──
  const arbitrosIdx = fichaText.indexOf('RBITROS');
  if (arbitrosIdx < 0) return report;

  // Find the score just before ÁRBITROS — it's like "X - YZ" right before it
  // The score block is between the last TARJETAS section of local team and ÁRBITROS
  // We look backwards from ÁRBITROS for the score pattern
  const beforeArbitros = fichaText.substring(0, arbitrosIdx);
  
  // Find the score line: digits - digits followed by special char (Á of ÁRBITROS)
  // Pattern: "TARJETAS ... cards ... SCORE_L - SCORE_V ÁRBITROS"
  // The score is like "2 - 03" or "0 -" (when 0 away goals, appears as "0 -")
  const scoreMatch = beforeArbitros.match(/(\d+)\s*-\s*(\d*)\s*$/);
  
  // ── LOCAL team block: from first "Titulares:" to the local TARJETAS section end ──
  // We need to find the end of the local team block. The TARJETAS section of local team
  // ends right before the score. We find TARJETAS before ÁRBITROS.
  
  const firstTitulares = fichaText.indexOf('Titulares:');
  if (firstTitulares < 0) return report;
  
  // Find the last TARJETAS before ÁRBITROS (this is local team's TARJETAS)
  let localTarjetasEnd = -1;
  let searchFrom = 0;
  let lastTarjetasBeforeArbitros = -1;
  while (true) {
    const idx = fichaText.indexOf('TARJETAS', searchFrom);
    if (idx < 0 || idx > arbitrosIdx) break;
    lastTarjetasBeforeArbitros = idx;
    searchFrom = idx + 8;
  }
  
  // The local block is from first Titulares to end of TARJETAS content
  // TARJETAS content ends where the score starts, which is right before ÁRBITROS
  // We need to find where TARJETAS content ends = just before the score digits
  
  // Get text from last TARJETAS to ÁRBITROS - this contains local cards + the score
  if (lastTarjetasBeforeArbitros >= 0) {
    const tarjetasToArbitros = fichaText.substring(lastTarjetasBeforeArbitros + 8, arbitrosIdx);
    // Remove the trailing score from the cards section
    // Score pattern at end: "digit(s) - digit(s)" or "digit(s) -"
    const cardsTextCleaned = tarjetasToArbitros.replace(/\s*\d+\s*-\s*\d*\s*$/, '');
    
    // Build the full local block
    const localBlockEnd = lastTarjetasBeforeArbitros + 8; // after "TARJETAS"
    const localBlock = fichaText.substring(firstTitulares, localBlockEnd) + cardsTextCleaned;
    
    const localParsed = parseTeamBlock(localBlock);
    report.alineacion_local = localParsed.players;
    localParsed.subs.forEach(s => s.equipo = 'local');
    localParsed.cards.forEach(c => c.equipo = 'local');
    report.cambios.push(...localParsed.subs);
    report.tarjetas.push(...localParsed.cards);
  }

  // ── Middle section: ÁRBITROS, GOLES, ESTADIO ──
  const afterArbitros = fichaText.substring(arbitrosIdx);
  
  // Find visitante start (next "Titulares:" after ÁRBITROS)
  const visitanteTitIdx = afterArbitros.indexOf('Titulares:');
  const middleSection = visitanteTitIdx > 0 ? afterArbitros.substring(0, visitanteTitIdx) : afterArbitros;

  // Arbitro
  const arbitroMatch = middleSection.match(/ARBITRO\s*:\s*([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s,.\-]+?)(?=\s+GOLES|\s*$)/i);
  if (arbitroMatch) {
    let arb = clean(arbitroMatch[1]);
    if (arb.length > 3) report.arbitro = arb.substring(0, 100);
  }

  // Goles
  const golesIdx = middleSection.indexOf('GOLES');
  const estadioIdx = middleSection.indexOf('ESTADIO');
  if (golesIdx >= 0) {
    const golesEnd = estadioIdx > golesIdx ? estadioIdx : middleSection.length;
    const golesText = middleSection.substring(golesIdx + 5, golesEnd);
    const goalRe = /(\d+)\s*-\s*(\d+)\s+([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s,]+?)\s*\((\d+)'\)/g;
    let gm;
    while ((gm = goalRe.exec(golesText)) !== null) {
      const jugador = clean(gm[3]);
      if (jugador.length > 3 && jugador.length < 80) {
        report.goles.push({ minuto: gm[4], jugador, equipo: '' });
      }
    }
  }

  // Campo / Estadio
  if (estadioIdx >= 0) {
    const estadioMatch = middleSection.substring(estadioIdx).match(/ESTADIO:\s*(.+?)(?:\s*Ciudad:|\s*$)/i);
    if (estadioMatch) {
      let c = clean(estadioMatch[1]);
      c = c.replace(/\s*\(H\.?A\.?\).*/i, '').replace(/\s*-\s*Hierba.*/i, '').replace(/\s*-\s*Tierra.*/i, '').trim();
      if (c.length > 3 && c.length < 150) report.campo = c;
    }
  }

  // ── VISITANTE team block ──
  if (visitanteTitIdx > 0) {
    const visitanteStart = afterArbitros.substring(visitanteTitIdx);
    const anteriorIdx = visitanteStart.indexOf('Anterior');
    // Also cut at "©" or "Perfil de Usuario" which marks end of content
    let endIdx = visitanteStart.length;
    if (anteriorIdx > 0) endIdx = Math.min(endIdx, anteriorIdx);
    const perfilIdx = visitanteStart.indexOf('Perfil de Usuario');
    if (perfilIdx > 0) endIdx = Math.min(endIdx, perfilIdx);
    
    const visitanteBlock = visitanteStart.substring(0, endIdx);
    const visitanteParsed = parseTeamBlock(visitanteBlock);
    report.alineacion_visitante = visitanteParsed.players;
    visitanteParsed.subs.forEach(s => s.equipo = 'visitante');
    visitanteParsed.cards.forEach(c => c.equipo = 'visitante');
    report.cambios.push(...visitanteParsed.subs);
    report.tarjetas.push(...visitanteParsed.cards);
  }

  // ── Assign goals to teams by matching player names ──
  const localNames = new Set(report.alineacion_local.map(p => p.nombre.toUpperCase()));
  const visitanteNames = new Set(report.alineacion_visitante.map(p => p.nombre.toUpperCase()));
  
  for (const gol of report.goles) {
    const upperName = gol.jugador.toUpperCase();
    if (localNames.has(upperName)) {
      gol.equipo = 'local';
    } else if (visitanteNames.has(upperName)) {
      gol.equipo = 'visitante';
    } else {
      const surname = upperName.split(',')[0].trim();
      const isLocal = [...localNames].some(n => n.startsWith(surname));
      const isVisitante = [...visitanteNames].some(n => n.startsWith(surname));
      gol.equipo = isLocal ? 'local' : isVisitante ? 'visitante' : '';
    }
  }

  return report;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, acta_url, resultado_id, categoria, temporada, jornada, local, visitante, goles_local, goles_visitante } = body;

    if (!acta_url) {
      return Response.json({ error: 'Missing acta_url' }, { status: 400 });
    }

    // Login and fetch the ficha page
    const cookies = await rffmLogin();
    const resp = await fetch(acta_url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies } });
    const html = await resp.text();

    // Debug mode
    if (action === 'debug_html') {
      const $ = load(html);
      $('script').remove();
      $('style').remove();
      const cleanedText = $('body').text().replace(/\s+/g, ' ').trim();
      const offset = parseInt(body.offset) || 0;
      const chunk = 4000;
      return Response.json({ 
        success: true, htmlLength: html.length, textLength: cleanedText.length,
        offset, text: cleanedText.substring(offset, offset + chunk),
        hasMore: (offset + chunk) < cleanedText.length
      });
    }

    if (action === 'debug_parse') {
      const parsed = parseMatchReport(html);
      return Response.json({ success: true, parsed });
    }

    if (!resultado_id) {
      return Response.json({ error: 'Missing resultado_id' }, { status: 400 });
    }

    // Delete old reports for this resultado (prevent duplicates)
    const existing = await base44.asServiceRole.entities.MatchReport.filter({ resultado_id });
    for (const old of existing) {
      await base44.asServiceRole.entities.MatchReport.delete(old.id);
    }

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