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
      const paymentRows = payments.map(p =>
        `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff7ed;border-radius:8px;margin-bottom:8px;border:1px solid #fed7aa;">
          <div><div style="font-weight:700;color:#9a3412;font-size:14px;">${p.player}</div><div style="color:#c2410c;font-size:12px;">${p.mes} · ${p.daysOverdue} días de retraso</div></div>
          <div style="font-weight:800;color:#c2410c;font-size:16px;">${p.amount}€</div>
        </div>`
      ).join('');

      const emailHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">🔴</div>
  <div style="color:#ffffff;font-size:20px;font-weight:800;">PAGOS ATRASADOS</div>
  <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Acción requerida</div>
</td></tr>
<tr><td style="padding:24px;">
  <p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
  <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tienes pagos pendientes desde hace más de 30 días:</p>
  ${paymentRows}
  <div style="background:#fff7ed;border-radius:10px;padding:14px 16px;margin:16px 0;border-left:4px solid #f97316;">
    <div style="color:#9a3412;font-size:13px;"><strong>📧 Datos bancarios:</strong><br>IBAN: ES82 0049 4447 38 2010604048<br>Banco: Santander · Beneficiario: CD Bustarviejo</div>
  </div>
  <div style="text-align:center;margin:20px 0 8px;">
    <a href="https://app.cdbustarviejo.com/parentpayments" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;">💳 VER MIS PAGOS</a>
  </div>
</td></tr>
<tr><td style="background:#1e293b;padding:20px 24px;text-align:center;">
  <div style="color:#94a3b8;font-size:12px;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none;">cdbustarviejo@gmail.com</a></div>
</td></tr>
</table></td></tr></table></body></html>`;

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '🔴 Pagos atrasados - CD Bustarviejo',
        body: emailHtml
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