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

    // Tiempo de respuesta
    const calculateResponseTimes = (messages) => {
      const times = {};
      const groupedByCategory = {};
      
      messages.forEach(m => {
        const cat = m.categoria || 'General';
        if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
        groupedByCategory[cat].push(m);
      });

      Object.entries(groupedByCategory).forEach(([cat, msgs]) => {
        const responseTimes = [];
        msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        for (let i = 0; i < msgs.length - 1; i++) {
          const timeDiff = (new Date(msgs[i + 1].created_date) - new Date(msgs[i].created_date)) / 60000;
          if (timeDiff > 0 && timeDiff < 1440) responseTimes.push(timeDiff);
        }
        
        times[cat] = responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b) / responseTimes.length) : 0;
      });
      
      return times;
    };

    const responseTimesByCategory = calculateResponseTimes([...(coachMessages || []), ...(coordinatorMessages || [])]);
    const responseTimeData = Object.entries(responseTimesByCategory).map(([categoria, avgResponseTime]) => ({
      categoria,
      avgResponseTime
    }));

    // Actividad por equipo/categoría
    const teamActivity = {};
    (coachMessages || []).forEach(m => {
      const team = m.categoria || 'Coordinador';
      if (!teamActivity[team]) teamActivity[team] = { messageCount: 0, userCount: new Set() };
      teamActivity[team].messageCount += 1;
      teamActivity[team].userCount.add(m.remitente_email);
    });

    const teamActivityData = Object.entries(teamActivity).map(([team, data]) => ({
      team,
      messageCount: data.messageCount,
      userCount: data.userCount.size,
      categoria: team
    }));

    // Contenido compartido
    const filesShared = [...(coachMessages || []), ...(coordinatorMessages || [])].filter(m => m.archivos_adjuntos?.length).length;
    const locationsShared = [...(coachMessages || []), ...(coordinatorMessages || [])].filter(m => m.ubicacion).length;
    const pollsCreated = [...(coachMessages || []), ...(coordinatorMessages || [])].filter(m => m.encuesta || m.poll).length;

    // Análisis por usuario (top 10)
    const userActivity = {};
    [...(coachMessages || []), ...(coordinatorMessages || [])].forEach(m => {
      if (!userActivity[m.remitente_email]) {
        userActivity[m.remitente_email] = { messageCount: 0, times: [], name: m.remitente_nombre };
      }
      userActivity[m.remitente_email].messageCount += 1;
    });

    const userActivityData = Object.entries(userActivity)
      .sort((a, b) => b[1].messageCount - a[1].messageCount)
      .slice(0, 10)
      .map(([email, data]) => ({
        email,
        name: data.name,
        messageCount: data.messageCount,
        avgResponseTime: responseTimesByCategory[data.name?.split(' ')[0]] || 0
      }));

    // Tendencias semanales
    const weeklyTrend = [];
    const allMessages = [...(coachMessages || []), ...(coordinatorMessages || [])];
    for (let week = 4; week >= 0; week--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (week * 7 + 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (week * 7));

      const weekMessages = allMessages.filter(m => {
        const msgDate = new Date(m.created_date);
        return msgDate >= weekStart && msgDate < weekEnd;
      });

      const weekUsers = new Set(weekMessages.map(m => m.remitente_email));
      weeklyTrend.push({
        week: 5 - week,
        messageCount: weekMessages.length,
        activeUsers: weekUsers.size
      });
    }

    // Mensajes sin respuesta
    const unansweredMessages = [];
    const now = new Date();
    allMessages.forEach(m => {
      const responses = allMessages.filter(r => 
        r.respuesta_a === m.id || 
        (r.categoria === m.categoria && new Date(r.created_date) > new Date(m.created_date))
      );
      if (responses.length === 0) {
        const daysUnanswered = Math.floor((now - new Date(m.created_date)) / (1000 * 60 * 60 * 24));
        if (daysUnanswered > 0) {
          unansweredMessages.push({
            id: m.id,
            sender: m.remitente_nombre,
            category: m.categoria,
            content: m.mensaje?.substring(0, 100),
            daysUnanswered
          });
        }
      }
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

    // Cálculos adicionales
    const peakHour = Object.entries(hourlyActivity).sort((a, b) => b[1] - a[1])[0];
    const avgResponseTimeGlobal = responseTimeData.length > 0 
      ? Math.round(responseTimeData.reduce((a, b) => a + b.avgResponseTime, 0) / responseTimeData.length)
      : 0;
    
    const previousWeekMessages = weeklyTrend[3]?.messageCount || 0;
    const currentWeekMessages = weeklyTrend[4]?.messageCount || 0;
    const participationTrend = currentWeekMessages >= previousWeekMessages ? '↑ Aumentó' : '↓ Disminuyó';

    return Response.json({ 
      success: true,
      summary: {
        totalMessages,
        activeUsers: allActiveUsers.size,
        inactiveUsers: totalInactiveUsers.length,
        period: '30 días',
        filesShared,
        locationsShared,
        pollsCreated
      },
      chatActivity,
      coachRanking,
      inactiveCoaches: inactiveCoaches.map(c => ({ email: c.email, name: c.full_name })),
      inactiveUsers: totalInactiveUsers.map(u => ({ email: u.email, name: u.full_name, role: u.es_entrenador ? 'Entrenador' : u.es_coordinador ? 'Coordinador' : 'Admin' })),
      hourlyActivity: Object.fromEntries(Object.entries(hourlyActivity).sort()),
      engagementRate: ((allActiveUsers.size / usersWithRole.length) * 100).toFixed(1) + '%',
      responseTime: responseTimeData,
      teamActivity: teamActivityData,
      weeklyTrend,
      userActivity: userActivityData,
      unansweredMessages: unansweredMessages.sort((a, b) => b.daysUnanswered - a.daysUnanswered),
      peakHour: peakHour ? `${peakHour[0]}:00` : 'N/A',
      avgResponseTime: avgResponseTimeGlobal,
      participationTrend
    });
  } catch (error) {
    console.error('Error generating chat analytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});