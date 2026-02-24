import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * RFFM Schedule Monitor — runs every 6 hours
 * For each category with a configured RFFM URL:
 *   1. Fetches next Bustarviejo match from the intranet
 *   2. Compares with existing convocatoria (if any)
 *   3. If date/time/venue changed → updates convocatoria + sends chat message
 */

// ---- Inline RFFM helpers (same as rffmScraper but self-contained) ----

async function rffmLogin() {
  const rffmUser = Deno.env.get('RFFM_USER');
  const rffmPass = Deno.env.get('RFFM_PASSWORD');
  if (!rffmUser || !rffmPass) throw new Error('RFFM credentials not configured');
  const baseResp = await fetch('https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion', {
    redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const cookieMap = {};
  const addCookies = (resp) => {
    for (const c of (resp.headers.getSetCookie?.() || [])) {
      const name = c.split(';')[0].split('=')[0].trim();
      cookieMap[name] = c.split(';')[0];
    }
  };
  addCookies(baseResp);
  const loginUrl = baseResp.headers.get('location') || 'https://intranet.ffmadrid.es/nfg/NLogin';
  const fullLoginUrl = loginUrl.startsWith('http') ? loginUrl : `https://intranet.ffmadrid.es${loginUrl}`;
  const loginPageResp = await fetch(fullLoginUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; ') } });
  addCookies(loginPageResp);
  const loginHtml = await loginPageResp.text();
  const $ = load(loginHtml);
  let formAction = $('form').attr('action') || '/nfg/NLogin';
  if (!formAction.startsWith('http')) formAction = `https://intranet.ffmadrid.es${formAction}`;
  const hiddenFields = {};
  $('input[type="hidden"]').each((_, el) => { const name = $(el).attr('name'); if (name) hiddenFields[name] = $(el).attr('value') || ''; });
  const userField = $('input[type="text"]').attr('name') || 'NUser';
  const passField = $('input[type="password"]').attr('name') || 'NPass';
  const loginResp = await fetch(formAction, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; '), 'Referer': fullLoginUrl },
    body: new URLSearchParams({ ...hiddenFields, [userField]: rffmUser, [passField]: rffmPass }).toString()
  });
  addCookies(loginResp);
  let redirectUrl = loginResp.headers.get('location');
  let maxR = 5;
  while (redirectUrl && maxR-- > 0) {
    const full = redirectUrl.startsWith('http') ? redirectUrl : `https://intranet.ffmadrid.es${redirectUrl}`;
    const r = await fetch(full, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': Object.values(cookieMap).join('; ') } });
    addCookies(r);
    redirectUrl = r.headers.get('location');
  }
  return Object.values(cookieMap).join('; ');
}

async function fetchPage(url, cookies) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies } });
  return await resp.text();
}

function extractParams(url) {
  const u = new URL(url);
  return {
    cod_primaria: u.searchParams.get('cod_primaria') || '1000128',
    CodCompeticion: u.searchParams.get('CodCompeticion') || u.searchParams.get('codcompeticion'),
    CodGrupo: u.searchParams.get('CodGrupo') || u.searchParams.get('codgrupo'),
    CodTemporada: u.searchParams.get('CodTemporada') || u.searchParams.get('codtemporada'),
  };
}

