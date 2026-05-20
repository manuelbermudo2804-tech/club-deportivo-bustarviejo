import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Limpieza periódica: marca como "fallido" las submissions con pago pendiente
// que llevan más de 2 horas sin completarse. Las plazas quedan libres a los 30 min,
// pero limpiamos las "basura" del panel para que el admin no las vea como pendientes infinitamente.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Sólo admin o llamada programada (sin user)
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2 horas
    const candidatas = await base44.asServiceRole.entities.LandingSubmission.filter({
      pago_estado: 'pendiente',
    }, '-created_date', 500);

    let marcadas = 0;
    for (const s of (candidatas || [])) {
      const created = new Date(s.created_date).getTime();
      if (created < cutoff) {
        try {
          await base44.asServiceRole.entities.LandingSubmission.update(s.id, {
            pago_estado: 'fallido',
            estado: s.estado === 'pendiente_pago' ? 'cancelado' : s.estado,
          });
          marcadas++;
        } catch {}
      }
    }

    return Response.json({ ok: true, marcadas, total_revisadas: candidatas?.length || 0 });
  } catch (error) {
    console.error('cleanupAbandonedLandingPayments error:', error);
    return Response.json({ error: error.message || 'Error' }, { status: 500 });
  }
});