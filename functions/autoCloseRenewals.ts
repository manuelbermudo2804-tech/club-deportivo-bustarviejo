import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener configuración activa
    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    const activeConfig = configs[0];

    if (!activeConfig || !activeConfig.permitir_renovaciones || !activeConfig.fecha_limite_renovaciones) {
      return Response.json({ message: 'No hay renovaciones activas o sin fecha límite', processed: 0 });
    }

    const fechaLimite = new Date(activeConfig.fecha_limite_renovaciones);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaLimite.setHours(0, 0, 0, 0);

    if (hoy <= fechaLimite) {
      return Response.json({ message: 'Fecha límite no alcanzada aún', processed: 0 });
    }

    // Obtener jugadores pendientes de esta temporada
    const pendientes = await base44.asServiceRole.entities.Player.filter({
      estado_renovacion: 'pendiente',
      temporada_renovacion: activeConfig.temporada
    });

    if (pendientes.length === 0) {
      return Response.json({ message: 'No hay jugadores pendientes de renovación', processed: 0 });
    }

    console.log(`[autoCloseRenewals] ${pendientes.length} jugadores sin renovar`);

    // Marcar como "no_renueva" y desactivar
    const processed = [];
    for (const player of pendientes) {
      await base44.asServiceRole.entities.Player.update(player.id, {
        estado_renovacion: 'no_renueva',
        activo: false,
        fecha_renovacion: new Date().toISOString(),
        observaciones: `${player.observaciones || ''}\n[Sistema] No renovado antes de fecha límite (${fechaLimite.toLocaleDateString('es-ES')})`.trim()
      });
      processed.push({ id: player.id, nombre: player.nombre, deporte: player.deporte, email_padre: player.email_padre });
    }

    // Notificar al admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'cdbustarviejo@gmail.com',
        subject: `🔒 Cierre Automático de Renovaciones - ${processed.length} jugadores no renovados`,
        body: `Se ha alcanzado la fecha límite de renovaciones (${fechaLimite.toLocaleDateString('es-ES')}).\n\nEl sistema ha procesado automáticamente ${processed.length} jugador(es) que no renovaron:\n\n${processed.map(p => `• ${p.nombre} (${p.deporte}) - Familia: ${p.email_padre}`).join('\n')}\n\nEstos jugadores han sido marcados como "no_renueva" y desactivados.\n\nTemporada: ${activeConfig.temporada}`
      });
    } catch (emailErr) {
      console.error('[autoCloseRenewals] Error enviando email:', emailErr?.message);
    }

    return Response.json({
      success: true,
      processed: processed.length,
      details: processed,
      temporada: activeConfig.temporada
    });
  } catch (error) {
    console.error('[autoCloseRenewals] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});