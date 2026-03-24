import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Paginación para obtener TODOS los registros
    const fetchAll = async (entity) => {
      const results = [];
      const pageSize = 200;
      let skip = 0;
      let batch;
      do {
        batch = await entity.list('-created_date', pageSize, skip);
        results.push(...batch);
        skip += pageSize;
      } while (batch.length === pageSize);
      return results;
    };

    const allUsers = await fetchAll(base44.asServiceRole.entities.User);
    const allPlayers = await fetchAll(base44.asServiceRole.entities.Player);
    
    // Crear set de emails con jugadores activos
    const parentsWithActivePlayers = new Set();
    allPlayers.forEach(p => {
      if (p.activo === true) {
        if (p.email_padre) parentsWithActivePlayers.add(p.email_padre.trim().toLowerCase());
        if (p.email_tutor_2) parentsWithActivePlayers.add(p.email_tutor_2.trim().toLowerCase());
        if (p.email_jugador) parentsWithActivePlayers.add(p.email_jugador.trim().toLowerCase());
        if (p.acceso_menor_email) parentsWithActivePlayers.add(p.acceso_menor_email.trim().toLowerCase());
      }
    });

    const deactivatedUsers = [];
    const skippedUsers = [];

    for (const u of allUsers) {
      // Nunca tocar admins, staff ni usuarios ya eliminados/restringidos
      if (u.role === 'admin') continue;
      if (u.es_entrenador || u.es_coordinador || u.es_tesorero) continue;
      if (u.eliminado === true) continue;
      if (u.acceso_activo === false) continue; // ya restringido

      const email = (u.email || '').trim().toLowerCase();
      if (!email) continue;

      // Si el usuario tiene algún jugador activo vinculado, no tocar
      if (parentsWithActivePlayers.has(email)) {
        skippedUsers.push(email);
        continue;
      }

      // Desactivar acceso
      await base44.asServiceRole.entities.User.update(u.id, {
        acceso_activo: false,
        motivo_restriccion: 'Sin jugadores activos - Desactivación automática de temporada',
        fecha_restriccion: new Date().toISOString()
      });

      deactivatedUsers.push({ email: u.email, name: u.full_name });
    }

    // Revocar acceso juvenil de menores sin jugador activo
    const revokedMinors = [];
    for (const p of allPlayers) {
      if (!p.acceso_menor_email || p.acceso_menor_revocado === true) continue;
      if (p.activo === true) continue;
      if (p.acceso_menor_autorizado !== true) continue;

      await base44.asServiceRole.entities.Player.update(p.id, {
        acceso_menor_revocado: true
      });

      // Desactivar usuario menor si existe
      const minorUser = allUsers.find(u => 
        u.email?.trim().toLowerCase() === p.acceso_menor_email.trim().toLowerCase() &&
        u.es_menor === true
      );
      if (minorUser && minorUser.acceso_activo !== false && minorUser.eliminado !== true) {
        await base44.asServiceRole.entities.User.update(minorUser.id, {
          acceso_activo: false,
          motivo_restriccion: 'Jugador vinculado inactivo - Acceso juvenil revocado automáticamente',
          fecha_restriccion: new Date().toISOString()
        });
      }

      revokedMinors.push({ email: p.acceso_menor_email, player: p.nombre });
    }

    return Response.json({ 
      success: true, 
      deactivatedParents: deactivatedUsers.length,
      revokedMinors: revokedMinors.length,
      deactivatedDetails: deactivatedUsers,
      revokedMinorDetails: revokedMinors,
      skippedWithActivePlayers: skippedUsers.length
    });
  } catch (error) {
    console.error('Error deactivating users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});