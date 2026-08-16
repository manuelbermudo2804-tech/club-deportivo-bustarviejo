import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Aviso preventivo a las familias: cuota vencida y su hijo/a está a punto de
// dejar de entrar en las convocatorias. Se envía UNA sola vez por cuota,
// mientras aún queda margen (dentro de los días de gracia).

function getSeasonStartYear(temporada) {
  if (!temporada || typeof temporada !== 'string') return new Date().getFullYear();
  const match = temporada.match(/(\d{4})[/-]/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

function getDeadline(payment) {
  const now = new Date();
  const startYear = getSeasonStartYear(payment.temporada);
  const endYear = startYear + 1;
  const monthDeadlines = {
    'Junio': new Date(endYear, 5, 30),
    'Septiembre': new Date(startYear, 8, 30),
    'Diciembre': new Date(startYear, 11, 31)
  };
  const tipo = (payment.tipo_pago || '').toLowerCase();
  if (tipo.includes('único') || tipo.includes('unico')) {
    const created = payment.created_date ? new Date(payment.created_date) : now;
    if (created.getMonth() + 1 >= 7) {
      const d = new Date(created);
      d.setDate(d.getDate() + 7);
      return d;
    }
    return new Date(startYear, 5, 30);
  }
  return monthDeadlines[payment.mes] || null;
}

function buildEmail(items, diasGracia, iban, banco) {
  const rows = items.map((i) =>
    `<div style="padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:8px;">
      <div style="font-weight:700;color:#92400e;font-size:14px;">${i.jugador}</div>
      <div style="color:#b45309;font-size:12px;">Cuota de ${i.mes} · ${i.cantidad}€ · vencida hace ${i.diasVencida} días</div>
    </div>`
  ).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:26px 24px;text-align:center;">
  <div style="font-size:34px;margin-bottom:6px;">⏳</div>
  <div style="color:#ffffff;font-size:19px;font-weight:800;">Cuota pendiente</div>
  <div style="color:rgba(255,255,255,0.9);font-size:13px;margin-top:4px;">Aún se puede resolver</div>
</td></tr>
<tr><td style="padding:24px;">
  <p style="color:#334155;font-size:15px;margin:0 0 14px;">Hola,</p>
  <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tenemos registrada una cuota vencida. Te avisamos con margen porque, pasados <strong>${diasGracia} días</strong> desde el vencimiento, el jugador <strong>deja de entrar en las convocatorias de partido</strong>.</p>
  ${rows}
  <div style="background:#fff7ed;border-radius:10px;padding:14px 16px;margin:16px 0;border-left:4px solid #f97316;">
    <div style="color:#9a3412;font-size:13px;"><strong>Datos bancarios:</strong><br>IBAN: ${iban}<br>Banco: ${banco} · Beneficiario: CD Bustarviejo</div>
  </div>
  <p style="color:#475569;font-size:13px;margin:0 0 16px;">Si estáis pasando por una dificultad económica, respondednos a este correo: buscamos una solución (plan de pago o beca). <strong>No hace falta hablarlo con el entrenador</strong>, él no gestiona los pagos.</p>
  <div style="text-align:center;margin:20px 0 8px;">
    <a href="https://app.cdbustarviejo.com/parentpayments" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;">💳 VER Y PAGAR MIS CUOTAS</a>
  </div>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const seasons = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    const cfg = seasons?.[0];
    if (!cfg || cfg.bloqueo_convocatorias_impago !== true) {
      return Response.json({ success: true, skipped: 'bloqueo por impago desactivado' });
    }

    const diasGracia = Number(cfg.dias_gracia_convocatoria ?? 14);
    let iban = 'ES05 0049 6802 1021 1001 1001';
    let banco = 'Banco Santander';
    if (cfg.club_iban?.trim()) iban = cfg.club_iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
    if (cfg.club_bank?.trim()) banco = cfg.club_bank.trim();

    const pendientes = await base44.asServiceRole.entities.Payment.filter({ estado: 'Pendiente' });
    const players = await base44.asServiceRole.entities.Player.list();
    const playerMap = new Map(players.map((p) => [p.id, p]));

    const now = Date.now();
    const groups = {};
    const toMark = [];

    for (const payment of pendientes) {
      if (payment.is_deleted === true) continue;
      if (payment.aviso_riesgo_convocatoria_enviado === true) continue;

      const player = playerMap.get(payment.jugador_id);
      if (!player || player.activo === false) continue;
      if (player.exento_bloqueo_impago === true) continue;

      const deadline = getDeadline(payment);
      if (!deadline) continue;

      const graceEnd = deadline.getTime() + diasGracia * 24 * 60 * 60 * 1000;
      // Solo si ya venció pero AÚN queda margen (dentro de la gracia)
      if (now <= deadline.getTime() || now > graceEnd) continue;

      const email = player.email_padre;
      if (!email) continue;

      if (!groups[email]) groups[email] = [];
      groups[email].push({
        jugador: player.nombre,
        mes: payment.mes,
        cantidad: payment.cantidad,
        diasVencida: Math.floor((now - deadline.getTime()) / (1000 * 60 * 60 * 24))
      });
      toMark.push(payment.id);
    }

    const key = Deno.env.get('RESEND_API_KEY');
    let sent = 0;

    for (const [email, items] of Object.entries(groups)) {
      if (key) {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
            to: [email],
            subject: '⏳ Cuota pendiente — evita que se quede fuera de las convocatorias',
            html: buildEmail(items, diasGracia, iban, banco)
          })
        });
        if (!resp.ok) console.error('[RESEND] error', resp.status, await resp.text().catch(() => ''));
        else sent++;
      }

      try {
        await base44.functions.invoke('sendPushNotification', {
          usuario_email: email,
          titulo: '⏳ Cuota pendiente',
          cuerpo: items.length === 1
            ? `${items[0].jugador}: cuota de ${items[0].mes} vencida. Regularízala para seguir siendo convocado.`
            : `${items.length} cuotas vencidas. Regularízalas para seguir siendo convocados.`,
          url: '/parentpayments',
          tag: 'riesgo-convocatoria'
        });
      } catch (pushErr) {
        console.error('[PUSH] error', pushErr.message);
      }
    }

    if (toMark.length > 0) {
      await base44.asServiceRole.entities.Payment.bulkUpdate(
        toMark.map((id) => ({ id, aviso_riesgo_convocatoria_enviado: true }))
      );
    }

    return Response.json({ success: true, familias: Object.keys(groups).length, emailsSent: sent, cuotasAvisadas: toMark.length });
  } catch (error) {
    console.error('avisoRiesgoConvocatoria error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});