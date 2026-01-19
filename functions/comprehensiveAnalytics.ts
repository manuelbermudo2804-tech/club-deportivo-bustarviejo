import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { analysisType = 'all' } = await req.json();

    // Obtener datos en paralelo
    const [payments, users, events, chats, players, alerts] = await Promise.all([
      base44.asServiceRole.entities.Payment.list(),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.AnalyticsEvent.list(),
      base44.asServiceRole.entities.ChatMessage.list(),
      base44.asServiceRole.entities.Player.list(),
      base44.asServiceRole.entities.SystemAlert.list()
    ]);

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // STRIPE - Transacciones fallidas
    const stripeAnalysis = () => {
      const failedPayments = (payments || []).filter(p => p.estado === 'Anulado');
      const pendingAmount = (payments || [])
        .filter(p => p.estado === 'Pendiente')
        .reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0);
      const avgPaymentTime = failedPayments.length > 0
        ? failedPayments.reduce((sum, p) => {
            if (!p.fecha_pago || !p.created_date) return sum;
            const diff = new Date(p.fecha_pago) - new Date(p.created_date);
            return sum + diff;
          }, 0) / failedPayments.length / (1000 * 60 * 60)
        : 0;

      return {
        alerts: failedPayments.map(p => ({
          titulo: `Pago fallido - ${p.jugador_nombre}`,
          descripcion: `Importe: €${p.cantidad}, Método: ${p.metodo_pago}`,
          categoria: 'stripe',
          severidad: 'high',
          prioridad_score: 75
        })),
        stats: {
          failedPayments: failedPayments.length,
          pendingAmount: pendingAmount.toFixed(2),
          avgPaymentTime: avgPaymentTime.toFixed(1),
          failureRate: ((failedPayments.length / (payments?.length || 1)) * 100).toFixed(1)
        }
      };
    };

    // USUARIOS - Análisis de comportamiento
    const usersAnalysis = () => {
      const inactiveUsers = (users || []).filter(u => {
        if (!u.updated_date) return false;
        const lastUpdate = new Date(u.updated_date);
        return lastUpdate < thirtyDaysAgo;
      });

      const adminsWithoutActivity = (users || []).filter(u => u.role === 'admin' && u.updated_date && new Date(u.updated_date) < thirtyDaysAgo);

      const duplicateEmails = {};
      (users || []).forEach(u => {
        if (u.email) {
          duplicateEmails[u.email] = (duplicateEmails[u.email] || 0) + 1;
        }
      });
      const duplicates = Object.values(duplicateEmails).filter(count => count > 1).length;

      return {
        alerts: [
          ...inactiveUsers.slice(0, 5).map(u => ({
            titulo: `Usuario inactivo - ${u.full_name}`,
            descripcion: `Sin actividad hace ${Math.floor((today - new Date(u.updated_date)) / (1000 * 60 * 60 * 24))} días`,
            categoria: 'users',
            severidad: 'medium',
            prioridad_score: 40
          })),
          ...adminsWithoutActivity.map(u => ({
            titulo: `Admin inactivo - ${u.full_name}`,
            descripcion: `Último acceso hace ${Math.floor((today - new Date(u.updated_date)) / (1000 * 60 * 60 * 24))} días`,
            categoria: 'users',
            severidad: 'high',
            prioridad_score: 85
          }))
        ],
        stats: {
          totalUsers: users?.length || 0,
          inactiveUsers: inactiveUsers.length,
          inactiveAdmins: adminsWithoutActivity.length,
          possibleDuplicates: duplicates
        }
      };
    };

    // DATA INTEGRITY
    const dataAnalysis = () => {
      const playersWithoutPhoto = (players || []).filter(p => !p.foto_url);
      const playersWithoutDNI = (players || []).filter(p => !p.dni_jugador && p.fecha_nacimiento);
      const orphanPayments = (payments || []).filter(p => !p.jugador_id);

      return {
        alerts: [
          ...playersWithoutPhoto.slice(0, 3).map(p => ({
            titulo: `Jugador sin foto - ${p.nombre}`,
            descripcion: 'Ficha incompleta',
            categoria: 'data_integrity',
            severidad: 'low',
            prioridad_score: 20
          })),
          ...playersWithoutDNI.slice(0, 3).map(p => ({
            titulo: `Jugador sin DNI - ${p.nombre}`,
            descripcion: 'Documento faltante',
            categoria: 'data_integrity',
            severidad: 'medium',
            prioridad_score: 50
          }))
        ],
        stats: {
          totalPlayers: players?.length || 0,
          withoutPhoto: playersWithoutPhoto.length,
          withoutDNI: playersWithoutDNI.length,
          orphanPayments: orphanPayments.length
        }
      };
    };

    // CHATS
    const chatsAnalysis = () => {
      const unreadMessages = (chats || []).filter(c => !c.leido && new Date(c.created_date) < sevenDaysAgo);
      const inactiveChats = (chats || []).filter(c => new Date(c.created_date) < thirtyDaysAgo && !c.leido);

      return {
        alerts: unreadMessages.slice(0, 5).map(c => ({
          titulo: `Chat sin leer antiguo - ${c.remitente_nombre}`,
          descripcion: `Desde ${Math.floor((today - new Date(c.created_date)) / (1000 * 60 * 60 * 24))} días`,
          categoria: 'communication',
          severidad: 'medium',
          prioridad_score: 45
        })),
        stats: {
          totalMessages: chats?.length || 0,
          unreadOld: unreadMessages.length,
          inactiveChats: inactiveChats.length,
          avgResponseTime: 0
        }
      };
    };

    // PERFORMANCE
    const performanceAnalysis = () => {
      const slowPages = ((events || [])
        .filter(e => e.duracion_ms && e.duracion_ms > 3000)
        .reduce((acc, e) => {
          const page = e.pagina || 'unknown';
          if (!acc[page]) acc[page] = [];
          acc[page].push(e.duracion_ms);
          return acc;
        }, {}));

      const avgSlow = Object.entries(slowPages).map(([page, times]) => ({
        page,
        avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0),
        count: times.length
      })).sort((a, b) => b.avg - a.avg);

      return {
        alerts: avgSlow.slice(0, 3).map(item => ({
          titulo: `Página lenta - ${item.page}`,
          descripcion: `Promedio: ${item.avg}ms (${item.count} eventos)`,
          categoria: 'performance',
          severidad: item.avg > 5000 ? 'high' : 'medium',
          prioridad_score: item.avg > 5000 ? 70 : 45
        })),
        stats: {
          slowPages: avgSlow.length,
          avgPageLoadTime: avgSlow[0]?.avg || 0,
          eventsTotal: events?.length || 0,
          p95LoadTime: 0
        }
      };
    };

    // INTEGRACIONES
    const integrationsAnalysis = () => {
      const failedEvents = ((events || []).filter(e => e.severidad === 'error' && e.detalles?.integration_error));

      return {
        alerts: failedEvents.slice(0, 3).map(e => ({
          titulo: `Error de integración - ${e.detalles?.integration_type || 'unknown'}`,
          descripcion: e.detalles?.integration_error || 'Error desconocido',
          categoria: 'integration',
          severidad: 'high',
          prioridad_score: 80
        })),
        stats: {
          failedIntegrations: failedEvents.length,
          syncErrors: failedEvents.filter(e => e.detalles?.type === 'sync').length,
          webhookErrors: failedEvents.filter(e => e.detalles?.type === 'webhook').length,
          lastError: failedEvents[0]?.created_date || 'N/A'
        }
      };
    };

    // EMAIL
    const emailAnalysis = () => {
      const emailEvents = (events || []).filter(e => e.detalles?.service === 'email');
      const bounces = emailEvents.filter(e => e.detalles?.status === 'bounce').length;
      const spam = emailEvents.filter(e => e.detalles?.status === 'spam').length;

      return {
        alerts: [
          ...(bounces > 5 ? [{
            titulo: `${bounces} emails rechazados`,
            descripcion: 'Monitor de entregas alterado',
            categoria: 'email',
            severidad: 'medium',
            prioridad_score: 55
          }] : []),
          ...(spam > 3 ? [{
            titulo: `${spam} emails marcados como spam`,
            descripcion: 'Revisa contenido de emails',
            categoria: 'email',
            severidad: 'medium',
            prioridad_score: 60
          }] : [])
        ],
        stats: {
          emailsSent: emailEvents.length,
          bounceRate: ((bounces / (emailEvents.length || 1)) * 100).toFixed(1),
          spamRate: ((spam / (emailEvents.length || 1)) * 100).toFixed(1),
          lastSent: emailEvents[0]?.created_date || 'N/A'
        }
      };
    };

    const analyses = {
      stripe: stripeAnalysis(),
      users: usersAnalysis(),
      data: dataAnalysis(),
      chats: chatsAnalysis(),
      performance: performanceAnalysis(),
      integrations: integrationsAnalysis(),
      email: emailAnalysis()
    };

    if (analysisType !== 'all' && analyses[analysisType]) {
      return Response.json(analyses[analysisType]);
    }

    return Response.json(analyses);
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});