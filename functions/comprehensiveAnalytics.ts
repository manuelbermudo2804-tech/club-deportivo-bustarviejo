import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403 });
    }

    const { analysisType } = await req.json();

    switch (analysisType) {
      case 'stripe':
        return await analyzeStripe(base44);
      case 'users':
        return await analyzeUsers(base44);
      case 'data':
        return await analyzeDataIntegrity(base44);
      case 'chats':
        return await analyzeChats(base44);
      case 'performance':
        return await analyzePerformance(base44);
      case 'integrations':
        return await analyzeIntegrations(base44);
      case 'email':
        return await analyzeEmail(base44);
      default:
        return await analyzeAll(base44);
    }
  } catch (e) {
    console.error('Analytics error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// STRIPE ANALYTICS
async function analyzeStripe(base44) {
  try {
    const payments = await base44.asServiceRole.entities.Payment.list();
    const extraCharges = await base44.asServiceRole.entities.ExtraChargePayment.list();

    const failedPayments = payments.filter(p => p.estado === 'Anulado');
    const pendingPayments = payments.filter(p => p.estado === 'Pendiente');
    
    const totalMissing = pendingPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);

    const alerts = [];

    if (failedPayments.length > 5) {
      alerts.push({
        titulo: 'Alto número de pagos fallidos',
        descripcion: `${failedPayments.length} pagos anulados en el último mes`,
        severidad: 'high',
        categoria: 'stripe',
        prioridad_score: 75,
        solucion_sugerida: 'Revisar método de pago, notificar usuarios, verificar tarjetas expiradas'
      });
    }

    if (totalMissing > 1000) {
      alerts.push({
        titulo: 'Cantidad alta pendiente de cobrar',
        descripcion: `€${totalMissing.toFixed(2)} en pagos pendientes`,
        severidad: 'medium',
        categoria: 'stripe',
        prioridad_score: 65,
        solucion_sugerida: 'Enviar recordatorios, seguimiento de pagos, escalación de pagos en mora'
      });
    }

    const avgPaymentTime = calculateAvgPaymentTime(payments);
    if (avgPaymentTime > 10) {
      alerts.push({
        titulo: 'Tiempo medio de pago elevado',
        descripcion: `Los usuarios tardan ${avgPaymentTime} días en pagar`,
        severidad: 'low',
        categoria: 'stripe',
        prioridad_score: 40,
        solucion_sugerida: 'Mejorar recordatorios, simplificar proceso, ofrecer múltiples métodos'
      });
    }

    return new Response(JSON.stringify({ type: 'stripe', alerts, stats: {
      totalPayments: payments.length,
      totalAmount: payments.reduce((s, p) => s + (p.cantidad || 0), 0),
      failedCount: failedPayments.length,
      pendingCount: pendingPayments.length,
      successRate: ((payments.filter(p => p.estado === 'Pagado').length / payments.length) * 100).toFixed(1)
    }}));
  } catch (e) {
    console.error('Stripe analysis error:', e);
    return new Response(JSON.stringify({ type: 'stripe', alerts: [], error: e.message }));
  }
}

// USER ANALYTICS
async function analyzeUsers(base44) {
  try {
    const users = await base44.asServiceRole.entities.User.list();
    const players = await base44.asServiceRole.entities.Player.list();

    const alerts = [];
    const inactiveUsers = [];

    // Detectar usuarios inactivos (sin login en 30 días)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    users.forEach(u => {
      if (u.updated_date && new Date(u.updated_date) < thirtyDaysAgo) {
        inactiveUsers.push(u);
      }
    });

    if (inactiveUsers.length > 0) {
      alerts.push({
        titulo: `${inactiveUsers.length} usuarios inactivos`,
        descripcion: `No acceden desde hace más de 30 días`,
        severidad: 'low',
        categoria: 'users',
        prioridad_score: 30,
        solucion_sugerida: 'Enviar email de re-engagement, verificar si siguen siendo válidos',
        afecta_usuarios: inactiveUsers.length
      });
    }

    // Detectar roles sin usar
    const rolesUsed = new Set(users.map(u => u.role).filter(Boolean));
    const adminUsers = users.filter(u => u.role === 'admin');
    const trainers = users.filter(u => u.es_entrenador);
    const coordinators = users.filter(u => u.es_coordinador);

    // Detectar duplicados por email
    const emailCounts = {};
    users.forEach(u => {
      emailCounts[u.email] = (emailCounts[u.email] || 0) + 1;
    });
    const duplicateEmails = Object.entries(emailCounts).filter(([_, count]) => count > 1);

    if (duplicateEmails.length > 0) {
      alerts.push({
        titulo: 'Usuarios duplicados detectados',
        descripcion: `${duplicateEmails.length} emails con múltiples cuentas`,
        severidad: 'high',
        categoria: 'users',
        prioridad_score: 70,
        solucion_sugerida: 'Revisar y fusionar cuentas duplicadas, consolidar datos'
      });
    }

    return new Response(JSON.stringify({ type: 'users', alerts, stats: {
      totalUsers: users.length,
      adminCount: adminUsers.length,
      trainerCount: trainers.length,
      coordinatorCount: coordinators.length,
      inactiveCount: inactiveUsers.length,
      duplicateEmails: duplicateEmails.length
    }}));
  } catch (e) {
    console.error('User analysis error:', e);
    return new Response(JSON.stringify({ type: 'users', alerts: [], error: e.message }));
  }
}

