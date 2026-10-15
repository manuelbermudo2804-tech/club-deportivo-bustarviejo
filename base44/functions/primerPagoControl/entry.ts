import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Control del "primer pago para confirmar plaza".
// - Al CREARSE la primera cuota (mes Junio) de un jugador cuya categoría lo exige
//   y que no está exento → el jugador queda fuera de convocatorias (bloqueo_primer_pago).
// - Al pasar esa cuota a "Pagado" → se quita el bloqueo automáticamente.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { event, data, old_data } = await req.json();
  if (!data?.jugador_id || data.mes !== 'Junio' || data.is_deleted) {
    return Response.json({ skipped: 'no es primera cuota' });
  }
  const db = base44.asServiceRole.entities;
  const player = await db.Player.get(data.jugador_id).catch(() => null);
  if (!player) return Response.json({ skipped: 'sin jugador' });

  // Pago confirmado → liberar
  if (data.estado === 'Pagado' && old_data?.estado !== 'Pagado') {
    if (player.bloqueo_primer_pago) {
      await db.Player.update(player.id, { bloqueo_primer_pago: false, bloqueo_convocatoria_activo: false });
      return Response.json({ liberado: player.nombre });
    }
    return Response.json({ skipped: 'no estaba bloqueado' });
  }

  // Nueva primera cuota pendiente → bloquear si la categoría lo exige
  if (event?.type === 'create' && data.estado !== 'Pagado') {
    if (player.exento_primer_pago) return Response.json({ skipped: 'exento' });
    const cats = await db.CategoryConfig.filter({ nombre: player.deporte, activa: true });
    if (!cats.some((c) => c.exigir_primer_pago === true)) return Response.json({ skipped: 'categoría no lo exige' });
    await db.Player.update(player.id, { bloqueo_primer_pago: true, bloqueo_convocatoria_activo: true });
    return Response.json({ bloqueado: player.nombre });
  }

  return Response.json({ skipped: 'sin cambios' });
});