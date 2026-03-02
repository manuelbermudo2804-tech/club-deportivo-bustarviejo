import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { load } from 'npm:cheerio@1.0.0';

/**
 * RFFM Schedule Monitor — runs every 6 hours (v2 - with auto-callup creation)
 * For each category with a configured RFFM URL:
 *   1. Fetches next Bustarviejo match from the intranet
 *   2. If no convocatoria exists → creates a draft (publicada: false)
 *   3. If convocatoria exists and date/time/venue changed → updates it + notifies
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
  // RFFM pages use ISO-8859-1 (Latin-1) encoding - decode correctly to preserve ñ, á, é, etc.
  const buf = await resp.arrayBuffer();
  const ct = resp.headers.get('content-type') || '';
  const charsetMatch = ct.match(/charset=([^\s;]+)/i);
  const charset = charsetMatch ? charsetMatch[1] : 'iso-8859-1';
  return new TextDecoder(charset).decode(buf);
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

async function findNextMatch(url, cookies, lastKnownJornada) {
  const p = extractParams(url);
  // Start from last known jornada (from ProximoPartido) to avoid scanning played jornadas
  const startFrom = Math.max(1, (lastKnownJornada || 1) - 1); // -1 as safety margin
  
  // First fetch to detect total jornadas
  const firstHtml = await fetchPage(buildJornadaUrl(p, startFrom), cookies);
  const total = detectTotalJornadas(firstHtml);
  
  // Scan from startFrom onwards (max 8 jornadas ahead should be enough)
  const maxScan = Math.min(total, startFrom + 8);
  for (let j = startFrom; j <= maxScan; j++) {
    const html = j === startFrom ? firstHtml : await fetchPage(buildJornadaUrl(p, j), cookies);
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

// ---- Update recent results on ProximoPartido ----

async function updateRecentResults(activeConfigs, cookies, base44) {
  // Get all ProximoPartido that are not yet marked as played
  const allProximos = await base44.asServiceRole.entities.ProximoPartido.list('-updated_date', 200);
  const unplayed = allProximos.filter(p => !p.jugado);
  if (!unplayed.length) return;

  // For efficiency, only check categories that have unplayed matches with dates <= today
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const candidatesByCat = {};
  for (const p of unplayed) {
    let matchDate = null;
    if (p.fecha_iso) {
      matchDate = new Date(p.fecha_iso);
    } else if (p.fecha) {
      const parts = p.fecha.split('/');
      if (parts.length === 3) matchDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    // Only check matches that should have been played (date <= today)
    if (matchDate && matchDate <= today) {
      if (!candidatesByCat[p.categoria]) candidatesByCat[p.categoria] = [];
      candidatesByCat[p.categoria].push(p);
    }
  }

  if (!Object.keys(candidatesByCat).length) return;

  // For each category with candidates, fetch the relevant jornada from RFFM
  for (const config of activeConfigs) {
    const candidates = candidatesByCat[config.categoria];
    if (!candidates?.length) continue;

    const url = config.rfef_results_url || config.rfef_url;
    if (!url) continue;
    const p = extractParams(url);

    for (const candidate of candidates) {
      if (!candidate.jornada) continue;
      try {
        const html = await fetchPage(buildJornadaUrl(p, candidate.jornada), cookies);
        const matches = parseJornadaMatches(html);
        
        // Find the Bustarviejo match in this jornada
        const bustMatch = matches.find(m =>
          m.jugado &&
          (m.local?.toUpperCase().includes('BUSTARVIEJO') || m.visitante?.toUpperCase().includes('BUSTARVIEJO'))
        );
        
        if (bustMatch) {
          // Safety: skip 0-0 results for matches played today — RFFM often shows 0-0 temporarily
          // before the real score is uploaded. Only trust 0-0 if the match was at least yesterday.
          const isZeroZero = bustMatch.goles_local === 0 && bustMatch.goles_visitante === 0;
          const now = new Date();
          let matchDateObj = null;
          if (candidate.fecha_iso) {
            matchDateObj = new Date(candidate.fecha_iso + 'T23:59:59');
          } else if (candidate.fecha) {
            const parts = candidate.fecha.split('/');
            if (parts.length === 3) matchDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 23, 59, 59);
          }
          const isToday = matchDateObj && (now.toDateString() === matchDateObj.toDateString());
          
          if (isZeroZero && isToday) {
            console.log(`[rffmScheduleMonitor] Ignorando resultado 0-0 de hoy (posible resultado pendiente): ${candidate.categoria} J${candidate.jornada}`);
          } else {
            await base44.asServiceRole.entities.ProximoPartido.update(candidate.id, {
              jugado: true,
              goles_local: bustMatch.goles_local,
              goles_visitante: bustMatch.goles_visitante,
            });
            console.log(`[rffmScheduleMonitor] Resultado actualizado: ${candidate.categoria} J${candidate.jornada} → ${bustMatch.goles_local}-${bustMatch.goles_visitante}`);
          }
        }
      } catch (e) {
        console.error(`[rffmScheduleMonitor] Error checking result ${candidate.categoria} J${candidate.jornada}:`, e.message);
      }
    }
  }
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

    // 2. Get all convocatorias (open = not closed, not cancelled, future)
    const today = new Date().toISOString().split('T')[0];
    const allCallups = await base44.asServiceRole.entities.Convocatoria.list('-fecha_partido');
    const openCallups = allCallups.filter(c => 
      !c.cerrada && c.estado_convocatoria !== 'cancelada' && c.fecha_partido >= today
    );

    const changes = [];
    const created = [];
    const errors = [];

    // 2b. Update ProximoPartido with results for recently played matches
    try {
      await updateRecentResults(activeConfigs, cookies, base44);
    } catch (resErr) {
      errors.push({ categoria: 'global', error: 'updateRecentResults: ' + resErr.message });
    }

    // 2c. Get all ProximoPartido for sync
    const allProximos = await base44.asServiceRole.entities.ProximoPartido.list('-updated_date', 200);

    // Build map of last known jornada per category (to skip already-scanned jornadas)
    const lastJornadaByCategory = {};
    for (const p of allProximos) {
      const current = lastJornadaByCategory[p.categoria] || 0;
      if (p.jornada && p.jornada > current) lastJornadaByCategory[p.categoria] = p.jornada;
    }

    // 3. Process categories in parallel (batches of 3 to avoid overloading RFFM)
    const processCategory = async (config) => {
      try {
        const url = config.rfef_results_url || config.rfef_url;
        const lastKnown = lastJornadaByCategory[config.categoria] || 1;
        
        const result = await findNextMatch(url, cookies, lastKnown);
        const match = result?.match;
        if (!match) return null;

        const jornada = result?.jornada;

        // Parse RFFM date (dd/mm/yyyy) to ISO (yyyy-mm-dd)
        let matchDate = null;
        if (match.fecha) {
          const parts = match.fecha.split('/');
          if (parts.length === 3) {
            matchDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        const isLocal = match.local?.toUpperCase().includes('BUSTARVIEJO');
        const rival = isLocal ? match.visitante : match.local;

        // --- SYNC ProximoPartido: create or update ---
        const existingProximo = allProximos.find(p => 
          p.categoria === config.categoria && p.jornada === jornada
        );
        const proximoData = {
          categoria: config.categoria,
          jornada,
          local: match.local || '',
          visitante: match.visitante || '',
          fecha: match.fecha || '',
          hora: match.hora || '',
          campo: match.campo || '',
          fecha_iso: matchDate || '',
          jugado: false,
        };
        if (existingProximo) {
          // Update if date/time/venue changed
          const changed = existingProximo.fecha !== proximoData.fecha ||
            existingProximo.hora !== proximoData.hora ||
            existingProximo.campo !== proximoData.campo;
          if (changed && !existingProximo.jugado) {
            await base44.asServiceRole.entities.ProximoPartido.update(existingProximo.id, proximoData);
            console.log(`[rffmScheduleMonitor] ProximoPartido updated: ${config.categoria} J${jornada}`);
          }
        } else {
          await base44.asServiceRole.entities.ProximoPartido.create(proximoData);
          console.log(`[rffmScheduleMonitor] ProximoPartido created: ${config.categoria} J${jornada}`);
        }

        // Find matching convocatoria for this category AND jornada to prevent duplicates
        // Check both open callups and ALL recent callups for this jornada
        const callup = openCallups.find(c => c.categoria === config.categoria);

        // Also check if a convocatoria already exists for this specific jornada+category (even if closed/past)
        const existingForJornada = allCallups.find(c => 
          c.categoria === config.categoria && 
          c.titulo?.includes(`Jornada ${jornada}`)
        );

        // --- FASE 4: Auto-create draft if no convocatoria exists ---
        if (!callup && !existingForJornada) {
          if (!matchDate) continue; // Can't create without a date

          // Get active players for this category
          const players = await base44.asServiceRole.entities.Player.filter({ 
            categoria_principal: config.categoria, activo: true 
          });
          const jugadores_convocados = players.map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            email_padre: p.email_padre || '',
            email_jugador: p.email_jugador || '',
            confirmacion: 'pendiente',
          }));

          await base44.asServiceRole.entities.Convocatoria.create({
            titulo: `Jornada ${jornada} vs ${rival}`,
            categoria: config.categoria,
            tipo: 'Partido',
            rival,
            fecha_partido: matchDate,
            hora_partido: match.hora || '00:00',
            ubicacion: match.campo || 'Por confirmar',
            local_visitante: isLocal ? 'Local' : 'Visitante',
            jugadores_convocados,
            entrenador_email: 'sistema@cdbustarviejo.es',
            entrenador_nombre: 'Sistema automático',
            publicada: false,
            descripcion: `Convocatoria creada automáticamente desde RFFM (Jornada ${jornada}). Revisa y publica cuando esté lista.`,
          });

          created.push({ categoria: config.categoria, rival, jornada, fecha: matchDate });
          return null;
        }

        // --- Existing callup: check for changes ---
        if (!callup) return null; // existingForJornada exists but no open callup to update
        const dateChanged = matchDate && callup.fecha_partido !== matchDate;
        const timeChanged = match.hora && callup.hora_partido !== match.hora;
        const venueChanged = match.campo && callup.ubicacion && 
          !callup.ubicacion.toUpperCase().includes(match.campo.toUpperCase()) &&
          !match.campo.toUpperCase().includes(callup.ubicacion.toUpperCase());

        if (!dateChanged && !timeChanged && !venueChanged) return null;

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

        const mensaje = `⚠️ *CAMBIO DE HORARIO DE PARTIDO* ⚠️\n\n` +
          `Partido: CD Bustarviejo vs ${rival}\n` +
          `Categoría: ${config.categoria}\n` +
          `Jornada: ${jornada}\n\n` +
          `Cambios detectados:\n${changeParts.join('\n')}\n\n` +
          `${isLocal ? '🏠 Local' : '✈️ Visitante'}\n\n` +
          `ℹ️ Información actualizada automáticamente desde la Federación (RFFM).`;

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

        // Email a padres de jugadores convocados
        if (callup.jugadores_convocados?.length) {
          const emailsToNotify = new Set();
          for (const jc of callup.jugadores_convocados) {
            if (jc.email_padre) emailsToNotify.add(jc.email_padre);
            if (jc.email_jugador) emailsToNotify.add(jc.email_jugador);
          }
          const dateFormatted = matchDate ? new Date(matchDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : callup.fecha_partido;
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(to right, #ea580c, #c2410c); padding: 20px; border-radius: 12px 12px 0 0;">
                <h2 style="color: white; margin: 0;">⚠️ Cambio de horario de partido - ${config.categoria}</h2>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p>La <strong>Federación (RFFM)</strong> ha modificado el horario del partido de <strong>${config.categoria}</strong>:</p>
                <p style="font-size: 18px; font-weight: bold;">CD Bustarviejo vs ${rival}</p>
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0;">
                  <p style="margin: 0; font-weight: bold;">Cambios detectados:</p>
                  ${changeParts.map(cp => `<p style="margin: 4px 0;">${cp}</p>`).join('')}
                </div>
                <p><strong>Jornada:</strong> ${jornada}</p>
                <p><strong>Condición:</strong> ${isLocal ? '🏠 Local' : '✈️ Visitante'}</p>
                <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Información actualizada automáticamente desde la web de la Federación. La convocatoria del entrenador puede llegar por separado.</p>
              </div>
            </div>`;
          for (const email of emailsToNotify) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: `⚠️ Cambio de horario de partido - ${config.categoria} vs ${rival}`,
                body: emailBody,
                from_name: 'CD Bustarviejo',
              });
            } catch (emailErr) { /* ignore individual email failures */ }
          }
        }

        changes.push({
          categoria: config.categoria,
          rival,
          jornada,
          changes: changeParts,
          callup_id: callup.id,
        });

      } catch (err) {
        errors.push({ categoria: config.categoria, error: err.message });
        return null;
      }
    };

    // Run in parallel batches of 3
    for (let i = 0; i < activeConfigs.length; i += 3) {
      const batch = activeConfigs.slice(i, i + 3);
      await Promise.all(batch.map(c => processCategory(c)));
    }

    return Response.json({
      success: true,
      checked: activeConfigs.length,
      changes,
      created,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    // Alert admin on failure
    try {
      const base44Err = createClientFromRequest(req);
      const admins = await base44Err.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44Err.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: '🚨 Error en monitor de horarios RFFM',
          body: `<div style="font-family: Arial; max-width: 600px;"><div style="background: #dc2626; padding: 16px; border-radius: 12px 12px 0 0;"><h2 style="color: white; margin: 0;">🚨 Fallo en rffmScheduleMonitor</h2></div><div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;"><p>El monitor de horarios ha fallado:</p><pre style="background: #f1f5f9; padding: 12px; border-radius: 8px; overflow-x: auto;">${error.message}</pre><p style="color: #64748b; font-size: 12px;">Fecha: ${new Date().toISOString()}</p></div></div>`,
          from_name: 'CD Bustarviejo',
        });
      }
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});