// DATA INTEGRITY
async function analyzeDataIntegrity(base44) {
  try {
    const players = await base44.asServiceRole.entities.Player.list();
    const payments = await base44.asServiceRole.entities.Payment.list();
    const events = await base44.asServiceRole.entities.Event.list();

    const alerts = [];
    const issues = [];

    // Jugadores sin email de padre
    const playersWithoutEmail = players.filter(p => !p.email_padre);
    if (playersWithoutEmail.length > 0) {
      issues.push(`${playersWithoutEmail.length} jugadores sin email padre`);
      alerts.push({
        titulo: 'Jugadores sin contacto',
        descripcion: `${playersWithoutEmail.length} registros sin email de padre`,
        severidad: 'high',
        categoria: 'data_integrity',
        prioridad_score: 72,
        solucion_sugerida: 'Completar datos de contacto, enviar formulario de actualización'
      });
    }

    // Pagos huérfanos (sin jugador asociado)
    const orphanedPayments = payments.filter(p => {
      return !players.some(pl => pl.id === p.jugador_id);
    });
    if (orphanedPayments.length > 0) {
      alerts.push({
        titulo: 'Pagos huérfanos',
        descripcion: `${orphanedPayments.length} pagos sin jugador asociado`,
        severidad: 'medium',
        categoria: 'data_integrity',
        prioridad_score: 55,
        solucion_sugerida: 'Auditar y corregir referencias de BD, posible corrupción de datos'
      });
    }

    // Eventos sin ubicación (crítico)
    const eventsNoLocation = events.filter(e => !e.ubicacion);
    if (eventsNoLocation.length > 0) {
      alerts.push({
        titulo: 'Eventos incompletos',
        descripcion: `${eventsNoLocation.length} eventos sin ubicación`,
        severidad: 'medium',
        categoria: 'data_integrity',
        prioridad_score: 50,
        solucion_sugerida: 'Completar ubicación de eventos, notificar coordinadores'
      });
    }

    return new Response(JSON.stringify({ type: 'data', alerts, stats: {
      totalPlayers: players.length,
      incompleteRecords: playersWithoutEmail.length,
      orphanedPayments: orphanedPayments.length,
      incompleteEvents: eventsNoLocation.length,
      issues
    }}));
  } catch (e) {
    console.error('Data integrity analysis error:', e);
    return new Response(JSON.stringify({ type: 'data', alerts: [], error: e.message }));
  }
}

// CHAT ANALYTICS
async function analyzeChats(base44) {
  try {
    const familyChats = await base44.asServiceRole.entities.ChatMessage.filter({ tipo: 'padre_a_grupo' });
    const adminChats = await base44.asServiceRole.entities.AdminConversation.list();

    const alerts = [];

    // Mensajes sin leer muy antiguos
    const oldUnread = familyChats.filter(m => {
      if (m.leido) return false;
      const msgDate = new Date(m.created_date);
      const daysOld = (Date.now() - msgDate) / (1000 * 60 * 60 * 24);
      return daysOld > 7;
    });

    if (oldUnread.length > 5) {
      alerts.push({
        titulo: 'Mensajes sin leer antiguos',
        descripcion: `${oldUnread.length} mensajes sin leer hace más de 7 días`,
        severidad: 'medium',
        categoria: 'behavior',
        prioridad_score: 45,
        solucion_sugerida: 'Revisar si coordinadores están inactivos, marcar como leído automáticamente o re-notificar'
      });
    }

    // Coordinadores inactivos en chats
    const coordinatorActivity = {};
    adminChats.forEach(c => {
      if (c.coordinador_email) {
        coordinatorActivity[c.coordinador_email] = (coordinatorActivity[c.coordinador_email] || 0) + 1;
      }
    });

    const inactiveCoordinators = Object.entries(coordinatorActivity).filter(([_, count]) => count === 0);
    if (inactiveCoordinators.length > 0) {
      alerts.push({
        titulo: 'Coordinadores sin actividad en chats',
        descripcion: `${inactiveCoordinators.length} coordinadores sin participar`,
        severidad: 'low',
        categoria: 'behavior',
        prioridad_score: 35,
        solucion_sugerida: 'Verificar disponibilidad, entrenar en uso del sistema, considerar reasignación'
      });
    }

    return new Response(JSON.stringify({ type: 'chats', alerts, stats: {
      totalMessages: familyChats.length,
      unreadMessages: familyChats.filter(m => !m.leido).length,
      oldUnread: oldUnread.length,
      activeConversations: adminChats.length
    }}));
  } catch (e) {
    console.error('Chat analysis error:', e);
    return new Response(JSON.stringify({ type: 'chats', alerts: [], error: e.message }));
  }
}

