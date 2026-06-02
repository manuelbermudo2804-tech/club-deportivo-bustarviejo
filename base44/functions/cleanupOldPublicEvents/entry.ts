// Limpia eventos antiguos del tracking público (>30 días)
// para evitar que UploadDiagnostic crezca sin control.
// Ejecutado por automatización diaria.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Permitir invocación tanto por automatización (sin user) como manual por admin
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let totalBorrados = 0;
    let totalRevisados = 0;
    const MAX_REVISAR = 1000; // tope de seguridad por ejecución

    // Traer en orden ascendente (los más antiguos primero) por lotes
    let skip = 0;
    const PAGE_SIZE = 100;

    while (totalRevisados < MAX_REVISAR) {
      const items = await base44.asServiceRole.entities.UploadDiagnostic.list(
        'created_date',
        PAGE_SIZE,
        skip
      );
      if (!items || items.length === 0) break;

      let salir = false;
      for (const evt of items) {
        totalRevisados++;
        const ts = new Date(evt.created_date).getTime();
        // Si llegamos a uno reciente, ya no hay más antiguos por borrar
        if (ts >= cutoffMs) { salir = true; break; }
        // Solo borramos los del tracking público
        if (!(evt.context || '').startsWith('PublicAccessRequest')) continue;
        try {
          await base44.asServiceRole.entities.UploadDiagnostic.delete(evt.id);
          totalBorrados++;
        } catch (err) {
          console.error('No se pudo borrar', evt.id, err.message);
        }
      }
      if (salir || items.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return Response.json({
      ok: true,
      borrados: totalBorrados,
      revisados: totalRevisados,
      cutoff: new Date(cutoffMs).toISOString(),
    });
  } catch (error) {
    console.error('cleanupOldPublicEvents error:', error?.message);
    return Response.json({ ok: false, error: error?.message }, { status: 500 });
  }
});