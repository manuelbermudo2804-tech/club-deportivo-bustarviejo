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
      chatMessages,
      staffMessages,
      adminMessages,
      allCoaches,
      allCoordinators
    ] = await Promise.all([
      base44.asServiceRole.entities.CoordinatorMessage.list('-created_date', 2000),
      base44.asServiceRole.entities.ChatMessage.list('-created_date', 2000),
      base44.asServiceRole.entities.StaffMessage.list('-created_date', 2000),
      base44.asServiceRole.entities.AdminMessage.list('-created_date', 2000),
      base44.asServiceRole.entities.User.filter({ es_entrenador: true }),
      base44.asServiceRole.entities.User.filter({ es_coordinador: true })
    ]);

    // Filtrar solo últimos 30 días
    const filterLast30Days = (messages) => messages.filter(m => new Date(m.created_date) >= thirtyDaysAgo);
    
    const coordinatorMessagesFiltered = filterLast30Days(coordinatorMessages);
    const coachMessagesFiltered = filterLast30Days(chatMessages);
    const staffMessagesFiltered = filterLast30Days(staffMessages);
    const adminMessagesFiltered = filterLast30Days(adminMessages);
    
    const coachMessages = coachMessagesFiltered;

    // Estadísticas generales
    const totalMessages = (coordinatorMessagesFiltered?.length || 0) + (coachMessagesFiltered?.length || 0) + (staffMessagesFiltered?.length || 0) + (adminMessagesFiltered?.length || 0);
    
    // Actividad por tipo de chat
    const chatActivity = {
      coordinador: coordinatorMessagesFiltered?.length || 0,
      entrenador: coachMessagesFiltered?.length || 0,
      staff: staffMessagesFiltered?.length || 0,
      admin: adminMessagesFiltered?.length || 0
    };

    // Usuarios activos por tipo
    const coachesActive = new Set();
    const coordinatorsActive = new Set();
    
    (coachMessagesFiltered || []).forEach(m => {
      if (m.remitente_email) coachesActive.add(m.remitente_email);
    });
    (coordinatorMessagesFiltered || []).forEach(m => {
      if (m.autor_email) coordinatorsActive.add(m.autor_email);
    });

    // Entrenadores INACTIVOS (sin mensajes en 30 días)
    const inactiveCoaches = allCoaches.filter(c => !coachesActive.has(c.email));

    // Ranking de entrenadores más activos
    const coachActivity = {};
    (coachMessagesFiltered || []).forEach(m => {
      if (m.remitente_email && m.tipo === 'entrenador_a_grupo') {
        coachActivity[m.remitente_email] = (coachActivity[m.remitente_email] || 0) + 1;
      }
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
    [...(coachMessagesFiltered || []), ...(coordinatorMessagesFiltered || [])].forEach(m => {
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

    const responseTimesByCategory = calculateResponseTimes([...(coachMessagesFiltered || []), ...(coordinatorMessagesFiltered || [])]);
    const responseTimeData = Object.entries(responseTimesByCategory).map(([categoria, avgResponseTime]) => ({
      categoria,
      avgResponseTime
    }));

    // TIEMPO DE PRIMERA RESPUESTA POR ROL
    const calculateFirstResponseTime = (messages, role) => {
      const conversationFirstResponses = {};
      
      messages.forEach(m => {
        const convId = m.conversacion_id || m.grupo_id || m.categoria;
        if (!convId) return;
        
        if (!conversationFirstResponses[convId]) {
          conversationFirstResponses[convId] = [];
        }
        conversationFirstResponses[convId].push(m);
      });

      const firstResponseTimes = [];
      Object.values(conversationFirstResponses).forEach(convMsgs => {
        convMsgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        for (let i = 0; i < convMsgs.length - 1; i++) {
          const msg = convMsgs[i];
          const nextMsg = convMsgs[i + 1];
          
          // Detectar si es una primera respuesta (cambio de remitente)
          const currentSender = msg.remitente_email || msg.autor_email;
          const nextSender = nextMsg.remitente_email || nextMsg.autor_email;
          
          if (currentSender !== nextSender) {
            const timeDiff = (new Date(nextMsg.created_date) - new Date(msg.created_date)) / 60000;
            if (timeDiff > 0 && timeDiff < 1440) { // Menos de 24 horas
              firstResponseTimes.push(timeDiff);
            }
          }
        }
      });

      return firstResponseTimes.length > 0 
        ? Math.round(firstResponseTimes.reduce((a, b) => a + b) / firstResponseTimes.length)
        : 0;
    };

    const firstResponseByRole = {
      coordinador: calculateFirstResponseTime(coordinatorMessagesFiltered, 'coordinador'),
      entrenador: calculateFirstResponseTime(coachMessagesFiltered, 'entrenador'),
      staff: calculateFirstResponseTime(staffMessagesFiltered, 'staff')
    };

    // Actividad por equipo/categoría
    const teamActivity = {};
    (coachMessagesFiltered || []).forEach(m => {
      const team = m.deporte || m.grupo_id || 'General';
      if (!teamActivity[team]) teamActivity[team] = { messageCount: 0, userCount: new Set() };
      teamActivity[team].messageCount += 1;
      if (m.remitente_email) teamActivity[team].userCount.add(m.remitente_email);
    });

    const teamActivityData = Object.entries(teamActivity).map(([team, data]) => ({
      team,
      messageCount: data.messageCount,
      userCount: data.userCount.size,
      categoria: team
    }));

    // Contenido compartido
    const filesShared = [...(coachMessagesFiltered || []), ...(coordinatorMessagesFiltered || [])].filter(m => m.archivos_adjuntos?.length).length;
    const locationsShared = [...(coachMessagesFiltered || []), ...(coordinatorMessagesFiltered || [])].filter(m => m.ubicacion).length;
    const pollsCreated = [...(coachMessagesFiltered || []), ...(coordinatorMessagesFiltered || [])].filter(m => m.encuesta || m.poll).length;

    // ANÁLISIS DE SENTIMIENTO con LLM
    const allMessagesText = [...(coachMessagesFiltered || []), ...(coordinatorMessagesFiltered || [])].map(m => ({
      id: m.id,
      text: m.mensaje,
      categoria: m.deporte || m.grupo_id || m.categoria || 'General',
      sender: m.remitente_nombre || m.autor_nombre,
      date: m.created_date
    }));

    let sentimentAnalysis = {
      positive: 0,
      negative: 0,
      neutral: 0,
      byCategory: {},
      negativePhrases: [],
      positivePhrases: [],
      healthScore: 100
    };

    if (allMessagesText.length > 0) {
      try {
        // Agrupar mensajes en lotes para análisis
        const batchSize = 50;
        const sentimentResults = {};
        
        for (let i = 0; i < allMessagesText.length; i += batchSize) {
          const batch = allMessagesText.slice(i, i + batchSize);
          const messagesForAnalysis = batch.map(m => `"${m.text}"`).join('\n');
          
          const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `Clasifica el sentimiento de estos mensajes de chat entre equipos deportivos. Responde SOLO con JSON válido sin markdown, en este formato exacto:
{
  "sentiments": [
    {"message": "PRIMER MENSAJE", "sentiment": "positive|negative|neutral", "score": 0-100, "reason": "breve razón"},
    ...
  ],
  "keywords": {"positive": ["palabra1", "palabra2"], "negative": ["palabra3", "palabra4"]}
}

Mensajes:
${messagesForAnalysis}`,
            response_json_schema: {
              type: "object",
              properties: {
                sentiments: { type: "array" },
                keywords: { type: "object" }
              }
            }
          });

          if (llmResponse?.sentiments) {
            llmResponse.sentiments.forEach((item, idx) => {
              const originalMsg = batch[idx];
              sentimentResults[originalMsg.id] = {
                sentiment: item.sentiment,
                score: item.score,
                categoria: originalMsg.categoria
              };
            });
            
            if (llmResponse.keywords) {
              sentimentAnalysis.positivePhrases = [...new Set([...sentimentAnalysis.positivePhrases, ...(llmResponse.keywords.positive || [])])].slice(0, 10);
              sentimentAnalysis.negativePhrases = [...new Set([...sentimentAnalysis.negativePhrases, ...(llmResponse.keywords.negative || [])])].slice(0, 10);
            }
          }
        }

        // Calcular métricas de sentimiento
        Object.values(sentimentResults).forEach(result => {
          if (result.sentiment === 'positive') sentimentAnalysis.positive++;
          if (result.sentiment === 'negative') sentimentAnalysis.negative++;
          if (result.sentiment === 'neutral') sentimentAnalysis.neutral++;

          // Por categoría
          const cat = result.categoria || 'General';
          if (!sentimentAnalysis.byCategory[cat]) {
            sentimentAnalysis.byCategory[cat] = { positive: 0, negative: 0, neutral: 0 };
          }
          sentimentAnalysis.byCategory[cat][result.sentiment]++;
        });

        // Calcular health score (basado en % de positivos)
        const total = sentimentAnalysis.positive + sentimentAnalysis.negative + sentimentAnalysis.neutral;
        const negativeRatio = total > 0 ? sentimentAnalysis.negative / total : 0;
        sentimentAnalysis.healthScore = Math.max(0, 100 - (negativeRatio * 100));
      } catch (error) {
        console.log('Sentiment analysis skipped:', error.message);
      }
    }

    // Análisis por usuario (top 10)
    const userActivity = {};
    [...(coachMessagesFiltered || []), ...(coordinatorMessagesFiltered || [])].forEach(m => {
      const email = m.remitente_email || m.autor_email;
      const name = m.remitente_nombre || m.autor_nombre;
      if (!email) return;
      
      if (!userActivity[email]) {
        userActivity[email] = { messageCount: 0, times: [], name };
      }
      userActivity[email].messageCount += 1;
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
    const allMessages = [...(coachMessagesFiltered || []), ...(coordinatorMessagesFiltered || [])];
    for (let week = 4; week >= 0; week--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (week * 7 + 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (week * 7));

      const weekMessages = allMessages.filter(m => {
        const msgDate = new Date(m.created_date);
        return msgDate >= weekStart && msgDate < weekEnd;
      });

      const weekUsers = new Set(weekMessages.map(m => m.remitente_email || m.autor_email).filter(Boolean));
      weeklyTrend.push({
        week: 5 - week,
        messageCount: weekMessages.length,
        activeUsers: weekUsers.size
      });
    }

    // HISTORIAL DE ESCALADOS (entrenador → coordinador, coordinador → admin)
    const escalationHistory = [];
    const now = new Date();

    // 1. Escalados de Entrenador a Coordinador (CoachMessage marcado como escalado)
    const coachMessagesEscalated = coachMessagesFiltered.filter(m => m.escalado_a_coordinador === true);
    coachMessagesEscalated.forEach(msg => {
      const escalationTime = msg.escalado_fecha ? new Date(msg.escalado_fecha) : new Date(msg.created_date);
      
      // Buscar si el coordinador respondió
      const coordinatorResponse = coordinatorMessagesFiltered.find(cm => 
        cm.grupo_id === msg.grupo_id && 
        new Date(cm.created_date) > escalationTime
      );
      
      const resolutionTime = coordinatorResponse 
        ? Math.round((new Date(coordinatorResponse.created_date) - escalationTime) / 60000)
        : null;

      escalationHistory.push({
        tipo: 'Entrenador → Coordinador',
        categoria: msg.deporte || msg.grupo_id || 'General',
        fecha_escalado: escalationTime.toISOString(),
        resuelto: !!coordinatorResponse,
        tiempo_resolucion_minutos: resolutionTime,
        mensaje_original: msg.mensaje?.substring(0, 100)
      });
    });

    // 2. Escalados de Coordinador a Admin (CoordinatorMessage marcado como escalado)
    const coordinatorMessagesEscalated = coordinatorMessagesFiltered.filter(m => m.escalado_a_admin === true);
    coordinatorMessagesEscalated.forEach(msg => {
      const escalationTime = msg.escalado_admin_fecha ? new Date(msg.escalado_admin_fecha) : new Date(msg.created_date);
      
      // Buscar si el admin respondió en AdminConversation
      const adminResponse = adminMessagesFiltered.find(am => 
        new Date(am.created_date) > escalationTime
      );
      
      const resolutionTime = adminResponse 
        ? Math.round((new Date(adminResponse.created_date) - escalationTime) / 60000)
        : null;

      escalationHistory.push({
        tipo: 'Coordinador → Admin',
        categoria: msg.grupo_id || 'General',
        fecha_escalado: escalationTime.toISOString(),
        resuelto: !!adminResponse,
        tiempo_resolucion_minutos: resolutionTime,
        mensaje_original: msg.mensaje?.substring(0, 100)
      });
    });

    // Ordenar por fecha más reciente
    escalationHistory.sort((a, b) => new Date(b.fecha_escalado) - new Date(a.fecha_escalado));

    // Estadísticas de escalados
    const escalationStats = {
      total: escalationHistory.length,
      entrenadorACoordinador: escalationHistory.filter(e => e.tipo === 'Entrenador → Coordinador').length,
      coordinadorAAdmin: escalationHistory.filter(e => e.tipo === 'Coordinador → Admin').length,
      resueltos: escalationHistory.filter(e => e.resuelto).length,
      pendientes: escalationHistory.filter(e => !e.resuelto).length,
      tiempoPromedioResolucion: escalationHistory.filter(e => e.tiempo_resolucion_minutos).length > 0
        ? Math.round(
            escalationHistory
              .filter(e => e.tiempo_resolucion_minutos)
              .reduce((sum, e) => sum + e.tiempo_resolucion_minutos, 0) / 
            escalationHistory.filter(e => e.tiempo_resolucion_minutos).length
          )
        : 0
    };

    // Mensajes sin respuesta
    const unansweredMessages = [];
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
            sender: m.remitente_nombre || m.autor_nombre,
            category: m.categoria || m.deporte || m.grupo_id,
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
      ...(adminMessagesFiltered || []).map(m => m.autor_email).filter(Boolean)
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
      participationTrend,
      sentiment: sentimentAnalysis,
      firstResponseByRole,
      escalationHistory: escalationHistory.slice(0, 20),
      escalationStats
    });
  } catch (error) {
    console.error('Error generating chat analytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});