function buildJornadaUrl(p, jornada) {
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${p.cod_primaria}&CodCompeticion=${p.CodCompeticion}&CodGrupo=${p.CodGrupo}&CodTemporada=${p.CodTemporada}&CodJornada=${jornada}&cod_agrupacion=1&Sch_Tipo_Juego=`;
}

function parseJornadaMatches(html) {
  const $ = load(html);
  const matches = [];
  const tables = $('table').toArray();
  let currentCampo = null;
  for (let i = 3; i < tables.length; i++) {
    const table = tables[i];
    const tableHtml = $(table).html() || '';
    const hasEscudo = tableHtml.includes('escudo_clb') || tableHtml.includes('pimg/Clubes');
    if (!hasEscudo) {
      const text = $(table).text().replace(/\s+/g, ' ').trim();
      const campoFull = text.match(/Campo:\s*(.+)/);
      if (campoFull) { let c = campoFull[1].trim(); c = c.replace(/\s*\(H\.?A\.?\)\s*-\s*.*/i, '').replace(/\s*-\s*Hierba\s*.*/i, '').replace(/\s*-\s*Tierra\s*.*/i, '').replace(/\s*-\s*Cesped\s*.*/i, '').trim(); if (c) currentCampo = c; }
      continue;
    }
    const tds = $(table).find('td').toArray();
    if (tds.length < 3) continue;
    const localName = $(tds[0]).find('span').first().text().trim() || $(tds[0]).text().replace(/\s+/g, ' ').trim();
    const visitanteName = $(tds[2]).find('span').first().text().trim() || $(tds[2]).text().replace(/\s+/g, ' ').trim();
    if (!localName || !visitanteName) continue;
    const centerText = $(tds[1]).text().replace(/\s+/g, ' ').trim();
    let golesLocal = null, golesVisitante = null, jugado = false, fecha = null, hora = null;
    const dateMatch = centerText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
    if (dateMatch) fecha = dateMatch[1].replace(/-/g, '/');
    const timeMatch = centerText.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) hora = timeMatch[1];
    let textWithoutDate = centerText;
    if (dateMatch) textWithoutDate = textWithoutDate.replace(dateMatch[0], '');
    if (timeMatch) textWithoutDate = textWithoutDate.replace(timeMatch[0], '');
    textWithoutDate = textWithoutDate.trim();
    const scoreMatch = textWithoutDate.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (scoreMatch) { golesLocal = parseInt(scoreMatch[1]); golesVisitante = parseInt(scoreMatch[2]); jugado = true; }
    let matchCampo = currentCampo;
    if (tds.length > 3) {
      const campoText = $(tds[3]).text().replace(/\s+/g, ' ').trim();
      const campoMatch = campoText.match(/Campo:\s*(.+?)(?:\s*-\s*Hierba|\s*-\s*Tierra|\s*-\s*Cesped|$)/i);
      if (campoMatch) matchCampo = campoMatch[1].replace(/\s*\(HA\)\s*$/i, '').replace(/\s*\(H\.A\.\)\s*$/i, '').trim();
      else { const simpleCampo = campoText.match(/Campo:\s*(.+)/); if (simpleCampo) matchCampo = simpleCampo[1].trim(); }
    }
    matches.push({ local: localName, visitante: visitanteName, goles_local: golesLocal, goles_visitante: golesVisitante, jugado, fecha, hora, campo: matchCampo });
  }
  return matches;
}

async function findNextMatch(url, cookies) {
  const p = extractParams(url);
  // Only scan 15 jornadas max, starting from a reasonable point
  // First detect total, then scan backwards from last played +1
  const j1Html = await fetchPage(buildJornadaUrl(p, 1), cookies);
  const total = detectTotalJornadas(j1Html);
  
  // Quick scan: check last few jornadas to find where we are
  for (let j = 1; j <= Math.min(total, 30); j++) {
    const html = j === 1 ? j1Html : await fetchPage(buildJornadaUrl(p, j), cookies);
    const matches = parseJornadaMatches(html);
    const bust = matches.find(m =>
      !m.jugado &&
      (m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO')) &&
      !m.local?.toUpperCase().includes('DESCANSA') &&
      !m.visitante?.toUpperCase().includes('DESCANSA')
    );
    if (bust) return { jornada: j, match: bust };
  }
  return { match: null };
}

function detectTotalJornadas(html) {
  const $ = load(html);
  let maxJornada = 0;
  $('select option').each((_, opt) => { const num = parseInt($(opt).attr('value')); if (!isNaN(num) && num > 0 && num < 100 && num > maxJornada) maxJornada = num; });
  return maxJornada || 30;
}

// ---- End RFFM helpers ----

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const cookies = await rffmLogin();

    // 1. Get all StandingsConfig with results URL
    const configs = await base44.asServiceRole.entities.StandingsConfig.list();
    const activeConfigs = configs.filter(c => c.rfef_results_url || c.rfef_url);

    if (!activeConfigs.length) {
      return Response.json({ success: true, message: 'No configs with RFFM URLs', changes: [] });
    }

    // 2. Get all open convocatorias (not closed, not cancelled)
    const today = new Date().toISOString().split('T')[0];
    const allCallups = await base44.asServiceRole.entities.Convocatoria.list('-fecha_partido');
    const openCallups = allCallups.filter(c => 
      c.publicada && !c.cerrada && c.estado_convocatoria !== 'cancelada' && c.fecha_partido >= today
    );

    const changes = [];
    const errors = [];

    // 3. Only check categories that have an open convocatoria (saves huge time)
    const categoriesWithCallups = new Set(openCallups.map(c => c.categoria));
    const relevantConfigs = activeConfigs.filter(c => categoriesWithCallups.has(c.categoria));

    for (const config of relevantConfigs) {
      try {
        const url = config.rfef_results_url || config.rfef_url;
        
        const result = await findNextMatch(url, cookies);
        const match = result?.match;
        if (!match) continue;

        const jornada = result?.jornada;

        // Parse RFFM date (dd/mm/yyyy) to ISO (yyyy-mm-dd)
        let matchDate = null;
        if (match.fecha) {
          const parts = match.fecha.split('/');
          if (parts.length === 3) {
            matchDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        // Find matching convocatoria for this category
        const callup = openCallups.find(c => c.categoria === config.categoria);
        if (!callup) continue; // No convocatoria for this category, skip

        // Compare: date, time, venue
        const dateChanged = matchDate && callup.fecha_partido !== matchDate;
        const timeChanged = match.hora && callup.hora_partido !== match.hora;
        const venueChanged = match.campo && callup.ubicacion && 
          !callup.ubicacion.toUpperCase().includes(match.campo.toUpperCase()) &&
          !match.campo.toUpperCase().includes(callup.ubicacion.toUpperCase());

        if (!dateChanged && !timeChanged && !venueChanged) continue;

        // Something changed! Build update data
        const updateData = {};
        const changeParts = [];

        if (dateChanged) {
          updateData.fecha_partido_original = callup.fecha_partido;
          updateData.fecha_partido = matchDate;
          const dateFormatted = new Date(matchDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
          changeParts.push(`📅 Fecha: ${dateFormatted}`);
        }

        if (timeChanged) {
          if (!updateData.hora_partido_original) updateData.hora_partido_original = callup.hora_partido;
          updateData.hora_partido = match.hora;
          changeParts.push(`🕐 Hora: ${match.hora}`);
        }

        if (venueChanged) {
          updateData.ubicacion = match.campo;
          changeParts.push(`📍 Campo: ${match.campo}`);
        }

        updateData.estado_convocatoria = 'reprogramada';
        updateData.motivo_cambio = `Cambio detectado automáticamente desde RFFM (Jornada ${jornada})`;

        // Update the convocatoria
        await base44.asServiceRole.entities.Convocatoria.update(callup.id, updateData);

        // Send chat message to the team
        const grupo_id = config.categoria;
        const isLocal = match.local?.toUpperCase().includes('BUSTARVIEJO');
        const rival = isLocal ? match.visitante : match.local;

        const mensaje = `⚠️ *CAMBIO DE HORARIO* ⚠️\n\n` +
          `Partido: CD Bustarviejo vs ${rival}\n` +
          `Jornada: ${jornada}\n\n` +
          `Cambios detectados:\n${changeParts.join('\n')}\n\n` +
          `${isLocal ? '🏠 Local' : '✈️ Visitante'}\n\n` +
          `ℹ️ La convocatoria ha sido actualizada automáticamente.`;

        await base44.asServiceRole.entities.ChatMessage.create({
          remitente_email: 'sistema@cdbustarviejo.es',
          remitente_nombre: '🤖 Sistema CD Bustarviejo',
          mensaje,
          tipo: 'admin_a_grupo',
          deporte: config.categoria,
          grupo_id,
          prioridad: 'Urgente',
          anclado: true,
          anclado_por: 'sistema@cdbustarviejo.es',
          anclado_fecha: new Date().toISOString(),
        });

        changes.push({
          categoria: config.categoria,
          rival,
          jornada,
          changes: changeParts,
          callup_id: callup.id,
        });

      } catch (err) {
        errors.push({ categoria: config.categoria, error: err.message });
      }
    }

    return Response.json({
      success: true,
      checked: relevantConfigs.length,
      categories_with_callups: [...categoriesWithCallups],
      changes,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});