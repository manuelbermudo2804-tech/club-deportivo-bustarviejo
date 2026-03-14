import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function sendViaResend(to, subject, html) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.error('[RESEND] API key not set'); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: [to], subject, html })
  });
  if (!resp.ok) console.error(`[RESEND] Error ${resp.status}:`, await resp.text().catch(() => ''));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticación
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.es_tesorero !== true)) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener temporada activa
    const seasons = await base44.asServiceRole.entities.SeasonConfig.list();
    const activeSeason = seasons.find(s => s.activa === true);
    if (!activeSeason) {
      return Response.json({ error: 'No hay temporada activa' }, { status: 400 });
    }

    // Obtener todos los datos financieros
    const [payments, players, clothingOrders, lotteryOrders, clubMembers, sponsors] = await Promise.all([
      base44.asServiceRole.entities.Payment.list(),
      base44.asServiceRole.entities.Player.list(),
      base44.asServiceRole.entities.ClothingOrder.list(),
      base44.asServiceRole.entities.LotteryOrder.list(),
      base44.asServiceRole.entities.ClubMember.list(),
      base44.asServiceRole.entities.Sponsor.list()
    ]);

    // Filtrar datos de la temporada actual
    const seasonPayments = payments.filter(p => p.temporada === activeSeason.temporada && p.is_deleted !== true);
    const seasonPlayers = players.filter(p => p.activo === true);
    const seasonClothing = clothingOrders.filter(o => o.temporada === activeSeason.temporada);
    const seasonLottery = lotteryOrders.filter(o => o.temporada === activeSeason.temporada);
    const seasonMembers = clubMembers.filter(m => m.temporada === activeSeason.temporada);
    const activeSponsors = sponsors.filter(s => s.estado === "Activo" && s.temporada === activeSeason.temporada);

    // Calcular totales
    const cuotasPagadas = seasonPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
    const ropaPagada = seasonClothing.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.precio_final || 0), 0);
    const loteriaPagada = seasonLottery.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.total || 0), 0);
    const sociosPagados = seasonMembers.filter(m => m.estado_pago === "Pagado").reduce((sum, m) => sum + (m.cuota_pagada || 0), 0);
    const patrociniosTotal = activeSponsors.reduce((sum, s) => sum + (s.monto || 0), 0);

    const totalIngresos = cuotasPagadas + ropaPagada + loteriaPagada + sociosPagados + patrociniosTotal;

    // Calcular pendientes
    const getImportePorMes = (mes) => ({ "Junio": 110, "Septiembre": 70, "Diciembre": 70 }[mes] || 70);
    let totalPendiente = 0;
    seasonPlayers.forEach(player => {
      const playerPayments = seasonPayments.filter(p => p.jugador_id === player.id);
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        (p.estado === "Pagado" || p.estado === "En revisión")
      );
      if (hasPagoUnico) return;
      
      const mesesPagados = playerPayments.filter(p => p.estado === "Pagado" || p.estado === "En revisión").map(p => p.mes);
      const mesesFaltantes = ["Junio", "Septiembre", "Diciembre"].filter(mes => !mesesPagados.includes(mes));
      mesesFaltantes.forEach(mes => {
        totalPendiente += getImportePorMes(mes);
      });
    });

    const totalEsperado = totalIngresos + totalPendiente;
    const tasaCobro = totalEsperado > 0 ? (totalIngresos / totalEsperado) * 100 : 0;
    const morosidad = totalEsperado > 0 ? (totalPendiente / totalEsperado) * 100 : 0;

    // Obtener todos los usuarios tesoreros y admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const treasurers = allUsers.filter(u => u.es_tesorero === true || u.role === 'admin');

    // Generar HTML del reporte
    const reportHTML = `
      <h1>💰 Informe Financiero Mensual - ${activeSeason.temporada}</h1>
      <p>Fecha: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      
      <h2>📊 Resumen Ejecutivo</h2>
      <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f1f5f9;">
          <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Total Ingresos Cobrados</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: #22c55e; font-weight: bold;">${totalIngresos.toFixed(2)}€</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Total Pendiente</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: #ef4444; font-weight: bold;">${totalPendiente.toFixed(2)}€</td>
        </tr>
        <tr style="background: #f1f5f9;">
          <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Total Esperado</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: #3b82f6; font-weight: bold;">${totalEsperado.toFixed(2)}€</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Tasa de Cobro</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${tasaCobro.toFixed(1)}%</td>
        </tr>
        <tr style="background: #f1f5f9;">
          <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Índice de Morosidad</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: ${morosidad > 40 ? '#ef4444' : '#22c55e'}; font-weight: bold;">${morosidad.toFixed(1)}%</td>
        </tr>
      </table>

      <h2>💳 Desglose por Concepto</h2>
      <ul>
        <li><strong>Cuotas:</strong> ${cuotasPagadas.toFixed(2)}€</li>
        <li><strong>Equipación:</strong> ${ropaPagada.toFixed(2)}€</li>
        <li><strong>Lotería:</strong> ${loteriaPagada.toFixed(2)}€</li>
        <li><strong>Socios:</strong> ${sociosPagados.toFixed(2)}€</li>
        <li><strong>Patrocinios:</strong> ${patrociniosTotal.toFixed(2)}€</li>
      </ul>

      <h2>🎯 Indicadores Clave</h2>
      <ul>
        <li><strong>Jugadores Activos:</strong> ${seasonPlayers.length}</li>
        <li><strong>Ingreso Medio por Jugador:</strong> ${(totalIngresos / seasonPlayers.length).toFixed(2)}€</li>
        <li><strong>Pagos Confirmados:</strong> ${seasonPayments.filter(p => p.estado === "Pagado").length}</li>
        <li><strong>Pagos en Revisión:</strong> ${seasonPayments.filter(p => p.estado === "En revisión").length}</li>
      </ul>

      ${morosidad > 40 ? `
        <div style="background: #fee2e2; border: 2px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #dc2626;">⚠️ ALERTA: Morosidad Crítica</h3>
          <p>La tasa de morosidad ha superado el 40%. Se recomienda tomar medidas urgentes.</p>
        </div>
      ` : ''}

      <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
        Este reporte se genera automáticamente cada mes. <br>
        Accede al panel financiero completo: <a href="https://app.cdbustarviejo.com">app.cdbustarviejo.com</a>
      </p>
    `;

    // Enviar email a todos los tesoreros
    const emailPromises = treasurers.map(treasurer => 
      sendViaResend(treasurer.email, `📊 Informe Financiero Mensual - ${activeSeason.temporada}`, reportHTML)
    );

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true, 
      sent_to: treasurers.length,
      message: "Informe enviado correctamente"
    });
  } catch (error) {
    console.error("Error generando informe:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});