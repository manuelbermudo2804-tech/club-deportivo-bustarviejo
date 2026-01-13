import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Limpiar datos obsoletos: marcar jugadores inactivos sin convocatorias en 90 días
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todos los jugadores
    const allPlayers = await base44.entities.Player.list();
    
    // Obtener convocatorias (últimos 90 días)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const allCallups = await base44.entities.Convocatoria.list('-updated_date', 1000);
    
    // Crear set de jugadores convocados recientemente
    const recentlyCalledUp = new Set();
    allCallups.forEach(c => {
      if (new Date(c.updated_date) > ninetyDaysAgo) {
        c.jugadores_convocados?.forEach(j => recentlyCalledUp.add(j.jugador_id));
      }
    });

    // Marcar jugadores sin convocatorias como inactivos
    const markedInactive = [];
    for (const player of allPlayers) {
      if (player.activo && !recentlyCalledUp.has(player.id)) {
        await base44.entities.Player.update(player.id, {
          inactivo_temporada: true
        });
        markedInactive.push(player.nombre);
        console.log(`🗑️ Marked as inactive: ${player.nombre}`);
      }
    }

    // Limpiar recordatorios obsoletos (más de 90 días)
    const allReminders = await base44.entities.Reminder.list('-updated_date', 1000);
    const deletedReminders = [];
    
    for (const reminder of allReminders) {
      if (reminder.enviado && new Date(reminder.updated_date) < ninetyDaysAgo) {
        try {
          await base44.entities.Reminder.delete(reminder.id);
          deletedReminders.push(reminder.id);
        } catch (e) {
          console.log(`⚠️ Could not delete reminder ${reminder.id}`);
        }
      }
    }

    return Response.json({ 
      success: true,
      playersMarkedInactive: markedInactive.length,
      remindersDeleted: deletedReminders.length,
      details: { markedInactive }
    });
  } catch (error) {
    console.error('Error cleaning up data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});