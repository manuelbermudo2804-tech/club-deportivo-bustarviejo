import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Restaura jugadores archivados en PlayerHistory de vuelta a Player.
// Solo admin. Permite filtrar por temporada y/o motivo_salida.
// Si dryRun=true, solo cuenta cuántos restauraría sin hacer cambios.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { temporada, motivo_salida, dryRun = false } = body;

    // Cargar todo el historial
    const allHistory = await base44.asServiceRole.entities.PlayerHistory.list();

    // Filtrar
    let toRestore = allHistory;
    if (temporada) {
      toRestore = toRestore.filter(h => h.ultima_temporada === temporada);
    }
    if (motivo_salida) {
      toRestore = toRestore.filter(h => h.motivo_salida === motivo_salida);
    }

    if (dryRun) {
      return Response.json({
        dryRun: true,
        wouldRestore: toRestore.length,
        sample: toRestore.slice(0, 5).map(h => ({ nombre: h.nombre, deporte: h.deporte, motivo: h.motivo_salida })),
      });
    }

    let restored = 0;
    const errors = [];

    for (const hist of toRestore) {
      try {
        const original = hist.datos_completos || {};
        // Limpiar campos del snapshot que no deben re-insertarse
        const {
          id, created_date, updated_date, created_by, created_by_id, is_sample,
          ...playerData
        } = original;

        // Asegurar que se reactiva
        playerData.activo = true;
        if (!playerData.estado_renovacion) playerData.estado_renovacion = 'renovado';

        await base44.asServiceRole.entities.Player.create(playerData);
        await base44.asServiceRole.entities.PlayerHistory.delete(hist.id);
        restored++;
      } catch (e) {
        console.error('[restorePlayersFromHistory] Error restoring', hist.nombre, e.message);
        errors.push({ nombre: hist.nombre, error: e.message });
      }
    }

    return Response.json({
      restored,
      total_evaluated: toRestore.length,
      errors: errors.length,
      error_details: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('[restorePlayersFromHistory] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});