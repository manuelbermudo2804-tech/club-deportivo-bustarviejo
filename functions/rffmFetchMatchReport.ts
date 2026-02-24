import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * Scrapes a match report (ficha) from the RFFM intranet and saves it to MatchReport entity.
 * Admin only. Requires acta_url (intranet URL) and resultado_id.
 * 
 * Also supports action: "debug_html" to return raw scraped data for diagnostics.
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

function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function parseMatchReport(html) {
  const $ = load(html);
  const report = {
    arbitro: null,
    fecha: null,
    hora: null,
    campo: null,
    competicion: null,
    alineacion_local: [],
    alineacion_visitante: [],
    goles: [],
    tarjetas: [],
    cambios: []
  };

  // ========== HEADER INFO ==========
  // The page has a structure like:
  // "Ficha de Partido" ... "Temporada 2025-2026" ... "Fecha: 21-02-2026 Hora: 20:15 h"
  // "SEGUNDA JUVENIL (Grupo 2) Jornada 19"
  const bodyText = $('body').text();
  
  const fechaMatch = bodyText.match(/Fecha:\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
  if (fechaMatch) report.fecha = fechaMatch[1].replace(/-/g, '/');
  
  const horaMatch = bodyText.match(/Hora:\s*(\d{1,2}:\d{2})/i);
  if (horaMatch) report.hora = horaMatch[1];
  
  const arbitroMatch = bodyText.match(/ARBITRO\s*:\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,.\-]+)/i);
  if (arbitroMatch) {
    let arb = arbitroMatch[1].trim();
    // Clean up - stop at common next-section markers
    arb = arb.split(/\d/)[0].trim(); // Stop at first digit
    if (arb.length > 3) report.arbitro = arb.substring(0, 100);
  }

  const compMatch = bodyText.match(/((?:PRIMERA|SEGUNDA|TERCERA|PREFERENTE|DIVISION)[A-ZÁÉÍÓÚÑÜ\s\(\)]+(?:Grupo\s*\d+)?)/i);
  if (compMatch) report.competicion = cleanText(compMatch[1]).substring(0, 100);

  // ========== PLAYER LISTS ==========
  // RFFM ficha structure: team tables have players listed with dorsal numbers
  // Pattern: tables containing "Titulares:" followed by player rows
  // Each player row: [dorsal_number] [player_name] displayed in td cells
  
  // Strategy: find all text blocks that look like "Titulares:" sections
  // The page text contains sections like:
  // "EQUIPO_NAME Titulares: 25 SERRANO FONTECHA, JON 4 RICO PINTO, ..."
  
  // Better strategy: parse the raw text for player lists
  const allText = bodyText.replace(/eval\(function\([^)]*\)\{[^}]*\}[^)]*\)/g, ''); // Remove JS
  
  // Find team sections - separated by "Titulares:" keyword
  const teamSections = allText.split(/Titulares\s*:/i);
  
  for (let secIdx = 1; secIdx < teamSections.length && secIdx <= 2; secIdx++) {
    const section = teamSections[secIdx];
    const players = [];
    
    // Extract player entries: dorsal (number) followed by SURNAME, Name format
    // Pattern: number + space + UPPERCASE_NAME, Name_part
    const playerPattern = /(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]+,\s*[A-ZÁÉÍÓÚÑÜa-záéíóúñü][A-ZÁÉÍÓÚÑÜa-záéíóúñü\s]*)/g;
    let match;
    while ((match = playerPattern.exec(section)) !== null) {
      const dorsal = match[1];
      let nombre = cleanText(match[2]);
      // Clean trailing garbage
      nombre = nombre.replace(/\s*eval\(.*/i, '').replace(/\s*ntype\(.*/i, '').trim();
      if (nombre.length > 3 && nombre.length < 80) {
        players.push({ dorsal, nombre, titular: true });
      }
    }
    
    // Check for "Suplentes:" marker to split titulares/suplentes
    const suplentesIdx = section.indexOf('Suplentes');
    if (suplentesIdx > 0) {
      const titularesText = section.substring(0, suplentesIdx);
      const titularCount = (titularesText.match(/\d{1,2}\s+[A-ZÁÉÍÓÚÑÜ]/g) || []).length;
      for (let i = titularCount; i < players.length; i++) {
        players[i].titular = false;
      }
    } else if (players.length > 11) {
      // Default: first 11 are titulares
      for (let i = 11; i < players.length; i++) {
        players[i].titular = false;
      }
    }
    
    if (secIdx === 1) report.alineacion_local = players;
    else report.alineacion_visitante = players;
  }

  // ========== GOALS ==========
  // Goals appear in the text as: "0 - 1 PLAYER_NAME (minute')"
  // Pattern: score_line followed by player + minute
  const goalPattern = /(\d+)\s*-\s*(\d+)\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)\s*\((\d+)['\s]*\)/g;
  let goalMatch;
  while ((goalMatch = goalPattern.exec(allText)) !== null) {
    const scoreBefore = parseInt(goalMatch[1]);
    const scoreAfter = parseInt(goalMatch[2]);
    const jugador = cleanText(goalMatch[3]);
    const minuto = goalMatch[4];
    
    if (jugador.length > 3 && jugador.length < 80) {
      report.goles.push({
        minuto,
        jugador,
        equipo: '' // Will determine from alineaciones later
      });
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
      // Try partial match (surname only)
      const surname = upperName.split(',')[0].trim();
      const isLocal = [...localNames].some(n => n.startsWith(surname));
      const isVisitante = [...visitanteNames].some(n => n.startsWith(surname));
      gol.equipo = isLocal ? 'local' : isVisitante ? 'visitante' : '';
    }
  }

  // ========== CARDS (tarjetas) ==========
  // Cards typically appear in specific table rows or text patterns
  // Yellow card symbols: 🟡 or text "Amonestado", "T.A."
  // Red card symbols: 🔴 or text "Expulsado", "T.R."
  
  // Look for card patterns in tables
  $('table').each((_, table) => {
    const rows = $(table).find('tr').toArray();
    for (const row of rows) {
      const rowHtml = $(row).html() || '';
      const rowText = cleanText($(row).text());
      
      // Check for yellow/red card images or text
      const hasYellow = rowHtml.includes('tarjeta_amarilla') || rowHtml.includes('yellow') || 
                        rowText.includes('T.A.') || rowText.includes('Amonest');
      const hasRed = rowHtml.includes('tarjeta_roja') || rowHtml.includes('red') ||
                     rowText.includes('T.R.') || rowText.includes('Expuls');
      
      if (!hasYellow && !hasRed) continue;
      
      const tipo = hasRed ? 'roja' : 'amarilla';
      // Extract player name and minute
      const cardNameMatch = rowText.match(/([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)\s*(?:\((\d+)['\s]*\))?/);
      if (cardNameMatch && cardNameMatch[1].length > 3) {
        report.tarjetas.push({
          minuto: cardNameMatch[2] || '',
          jugador: cleanText(cardNameMatch[1]).substring(0, 80),
          equipo: '',
          tipo
        });
      }
    }
  });

  // ========== SUBSTITUTIONS ==========
  // Substitutions: "Sale: PLAYER_A Entra: PLAYER_B (min')"
  const cambioPattern = /(?:Sale|Sustitu)[:\s]*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)[\s]*(?:Entra|por)[:\s]*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,]+?)[\s]*(?:\((\d+)['\s]*\))?/gi;
  let cambioMatch;
  while ((cambioMatch = cambioPattern.exec(allText)) !== null) {
    const sale = cleanText(cambioMatch[1]);
    const entra = cleanText(cambioMatch[2]);
    const minuto = cambioMatch[3] || '';
    if (sale.length > 3 && entra.length > 3 && sale.length < 80 && entra.length < 80) {
      report.cambios.push({ minuto, sale, entra, equipo: '' });
    }
  }

  // ========== CAMPO ==========
  // Try to find campo info
  const campoMatch = bodyText.match(/Campo[:\s]+([^\n\r]+)/i);
  if (campoMatch) {
    let c = cleanText(campoMatch[1]);
    c = c.replace(/\s*\(H\.?A\.?\)\s*-\s*.*/i, '').replace(/\s*-\s*Hierba\s*.*/i, '').replace(/\s*-\s*Tierra\s*.*/i, '').replace(/\s*-\s*Cesped\s*.*/i, '').trim();
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
    const html = await (await fetch(acta_url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies } })).text();

    // Debug mode: return raw text for analysis
    if (action === 'debug_html') {
      const $ = load(html);
      // Remove scripts
      $('script').remove();
      $('style').remove();
      const cleanedText = $('body').text().replace(/\s+/g, ' ').trim();
      return Response.json({ 
        success: true, 
        htmlLength: html.length,
        textPreview: cleanedText.substring(0, 5000),
        textLength: cleanedText.length
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
      competicion: parsed.competicion || '',
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