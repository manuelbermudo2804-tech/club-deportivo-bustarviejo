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
    let missingPlayer = 0;
    let skipped = 0;
    let processed = 0;
    let rounds = 0;
    const maxRounds = 500;
    let cursorDate = null; // created_date cursor para paginar por todo el dataset

    while (rounds < maxRounds) {
      rounds++;
      const query = cursorDate ? { created_date: { $lt: cursorDate } } : {};
      const payments = await base44.asServiceRole.entities.Payment.filter(query, '-created_date', 100);
      if (!payments || payments.length === 0) break;

      for (const pay of payments) {
        processed++;
        if (pay.email_padre) { skipped++; continue; }
        const player = await getPlayer(pay.jugador_id);
        if (!player) {
          missingPlayer++;
          try { await base44.asServiceRole.entities.Payment.update(pay.id, { email_padre: 'unknown@cdbustarviejo.com' }); } catch {}
          continue;
        }
        const patch = { email_padre: player.email_padre || 'unknown@cdbustarviejo.com' };
        if (player.email_tutor_2) patch.email_tutor_2 = player.email_tutor_2;
        try {
          await base44.asServiceRole.entities.Payment.update(pay.id, patch);
          updated++;
        } catch (e) {
          console.error('Failed to update payment', pay.id, e?.message);
        }
      }

      // Avanzar cursor al created_date más antiguo de esta página
      const last = payments[payments.length - 1];
      const lastDate = last?.created_date;
      if (!lastDate || lastDate === cursorDate) break;
      cursorDate = lastDate;
      if (payments.length < 100) break;
    }

    return Response.json({ ok: true, processed, updated, skipped, missingPlayer, rounds });
  } catch (error) {
    console.error('backfillPaymentEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});