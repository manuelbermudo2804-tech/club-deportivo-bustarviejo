import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Enviar recordatorios a usuarios morosos (pagos pendientes > 30 días)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener pagos pendientes
    const pendingPayments = await base44.entities.Payment.filter({ estado: 'Pendiente' });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filtrar pagos > 30 días sin pagar
    const overduePayments = pendingPayments.filter(p => {
      const createdDate = new Date(p.created_date);
      return createdDate < thirtyDaysAgo;
    });

    // Obtener jugadores y usuarios para emails
    const allPlayers = await base44.entities.Player.list();
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));

    // Agrupar por email padre
    const emailGroups = {};
    for (const payment of overduePayments) {
      const player = playerMap.get(payment.jugador_id);
      if (player?.email_padre) {
        if (!emailGroups[player.email_padre]) {
          emailGroups[player.email_padre] = [];
        }
        emailGroups[player.email_padre].push({
          player: player.nombre,
          amount: payment.cantidad,
          mes: payment.mes,
          daysOverdue: Math.floor((Date.now() - new Date(payment.created_date).getTime()) / (1000 * 60 * 60 * 24))
        });
      }
    }

    // Enviar emails
    const emailsSent = [];
    for (const [email, payments] of Object.entries(emailGroups)) {
      const paymentList = payments
        .map(p => `• ${p.player}: €${p.cantidad} (${p.mes}) - ${p.daysOverdue} días`)
        .join('\n');

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '⚠️ Recordatorio: Pagos pendientes del club',
        body: `Hola,\n\nTienes los siguientes pagos pendientes hace más de 30 días:\n\n${paymentList}\n\nPor favor, regulariza tu situación cuanto antes.\n\nGracias,\nCD Bustarviejo`
      });

      emailsSent.push(email);
      console.log(`📧 Email sent to: ${email}`);
    }

    return Response.json({ 
      success: true, 
      overdueCount: overduePayments.length,
      emailsSent: emailsSent.length
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});