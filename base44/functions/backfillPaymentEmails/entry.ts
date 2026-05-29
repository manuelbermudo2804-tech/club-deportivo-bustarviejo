import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Rellena email_padre y email_tutor_2 en todos los Payment existentes
// a partir del Player asociado, para que el RLS los muestre a las familias.
// Solo admin puede ejecutar.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Cache de jugadores para no consultar mil veces
    const playerCache = new Map();
    const getPlayer = async (id) => {
      if (!id) return null;
      if (playerCache.has(id)) return playerCache.get(id);
      try {
        const p = await base44.asServiceRole.entities.Player.get(id);
        playerCache.set(id, p);
        return p;
      } catch {
        playerCache.set(id, null);
        return null;
      }
    };

    let updated = 0;
    let skipped = 0;
    let missingPlayer = 0;
    let processed = 0;
    let page = 0;
    const pageSize = 200;

    while (true) {
      const payments = await base44.asServiceRole.entities.Payment.list('-created_date', pageSize, page * pageSize);
      if (!payments || payments.length === 0) break;

      for (const pay of payments) {
        processed++;
        if (pay.email_padre || pay.email_tutor_2) { skipped++; continue; }
        const player = await getPlayer(pay.jugador_id);
        if (!player) { missingPlayer++; continue; }
        const patch = {};
        if (player.email_padre) patch.email_padre = player.email_padre;
        if (player.email_tutor_2) patch.email_tutor_2 = player.email_tutor_2;
        if (Object.keys(patch).length === 0) { skipped++; continue; }
        try {
          await base44.asServiceRole.entities.Payment.update(pay.id, patch);
          updated++;
        } catch (e) {
          console.error('Failed to update payment', pay.id, e?.message);
        }
      }

      if (payments.length < pageSize) break;
      page++;
      if (page > 500) break; // safety
    }

    return Response.json({ ok: true, processed, updated, skipped, missingPlayer });
  } catch (error) {
    console.error('backfillPaymentEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});