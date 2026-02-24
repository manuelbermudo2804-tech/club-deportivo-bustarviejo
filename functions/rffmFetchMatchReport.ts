import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * Scrapes a match report (ficha) from the RFFM intranet and saves it to MatchReport entity.
 * Any authenticated user can use it.
 *
 * RFFM ficha text structure (verified Feb 2026):
 * ─────────────────────────────────────────
 * [menu noise...]
 * Ficha de Partido Temporada YYYY-YYYY Fecha: DD-MM-YYYY Hora: HH:MM h
 * COMPETICION (Grupo X) Jornada N
 * EQUIPO_LOCAL_NAME
 * Titulares: dorsal SURNAME, Name dorsal SURNAME, Name ...
 * Suplentes: [optional players]
 * CUERPO TÉCNICO ... SUSTITUCIONES [subs] TARJETAS [cards]
 * 0 -
 * ÁRBITROS ARBITRO : NOMBRE
 * GOLES score1 - score2 NOMBRE (min') ...
 * ESTADIO: CAMPO_NAME ...
 * EQUIPO_VISITANTE_NAME
 * Titulares: dorsal SURNAME, Name ...
 * Suplentes: ...
 * CUERPO TÉCNICO ... SUSTITUCIONES [subs] TARJETAS [cards]
 * Anterior [end marker]
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
  // Each player: 1-2 digit dorsal, then UPPERCASE SURNAME + comma + first name, until next dorsal or end
  const re = /(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]+,\s*[A-ZÁÉÍÓÚÑÜa-záéíóúñü][A-ZÁÉÍÓÚÑÜa-záéíóúñü\s]*?)(?=\s+\d{1,2}\s+[A-ZÁÉÍÓÚÑÜ]|$)/g;
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
  const re = /(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)\s+(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)\s*\((\d+)'\)/g;
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
 * Extract cards: "PLAYER_NAME (min')"
 */
function extractCards(text) {
  const cards = [];
  const re = /([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)\s*\((\d+)'\)/g;
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
 * Parse a single team block (from team name through TARJETAS section)
 */
function parseTeamBlock(text) {
  const result = { players: [], subs: [], cards: [] };

  // Titulares
  const titularesIdx = text.indexOf('Titulares:');
  const suplentesIdx = text.indexOf('Suplentes:');
  const cuerpoIdx = text.indexOf('CUERPO');
  const subsIdx = text.indexOf('SUSTITUCIONES');
  const tarjetasIdx = text.indexOf('TARJETAS');

  if (titularesIdx < 0) return result;

  // Extract titulares text
  const titEnd = suplentesIdx > titularesIdx ? suplentesIdx : (cuerpoIdx > titularesIdx ? cuerpoIdx : text.length);
  const titularesText = text.substring(titularesIdx + 10, titEnd);
  result.players.push(...extractPlayers(titularesText, true));

  // Extract suplentes text (if present)
  if (suplentesIdx > 0) {
    const supEnd = cuerpoIdx > suplentesIdx ? cuerpoIdx : (subsIdx > suplentesIdx ? subsIdx : text.length);
    const suplentesText = text.substring(suplentesIdx + 10, supEnd);
    result.players.push(...extractPlayers(suplentesText, false));
  }

  // Extract substitutions
  if (subsIdx >= 0) {
    const subsEnd = tarjetasIdx > subsIdx ? tarjetasIdx : text.length;
    const subsText = text.substring(subsIdx + 14, subsEnd);
    result.subs = extractSubstitutions(subsText);
  }

  // Extract cards
  if (tarjetasIdx >= 0) {
    const cardsText = text.substring(tarjetasIdx + 9);
    result.cards = extractCards(cardsText);
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

  // ── Find the start of the actual ficha content ──
  // Key marker: "Ficha de Partido"
  const fichaStart = allText.indexOf('Ficha de Partido');
  if (fichaStart < 0) return report; // Not a valid ficha page
  const fichaText = allText.substring(fichaStart);

  // ── Header info ──
  const fechaMatch = fichaText.match(/Fecha:\s*(\d{1,2}-\d{1,2}-\d{4})/i);
  if (fechaMatch) report.fecha = fechaMatch[1].replace(/-/g, '/');
  
  const horaMatch = fichaText.match(/Hora:\s*(\d{1,2}:\d{2})/i);
  if (horaMatch) report.hora = horaMatch[1];

  // ── Find the separator "0 -" that splits LOCAL from middle section ──
  // The pattern is a standalone "0 -" followed by ÁRBITROS
  const separatorIdx = fichaText.indexOf('0 -');
  if (separatorIdx < 0) return report; // Can't parse without separator

  // ── LOCAL team block: from first "Titulares:" to the separator ──
  const firstTitulares = fichaText.indexOf('Titulares:');
  if (firstTitulares < 0) return report;
  
  const localBlock = fichaText.substring(firstTitulares, separatorIdx);
  const localParsed = parseTeamBlock(localBlock);
  report.alineacion_local = localParsed.players;
  localParsed.subs.forEach(s => s.equipo = 'local');
  localParsed.cards.forEach(c => c.equipo = 'local');
  report.cambios.push(...localParsed.subs);
  report.tarjetas.push(...localParsed.cards);

  // ── Middle section: ÁRBITROS, GOLES, ESTADIO ──
  // Find where the visitante team starts (second "Titulares:" after the separator)
  const afterSeparator = fichaText.substring(separatorIdx);
  const visitanteTitularesIdx = afterSeparator.indexOf('Titulares:');
  
  let middleSection;
  if (visitanteTitularesIdx > 0) {
    middleSection = afterSeparator.substring(0, visitanteTitularesIdx);
  } else {
    middleSection = afterSeparator;
  }

  // Arbitro
  const arbitroMatch = middleSection.match(/ARBITRO\s*:\s*([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s,.\-]+?)(?=\s+GOLES|\s*$)/i);
  if (arbitroMatch) {
    let arb = clean(arbitroMatch[1]);
    if (arb.length > 3) report.arbitro = arb.substring(0, 100);
  }

  // Goles
  const golesMatch = middleSection.match(/GOLES\s+([\s\S]+?)(?=\s+ESTADIO|\s*$)/i);
  if (golesMatch) {
    const golesText = golesMatch[1];
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
  const estadioMatch = middleSection.match(/ESTADIO:\s*(.+?)(?:\s*Ciudad:|\s*$)/i);
  if (estadioMatch) {
    let c = clean(estadioMatch[1]);
    c = c.replace(/\s*\(H\.?A\.?\).*/i, '').replace(/\s*-\s*Hierba.*/i, '').replace(/\s*-\s*Tierra.*/i, '').trim();
    if (c.length > 3 && c.length < 150) report.campo = c;
  }

  // ── VISITANTE team block: from second "Titulares:" to "Anterior" ──
  if (visitanteTitularesIdx > 0) {
    const visitanteStart = afterSeparator.substring(visitanteTitularesIdx);
    const anteriorIdx = visitanteStart.indexOf('Anterior');
    const visitanteBlock = anteriorIdx > 0 ? visitanteStart.substring(0, anteriorIdx) : visitanteStart;
    
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
      // Partial match by surname
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

    if (!resultado_id) {
      return Response.json({ error: 'Missing resultado_id' }, { status: 400 });
    }

    // Check if already scraped — if so, delete old one and re-scrape (to fix duplicates)
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