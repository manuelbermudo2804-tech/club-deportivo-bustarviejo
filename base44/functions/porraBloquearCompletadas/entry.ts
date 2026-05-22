import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only: bloquea retroactivamente TODAS las porras que ya están al 100%
// pero todavía no tienen bloqueada=true (porque se completaron antes de la
// nueva regla de auto-bloqueo). Una sola ejecución.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todas las porras al 100% que NO estén bloqueadas
    const todas = await base44.asServiceRole.entities.PorraParticipante.filter({
      porcentaje_completado: 100,
    });
    const pendientes = todas.filter(p => !p.bloqueada);

    let bloqueadas = 0;
    const ahora = new Date().toISOString();
    for (const p of pendientes) {
      try {
        await base44.asServiceRole.entities.PorraParticipante.update(p.id, {
          bloqueada: true,
          fecha_bloqueo: ahora,
        });
        bloqueadas++;
      } catch (e) {
        console.error('[porraBloquearCompletadas] Error con', p.id, e?.message || e);
      }
    }

    return Response.json({
      success: true,
      total_al_100: todas.length,
      ya_bloqueadas: todas.length - pendientes.length,
      bloqueadas_ahora: bloqueadas,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});