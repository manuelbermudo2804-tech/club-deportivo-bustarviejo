import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * Scrapes a match report (ficha) from the RFFM intranet and saves it to MatchReport entity.
 * Admin only. Requires acta_url and resultado_id.
 * 
 * Supports action: "debug_html" to return raw text for diagnostics.
 * 
 * RFFM ficha text structure (after login):
 * ─────────────────────────────────────────
 * Ficha de Partido Temporada 2025-2026 Fecha: DD-MM-YYYY Hora: HH:MM h
 * COMPETICION (Grupo X) Jornada N
 * 
 * EQUIPO_LOCAL_NAME
 * Titulares: dorsal NOMBRE, ... Suplentes: dorsal NOMBRE, ...
 * CUERPO TÉCNICO ... ENTRENADOR ...
 * SUSTITUCIONES  entra_dorsal ENTRA_NOMBRE  sale_dorsal SALE_NOMBRE (min') ...
 * TARJETAS  NOMBRE (min') ...
 * 
 * 0 - (separator)
 * 
 * ÁRBITROS  ARBITRO : NOMBRE
 * 
 * GOLES  score NOMBRE (min') ...
 * 
 * EQUIPO_VISITANTE_NAME
 * Titulares: ... Suplentes: ...
 * CUERPO TÉCNICO ... SUSTITUCIONES ... TARJETAS ...
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

// Parse: "dorsal SURNAME, Name" entries from a text block
function extractPlayers(text, isTitular) {
  const players = [];
  // Pattern: 1-2 digit number followed by UPPERCASE SURNAME, then mixed-case first name
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

// Parse substitutions: "entra_dorsal ENTRA_NAME sale_dorsal SALE_NAME (min')"
function extractSubstitutions(text) {
  const subs = [];
  // Pattern: dorsal + name + dorsal + name + (minute)
  // Each substitution pair: entering player dorsal+name, then leaving player dorsal+name (min')
  const re = /(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)\s+(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)\s*\((\d+)'\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const entra = clean(m[2]);
    const sale = clean(m[4]);
    const minuto = m[5];
    if (entra.length > 3 && sale.length > 3) {
      subs.push({ minuto, entra, sale, equipo: '' });
    }
  }
  return subs;
}

// Parse tarjetas: "PLAYER_NAME (min')"
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

  // ── Header info ──
  const fechaMatch = allText.match(/Fecha:\s*(\d{1,2}-\d{1,2}-\d{4})/i);
  if (fechaMatch) report.fecha = fechaMatch[1].replace(/-/g, '/');
  
  const horaMatch = allText.match(/Hora:\s*(\d{1,2}:\d{2})/i);
  if (horaMatch) report.hora = horaMatch[1];

  const arbitroMatch = allText.match(/ARBITRO\s*:\s*([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s,.\-]+?)(?=\s+GOLES|\s+Anterior|\s*$)/i);
  if (arbitroMatch) {
    let arb = clean(arbitroMatch[1]);
    if (arb.length > 3) report.arbitro = arb.substring(0, 100);
  }

  // ── Split into team sections ──
  // The text has two team blocks separated by a section containing "ÁRBITROS" and "GOLES"
  // Strategy: Find "Titulares:" occurrences to locate team blocks
  
  const titularesPositions = [];
  let searchStart = 0;
  while (true) {
    const idx = allText.indexOf('Titulares:', searchStart);
    if (idx === -1) break;
    titularesPositions.push(idx);
    searchStart = idx + 10;
  }

  if (titularesPositions.length < 2) {
    // Fallback: try with just "Titulares"
    searchStart = 0;
    while (true) {
      const idx = allText.indexOf('Titulares', searchStart);
      if (idx === -1) break;
      titularesPositions.push(idx);
      searchStart = idx + 9;
    }
  }

  // Parse each team section
  for (let teamIdx = 0; teamIdx < Math.min(titularesPositions.length, 2); teamIdx++) {
    const startPos = titularesPositions[teamIdx];
    // End of this team section: next "Anterior" or next "Titulares" or end of text
    const nextTitulares = teamIdx + 1 < titularesPositions.length ? titularesPositions[teamIdx + 1] : allText.length;
    const anteriorIdx = allText.indexOf('Anterior', startPos);
    const endPos = anteriorIdx > startPos && anteriorIdx < nextTitulares ? anteriorIdx : nextTitulares;
    
    const teamBlock = allText.substring(startPos, endPos);
    
    // Split at "Suplentes:" 
    const suplentesIdx = teamBlock.indexOf('Suplentes:');
    let titularesText, suplentesText, restText;
    
    if (suplentesIdx > 0) {
      titularesText = teamBlock.substring(teamBlock.indexOf(':') + 1, suplentesIdx);
      const cuerpoIdx = teamBlock.indexOf('CUERPO', suplentesIdx);
      suplentesText = teamBlock.substring(suplentesIdx + 10, cuerpoIdx > 0 ? cuerpoIdx : endPos - startPos);
      restText = cuerpoIdx > 0 ? teamBlock.substring(cuerpoIdx) : '';
    } else {
      titularesText = teamBlock.substring(teamBlock.indexOf(':') + 1);
      suplentesText = '';
      restText = '';
    }
    
    const titulares = extractPlayers(titularesText, true);
    const suplentes = extractPlayers(suplentesText, false);
    const allPlayers = [...titulares, ...suplentes];

    // Parse substitutions from "SUSTITUCIONES" section within this team block
    const subsIdx = restText.indexOf('SUSTITUCIONES');
    const tarjetasIdx = restText.indexOf('TARJETAS');
    
    let subsText = '';
    let cardsText = '';
    
    if (subsIdx >= 0) {
      const subsEnd = tarjetasIdx > subsIdx ? tarjetasIdx : restText.length;
      subsText = restText.substring(subsIdx + 14, subsEnd);
    }
    
    if (tarjetasIdx >= 0) {
      // Cards section ends at next major section or end
      const nextSection = restText.indexOf('0 -', tarjetasIdx);
      cardsText = restText.substring(tarjetasIdx + 9, nextSection > tarjetasIdx ? nextSection : restText.length);
    }

    const subs = extractSubstitutions(subsText);
    const cards = extractCards(cardsText);
    
    const equipoLabel = teamIdx === 0 ? 'local' : 'visitante';
    
    subs.forEach(s => s.equipo = equipoLabel);
    cards.forEach(c => c.equipo = equipoLabel);
    
    if (teamIdx === 0) {
      report.alineacion_local = allPlayers;
    } else {
      report.alineacion_visitante = allPlayers;
    }
    
    report.cambios.push(...subs);
    report.tarjetas.push(...cards);
  }

  // ── Goals ──
  // Pattern: "score1 - score2 PLAYER_NAME (minute')"
  const golesSection = allText.match(/GOLES\s+([\s\S]+?)(?=\s+[A-ZÁÉÍÓÚÑÜ]{3,}\s+(?:Titulares|Suplentes)|Anterior|\s*$)/i);
  if (golesSection) {
    const golesText = golesSection[1];
    const goalRe = /(\d+)\s*-\s*(\d+)\s+([A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF][A-ZÁÉÍÓÚÑÜ\u0080-\uFFFF\s,]+?)\s*\((\d+)'\)/g;
    let gm;
    while ((gm = goalRe.exec(golesText)) !== null) {
      const jugador = clean(gm[3]);
      if (jugador.length > 3 && jugador.length < 80) {
        report.goles.push({ minuto: gm[4], jugador, equipo: '' });
      }
    }
  }
  
  // Determine which team each goal belongs to
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

  // ── Campo (may not be present in all fichas) ──
  const campoMatch = allText.match(/Campo[:\s]+([^\n\r]+)/i);
  if (campoMatch) {
    let c = clean(campoMatch[1]);
    c = c.replace(/\s*\(H\.?A\.?\).*/i, '').replace(/\s*-\s*Hierba.*/i, '').replace(/\s*-\s*Tierra.*/i, '').trim();
    if (c.length > 3 && c.length < 150) report.campo = c;
  }

  return report;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

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

    // Check if already scraped
    const existing = await base44.asServiceRole.entities.MatchReport.filter({ resultado_id });
    if (existing.length > 0) {
      return Response.json({ success: true, report: existing[0], already_existed: true });
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