import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Función programada que bloquea automáticamente todas las porras
// cuando se pasa la fecha_limite_predicciones (snapshot final)
// Se ejecuta cada hora para detectar el momento del cierre.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const configs = await base44.asServiceRole.entities.PorraConfig.list();
    const config = configs[0];
    if (!config?.fecha_limite_predicciones) {
      return Response.json({ skip: true, reason: 'Sin fecha límite' });
    }

    const ahora = Date.now();
    const cierre = new Date(config.fecha_limite_predicciones).getTime();
    if (ahora < cierre) {
      return Response.json({ skip: true, reason: 'Aún no es la hora del cierre' });
    }

    // Actualizar estado de la porra a "cerrada" si seguía abierta
    if (config.estado === 'inscripciones_abiertas' || config.estado === 'preparacion') {
      await base44.asServiceRole.entities.PorraConfig.update(config.id, { estado: 'cerrada' });
    }

    // Bloquear todas las porras pagadas que aún no estén bloqueadas
    const participantes = await base44.asServiceRole.entities.PorraParticipante.filter({
      estado_pago: 'pagado',
      bloqueada: false,
    });

    const fechaBloqueo = new Date().toISOString();
    let bloqueados = 0;

    for (const p of participantes) {
      try {
        await base44.asServiceRole.entities.PorraParticipante.update(p.id, {
          bloqueada: true,
          fecha_bloqueo: fechaBloqueo,
        });
        bloqueados++;
      } catch (e) {
        console.error('Error bloqueando', p.id, e.message);
      }
    }

    return Response.json({ success: true, bloqueados, total: participantes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});