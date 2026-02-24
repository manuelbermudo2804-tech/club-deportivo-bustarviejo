import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RFFM Schedule Monitor — runs every 6 hours
 * For each category with a configured RFFM URL:
 *   1. Fetches next Bustarviejo match from the intranet
 *   2. Compares with existing convocatoria (if any)
 *   3. If date/time/venue changed → updates convocatoria + sends chat message
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

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

    // 3. For each category, check next match
    for (const config of activeConfigs) {
      try {
        const url = config.rfef_results_url || config.rfef_url;
        
        // Call the scraper for next match (use user-level invoke, not service role, because rffmScraper checks admin role)
        const res = await base44.functions.invoke('rffmScraper', {
          action: 'next_match',
          url,
          jornada: 1, // Start from 1 and it will scan forward
        });

        const match = res?.data?.match || res?.match;
        if (!match) continue;

        const jornada = res?.data?.jornada || res?.jornada;

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
      checked: activeConfigs.length,
      changes,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});