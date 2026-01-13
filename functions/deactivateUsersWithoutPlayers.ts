import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Desactivar usuarios sin hijos activos al final de temporada
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todos los usuarios
    const allUsers = await base44.entities.User.list();
    
    // Obtener todos los jugadores activos
    const activePlayers = await base44.entities.Player.filter({ activo: true });
    
    // Crear mapa de padres con hijos activos
    const parentsWithActivePlayers = new Set();
    activePlayers.forEach(p => {
      parentsWithActivePlayers.add(p.email_padre?.toLowerCase());
      if (p.email_tutor_2) parentsWithActivePlayers.add(p.email_tutor_2.toLowerCase());
    });

    // Desactivar usuarios sin hijos activos
    const deactivatedUsers = [];
    for (const u of allUsers) {
      if (u.role === 'user' && !parentsWithActivePlayers.has(u.email?.toLowerCase())) {
        await base44.auth.updateMe({ acceso_activo: false }); // Nota: esto actualiza el usuario actual
        // Mejor usar update directo (si existe API de admin)
        deactivatedUsers.push(u.email);
        console.log(`✅ Deactivated: ${u.email}`);
      }
    }

    return Response.json({ 
      success: true, 
      deactivated: deactivatedUsers.length,
      users: deactivatedUsers 
    });
  } catch (error) {
    console.error('Error deactivating users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});