// PERFORMANCE ANALYTICS
async function analyzePerformance(base44) {
  try {
    const events = await base44.asServiceRole.entities.AnalyticsEvent.filter({ evento_tipo: 'performance' });

    const alerts = [];
    const pagePerformance = {};

    events.forEach(e => {
      if (!pagePerformance[e.pagina]) {
        pagePerformance[e.pagina] = [];
      }
      pagePerformance[e.pagina].push(e.duracion_ms || 0);
    });

    const slowPages = [];
    Object.entries(pagePerformance).forEach(([pagina, durations]) => {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (avgDuration > 3000) {
        slowPages.push({ pagina, avgDuration: avgDuration.toFixed(0) });
      }
    });

    if (slowPages.length > 0) {
      alerts.push({
        titulo: `${slowPages.length} páginas lentas`,
        descripcion: `${slowPages.map(p => `${p.pagina} (${p.avgDuration}ms)`).join(', ')}`,
        severidad: 'high',
        categoria: 'performance',
        prioridad_score: 68,
        solucion_sugerida: 'Optimizar queries, lazy loading, caché, reducir bundle size'
      });
    }

    return new Response(JSON.stringify({ type: 'performance', alerts, stats: {
      totalPerformanceEvents: events.length,
      slowPagesCount: slowPages.length,
      slowPages,
      avgAppSpeed: (Object.values(pagePerformance).flat().reduce((a, b) => a + b, 0) / events.length).toFixed(0)
    }}));
  } catch (e) {
    console.error('Performance analysis error:', e);
    return new Response(JSON.stringify({ type: 'performance', alerts: [], error: e.message }));
  }
}

// INTEGRATIONS ANALYTICS
async function analyzeIntegrations(base44) {
  try {
    const events = await base44.asServiceRole.entities.Event.filter({ synced_to_google: true });
    const failedSyncs = events.filter(e => !e.google_calendar_id);

    const alerts = [];

    if (failedSyncs.length > 0) {
      alerts.push({
        titulo: 'Eventos no sincronizados con Google Calendar',
        descripcion: `${failedSyncs.length} eventos fallaron sincronización`,
        severidad: 'medium',
        categoria: 'inconsistency',
        prioridad_score: 52,
        solucion_sugerida: 'Verificar token Google, reintentar sincronización, revisar permisos'
      });
    }

    return new Response(JSON.stringify({ type: 'integrations', alerts, stats: {
      totalEventsSynced: events.length,
      failedSyncs: failedSyncs.length,
      syncRate: ((events.length - failedSyncs.length) / events.length * 100).toFixed(1)
    }}));
  } catch (e) {
    console.error('Integrations analysis error:', e);
    return new Response(JSON.stringify({ type: 'integrations', alerts: [], error: e.message }));
  }
}

// EMAIL ANALYTICS
async function analyzeEmail(base44) {
  try {
    // Aquí iría análisis de logs de email si los guardas
    const alerts = [];

    alerts.push({
      titulo: 'Monitor de emails',
      descripcion: 'Sistema de seguimiento de emails disponible',
      severidad: 'info',
      categoria: 'communication',
      prioridad_score: 10,
      solucion_sugerida: 'Configurar integración con Resend para tracking completo'
    });

    return new Response(JSON.stringify({ type: 'email', alerts, stats: {
      note: 'Email tracking requiere integración con Resend webhooks'
    }}));
  } catch (e) {
    console.error('Email analysis error:', e);
    return new Response(JSON.stringify({ type: 'email', alerts: [], error: e.message }));
  }
}

// ANÁLISIS COMPLETO
async function analyzeAll(base44) {
  const results = {
    stripe: await analyzeStripe(base44),
    users: await analyzeUsers(base44),
    data: await analyzeDataIntegrity(base44),
    chats: await analyzeChats(base44),
    performance: await analyzePerformance(base44),
    integrations: await analyzeIntegrations(base44),
    email: await analyzeEmail(base44)
  };

  return new Response(JSON.stringify(results));
}

function calculateAvgPaymentTime(payments) {
  const paidPayments = payments.filter(p => p.fecha_pago && p.created_date);
  if (paidPayments.length === 0) return 0;

  const totalDays = paidPayments.reduce((sum, p) => {
    const created = new Date(p.created_date);
    const paid = new Date(p.fecha_pago);
    return sum + (paid - created) / (1000 * 60 * 60 * 24);
  }, 0);

  return (totalDays / paidPayments.length).toFixed(1);
}