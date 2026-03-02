import { isPaymentOverdue } from "../payments/paymentHelpers";

/**
 * Calcula qué jugadores tienen pagos vencidos (morosos) para bloqueo en convocatorias.
 * 
 * Regla: un jugador es "moroso" si tiene al menos 1 pago en estado "Pendiente"
 * cuya fecha de vencimiento + diasGracia ya pasó.
 * 
 * Los pagos "En revisión" (justificante subido) NO bloquean.
 * Los jugadores con exento_bloqueo_impago=true están exentos.
 * 
 * @param {Array} players - Lista de jugadores de la categoría
 * @param {Array} payments - Lista de todos los pagos
 * @param {number} diasGracia - Días de gracia extra tras vencimiento (default 14)
 * @returns {Set} Set de player IDs que están morosos
 */
export function getOverduePlayerIds(players, payments, diasGracia = 14) {
  const overdueIds = new Set();

  for (const player of players) {
    // Exento por admin
    if (player.exento_bloqueo_impago === true) continue;

    const playerPayments = payments.filter(
      (p) => p.jugador_id === player.id && p.is_deleted !== true
    );

    // Si no tiene pagos generados, no bloquear (puede ser alta reciente)
    if (playerPayments.length === 0) continue;

    const hasOverduePayment = playerPayments.some((payment) => {
      if (payment.estado !== "Pendiente") return false;
      // Reutilizar isPaymentOverdue que ya calcula las fechas límite
      if (!isPaymentOverdue(payment)) return false;

      // Aplicar días de gracia extra
      const now = new Date();
      const gracePeriodMs = diasGracia * 24 * 60 * 60 * 1000;

      // Recalcular deadline con gracia
      const getSeasonStartYear = (temporada) => {
        if (!temporada || typeof temporada !== "string") return now.getFullYear();
        const match = temporada.match(/(\d{4})[/-]/);
        return match ? parseInt(match[1], 10) : now.getFullYear();
      };

      const startYear = getSeasonStartYear(payment.temporada);
      const endYear = startYear + 1;
      const monthDeadlines = {
        Junio: new Date(endYear, 5, 30),
        Septiembre: new Date(startYear, 8, 30),
        Diciembre: new Date(startYear, 11, 31),
      };

      const tipo = (payment.tipo_pago || "").toLowerCase();
      let deadline;

      if (tipo.includes("único") || tipo.includes("unico")) {
        const created = payment.created_date ? new Date(payment.created_date) : now;
        const createdMonth = created.getMonth() + 1;
        if (createdMonth >= 7) {
          deadline = new Date(created);
          deadline.setDate(deadline.getDate() + 7);
        } else {
          deadline = new Date(startYear, 5, 30);
        }
      } else {
        deadline = monthDeadlines[payment.mes];
      }

      if (!deadline) return false;

      // Sumar días de gracia
      const deadlineWithGrace = new Date(deadline.getTime() + gracePeriodMs);
      return now > deadlineWithGrace;
    });

    if (hasOverduePayment) {
      overdueIds.add(player.id);
    }
  }

  return overdueIds;
}