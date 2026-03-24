import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Auto-close/delete callups for past matches.
 * Runs daily.
 * 
 * Rules:
 *  - Convocatoria with fecha_partido < today AND cerrada === false:
 *    - If publicada === false (draft) → DELETE it
 *    - If publicada === true → mark cerrada = true
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
    const allCallups = await base44.asServiceRole.entities.Convocatoria.list('-fecha_partido', 200);

    const deleted = [];
    const closed = [];

    for (const c of allCallups) {
      // Skip already closed or cancelled
      if (c.cerrada || c.estado_convocatoria === 'cancelada') continue;
      
      // Skip if no date
      if (!c.fecha_partido) continue;
      
      // Only process past matches (fecha_partido < today)
      if (c.fecha_partido >= today) continue;

      if (!c.publicada) {
        // Draft for a past match → delete it
        await base44.asServiceRole.entities.Convocatoria.delete(c.id);
        deleted.push({ id: c.id, titulo: c.titulo, categoria: c.categoria, fecha: c.fecha_partido });
      } else {
        // Published for a past match → close it
        await base44.asServiceRole.entities.Convocatoria.update(c.id, { cerrada: true });
        closed.push({ id: c.id, titulo: c.titulo, categoria: c.categoria, fecha: c.fecha_partido });
      }
    }

    // Also clean up old ProximoPartido records (played matches older than 7 days)
    const allProximos = await base44.asServiceRole.entities.ProximoPartido.list('-updated_date', 200);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    let proximosCleaned = 0;
    for (const p of allProximos) {
      if (p.jugado && p.fecha_iso && p.fecha_iso < sevenDaysAgoStr) {
        await base44.asServiceRole.entities.ProximoPartido.delete(p.id);
        proximosCleaned++;
      }
    }

    console.log(`[autoCloseCallups] Deleted ${deleted.length} drafts, closed ${closed.length} published callups, cleaned ${proximosCleaned} old ProximoPartido`);

    return Response.json({
      success: true,
      deleted: deleted.length,
      closed: closed.length,
      proximosCleaned,
      details: { deleted, closed },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});