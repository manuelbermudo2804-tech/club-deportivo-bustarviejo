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
 * Calcula estadísticas de pagos para una lista de jugadores
 * Retorna: { pendingPayments, overduePayments, paymentsInReview }
 */
export function calculatePaymentStats(allPayments, playerIds) {
  const myPayments = allPayments.filter(p => playerIds.includes(p.jugador_id));
  
  const pendingPayments = myPayments.filter(p => 
    p.estado === "Pendiente" && !isPaymentOverdue(p)
  ).length;
  
  const overduePayments = myPayments.filter(p => 
    isPaymentOverdue(p)
  ).length;
  
  const paymentsInReview = myPayments.filter(p => 
    p.estado === "En revisión"
  ).length;
  
  return {
    pendingPayments,
    overduePayments,
    paymentsInReview,
  };
}