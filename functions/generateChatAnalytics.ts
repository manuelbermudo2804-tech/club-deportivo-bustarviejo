import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Generar estadísticas de uso del chat
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Obtener todos los mensajes del chat en últimos 30 días
    const [
      coordinatorMessages,
      coachMessages,
      staffMessages,
      adminMessages,
      allCoaches,
      allCoordinators
    ] = await Promise.all([
      base44.entities.CoordinatorMessage.filter({ created_date: { $gte: thirtyDaysAgo } }),
      base44.entities.CoachMessage.filter({ created_date: { $gte: thirtyDaysAgo } }),
      base44.entities.StaffMessage.filter({ created_date: { $gte: thirtyDaysAgo } }),
      base44.entities.AdminMessage.filter({ created_date: { $gte: thirtyDaysAgo } }),
      base44.entities.User.filter({ es_entrenador: true }),
      base44.entities.User.filter({ es_coordinador: true })
    ]);

    // Estadísticas generales
    const totalMessages = (coordinatorMessages?.length || 0) + (coachMessages?.length || 0) + (staffMessages?.length || 0) + (adminMessages?.length || 0);
    
    // Actividad por tipo de chat
    const chatActivity = {
      coordinador: coordinatorMessages?.length || 0,
      entrenador: coachMessages?.length || 0,
      staff: staffMessages?.length || 0,
      admin: adminMessages?.length || 0
    };

    // Usuarios activos por tipo
    const coachesActive = new Set();
    const coordinatorsActive = new Set();
    
    (coachMessages || []).forEach(m => coachesActive.add(m.remitente_email));
    (coordinatorMessages || []).forEach(m => coordinatorsActive.add(m.remitente_email));

    // Entrenadores INACTIVOS (sin mensajes en 30 días)
    const inactiveCoaches = allCoaches.filter(c => !coachesActive.has(c.email));

    // Ranking de entrenadores más activos
    const coachActivity = {};
    (coachMessages || []).forEach(m => {
      coachActivity[m.remitente_email] = (coachActivity[m.remitente_email] || 0) + 1;
    });

    const coachRanking = Object.entries(coachActivity)
      .sort((a, b) => b[1] - a[1])
      .map(([email, count]) => ({
        email,
        messages: count,
        coach: allCoaches.find(c => c.email === email)?.full_name
      }));

    // Horarios pico
    const hourlyActivity = {};
    [...(coachMessages || []), ...(coordinatorMessages || [])].forEach(m => {
      const hour = new Date(m.created_date).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    // Usuarios inactivos completamente
    const allUsers = await base44.entities.User.list();
    const usersWithRole = allUsers.filter(u => u.es_entrenador || u.es_coordinador || u.role === 'admin');
    
    const allActiveUsers = new Set([
      ...coachesActive,
      ...coordinatorsActive,
      ...(adminMessages || []).map(m => m.remitente_email)
    ]);

    const totalInactiveUsers = usersWithRole.filter(u => !allActiveUsers.has(u.email));

    return Response.json({ 
      success: true,
      summary: {
        totalMessages,
        activeUsers: allActiveUsers.size,
        inactiveUsers: totalInactiveUsers.length,
        period: '30 días'
      },
      chatActivity,
      coachRanking,
      inactiveCoaches: inactiveCoaches.map(c => ({ email: c.email, name: c.full_name })),
      inactiveUsers: totalInactiveUsers.map(u => ({ email: u.email, name: u.full_name, role: u.es_entrenador ? 'Entrenador' : u.es_coordinador ? 'Coordinador' : 'Admin' })),
      hourlyActivity: Object.fromEntries(Object.entries(hourlyActivity).sort()),
      engagementRate: ((allActiveUsers.size / usersWithRole.length) * 100).toFixed(1) + '%'
    });
  } catch (error) {
    console.error('Error generating chat analytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});