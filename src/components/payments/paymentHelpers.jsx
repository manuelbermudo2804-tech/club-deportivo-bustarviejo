/**
 * Helper centralizado para cálculo de estados de pago
 * USAR EN TODOS LOS DASHBOARDS para consistencia
 */

/**
 * Calcula si un pago está vencido basándose en su mes y estado
 */
export function isPaymentOverdue(payment) {
  if (payment.estado !== "Pendiente") return false;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Fechas límite por mes
  const deadlines = {
    "Junio": new Date(currentYear, 5, 30), // 30 junio
    "Septiembre": new Date(currentYear, 8, 30), // 30 septiembre
    "Diciembre": new Date(currentYear, 11, 31), // 31 diciembre
  };
  
  const deadline = deadlines[payment.mes];
  if (!deadline) return false;
  
  return now > deadline;
}

/**
 * Obtiene el plan de pago activo de un jugador (si existe)
 */
export function getActiveCustomPlan(jugadorId, customPlans, temporada) {
  if (!customPlans || customPlans.length === 0) return null;
  
  return customPlans.find(plan => 
    plan.jugador_id === jugadorId &&
    plan.estado === "Activo" &&
    (!temporada || plan.temporada === temporada)
  );
}

/**
 * Calcula cuántas cuotas debe tener un jugador
 * Considera: plan especial > pago único > tres meses estándar
 */
export function getExpectedPaymentsCount(jugadorId, payments, customPlans, temporada) {
  // 1. Verificar si tiene plan especial activo
  const customPlan = getActiveCustomPlan(jugadorId, customPlans, temporada);
  if (customPlan) {
    return customPlan.cuotas?.length || customPlan.numero_cuotas || 0;
  }
  
  // 2. Verificar si tiene pago único
  const playerPayments = payments.filter(p => 
    p.jugador_id === jugadorId &&
    (!temporada || p.temporada === temporada) &&
    p.is_deleted !== true
  );
  
  const hasPagoUnico = playerPayments.some(p => 
    p.tipo_pago === "Único" || p.tipo_pago === "único"
  );
  
  if (hasPagoUnico) return 1;
  
  // 3. Por defecto: 3 cuotas
  return 3;
}

/**
 * Calcula cuántas cuotas están pendientes para un jugador
 * Considera planes especiales, pago único y tres meses
 */
export function getPendingPaymentsCount(jugadorId, payments, customPlans, temporada) {
  // 1. Verificar si tiene plan especial activo
  const customPlan = getActiveCustomPlan(jugadorId, customPlans, temporada);
  if (customPlan && customPlan.cuotas) {
    const cuotasPendientes = customPlan.cuotas.filter(c => c.pagada !== true);
    return cuotasPendientes.length;
  }
  
  // 2. Lógica estándar
  const playerPayments = payments.filter(p => 
    p.jugador_id === jugadorId &&
    (!temporada || p.temporada === temporada) &&
    p.is_deleted !== true
  );
  
  const hasPagoUnico = playerPayments.some(p => 
    p.tipo_pago === "Único" || p.tipo_pago === "único"
  );
  
  if (hasPagoUnico) {
    const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
    return pagoUnico?.estado === "Pendiente" ? 1 : 0;
  }
  
  // Tres meses: contar cuántos faltan
  const pagadosORevision = playerPayments.filter(p => 
    p.estado === "Pagado" || p.estado === "En revisión"
  ).length;
  
  return Math.max(0, 3 - pagadosORevision);
}

/**
 * Calcula estadísticas de pagos para una lista de jugadores
 * Retorna: { pendingPayments, overduePayments, paymentsInReview }
 */
export function calculatePaymentStats(allPayments, playerIds, customPlans = []) {
  let pendingPayments = 0;
  let overduePayments = 0;
  let paymentsInReview = 0;
  
  playerIds.forEach(jugadorId => {
    const playerPayments = allPayments.filter(p => p.jugador_id === jugadorId && p.is_deleted !== true);
    
    // Verificar si tiene plan especial
    const customPlan = getActiveCustomPlan(jugadorId, customPlans);
    
    if (customPlan && customPlan.cuotas) {
      // PLAN ESPECIAL: Solo contar cuotas del plan
      // Filtrar pagos del plan y eliminar duplicados por mes
      const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
      const seen = new Set();
      const uniquePlanPayments = planPayments.filter(p => {
        if (seen.has(p.mes)) return false;
        seen.add(p.mes);
        return true;
      });
      
      // Contar pendientes y en revisión
      uniquePlanPayments.forEach(p => {
        if (p.estado === "Pendiente") {
          if (isPaymentOverdue(p)) {
            overduePayments++;
          } else {
            pendingPayments++;
          }
        } else if (p.estado === "En revisión") {
          paymentsInReview++;
        }
      });
    } else {
      // Verificar si tiene pago único
      const hasPagoUnico = playerPayments.some(p => 
        p.tipo_pago === "Único" || p.tipo_pago === "único"
      );
      
      if (hasPagoUnico) {
        // PAGO ÚNICO: Solo contar el pago único
        const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
        if (pagoUnico) {
          if (pagoUnico.estado === "Pendiente") {
            if (isPaymentOverdue(pagoUnico)) {
              overduePayments++;
            } else {
              pendingPayments++;
            }
          } else if (pagoUnico.estado === "En revisión") {
            paymentsInReview++;
          }
        }
      } else {
        // TRES MESES: contar pagos pendientes
        playerPayments.forEach(p => {
          if (p.estado === "Pendiente") {
            if (isPaymentOverdue(p)) {
              overduePayments++;
            } else {
              pendingPayments++;
            }
          } else if (p.estado === "En revisión") {
            paymentsInReview++;
          }
        });
      }
    }
  });
  
  return {
    pendingPayments,
    overduePayments,
    paymentsInReview,
  };
}