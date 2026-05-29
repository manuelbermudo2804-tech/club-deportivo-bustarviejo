import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Detecta y opcionalmente anula pagos PENDIENTES que estén duplicados por
// (jugador_id + mes + temporada) cuando ya existe otro pago PAGADO/En revisión
// para esa misma cuota. Solo admin.
// Body: { apply: true } para aplicar cambios; sin él, solo reporta.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const apply = body.apply === true;

    // Carga por estado en páginas con cursor por created_date asc (más estable)
    const loadByEstado = async (estado) => {
      const out = [];
      const seen = new Set();
      let cursor = null;
      for (let i = 0; i < 50; i++) {
        const q = cursor ? { estado, created_date: { $gt: cursor } } : { estado };
        const batch = await base44.asServiceRole.entities.Payment.filter(q, 'created_date', 100);
        if (!batch.length) break;
        let added = 0;
        for (const p of batch) {
          if (seen.has(p.id)) continue;
          seen.add(p.id); out.push(p); added++;
        }
        const last = batch[batch.length - 1].created_date;
        if (added === 0 || last === cursor) break;
        cursor = last;
      }
      return out;
    };
    const [resolvedPagado, resolvedRevision, pendientes] = await Promise.all([
      loadByEstado('Pagado'),
      loadByEstado('En revisión'),
      loadByEstado('Pendiente'),
    ]);
    const all = [...resolvedPagado, ...resolvedRevision, ...pendientes];

    // Agrupar por jugador+mes+temporada
    const groups = {};
    for (const p of all) {
      if (p.is_deleted) continue;
      const key = `${p.jugador_id}|${p.mes}|${p.temporada}`;
      (groups[key] ||= []).push(p);
    }

    const duplicates = [];
    for (const [key, list] of Object.entries(groups)) {
      if (list.length < 2) continue;
      const hasResolved = list.some(p => p.estado === 'Pagado' || p.estado === 'En revisión');
      const pendientes = list.filter(p => p.estado === 'Pendiente');
      if (hasResolved && pendientes.length > 0) {
        for (const p of pendientes) {
          duplicates.push({
            id: p.id,
            key,
            jugador_nombre: p.jugador_nombre,
            mes: p.mes,
            temporada: p.temporada,
            cantidad: p.cantidad,
            email_padre: p.email_padre,
          });
        }
      }
    }

    let anulados = 0;
    if (apply) {
      for (const d of duplicates) {
        try {
          await base44.asServiceRole.entities.Payment.update(d.id, {
            estado: 'Anulado',
            notas: `Duplicado autodetectado — ya existe pago resuelto para ${d.mes} ${d.temporada}`,
          });
          anulados++;
        } catch (e) {
          console.error('update fail', d.id, e.message);
        }
      }
    }

    return Response.json({
      ok: true,
      total_payments_scanned: all.length,
      duplicates_found: duplicates.length,
      applied: apply,
      anulados,
      sample: duplicates.slice(0, 20),
    });
  } catch (error) {
    console.error('fixDuplicatePayments error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});