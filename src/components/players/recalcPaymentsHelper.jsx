/**
 * Helper para recalcular cuotas pendientes cuando cambia la categoría de un jugador.
 * 
 * REGLAS DE SEGURIDAD:
 * - Solo recalcula pagos en estado "Pendiente"
 * - NO toca pagos "Pagado" ni "En revisión" ni "Anulado"
 * - NO toca planes especiales (CustomPaymentPlan / tipo_pago "Plan Especial")
 * - NO toca suscripciones Stripe (Plan Mensual)
 * - Mantiene el descuento de hermanos tal cual (solo en mes Junio)
 * - Solo recalcula cuotas de la temporada activa
 */

import { base44 } from "@/api/base44Client";
import { getCuotasFromConfig, getImportePorMesFromConfig } from "@/lib/cuotasConfig";

/**
 * Analiza qué pagos cambiarían si se aplica la nueva categoría.
 * NO modifica nada. Solo devuelve el plan de cambios.
 */
export async function analyzePaymentChanges({ playerId, oldCategory, newCategory, activeSeason, descuentoAplicado = 0 }) {
  if (!playerId || !oldCategory || !newCategory || oldCategory === newCategory) {
    return { canRecalculate: false, reason: "Sin cambio de categoría" };
  }

  if (!activeSeason?.temporada) {
    return { canRecalculate: false, reason: "Sin temporada activa" };
  }

  // Cargar todos los pagos del jugador de la temporada activa
  const allPayments = await base44.entities.Payment.filter({
    jugador_id: playerId,
    temporada: activeSeason.temporada,
  });

  const livePayments = allPayments.filter(p => !p.is_deleted);

  // Cargar configuración de categorías
  const categoryConfigs = await base44.entities.CategoryConfig.list();
  const newCuotas = getCuotasFromConfig(newCategory, categoryConfigs, activeSeason.temporada);
  const oldCuotas = getCuotasFromConfig(oldCategory, categoryConfigs, activeSeason.temporada);

  // Clasificar pagos
  const recalculable = []; // Pendientes que SÍ se pueden recalcular
  const frozen = [];        // Ya pagados / en revisión / anulados — informativo
  const skipped = [];       // Plan Especial / Plan Mensual — no se tocan

  for (const payment of livePayments) {
    // No tocar planes especiales ni mensuales (suscripciones)
    if (payment.tipo_pago === "Plan Especial" || payment.tipo_pago === "Plan Mensual") {
      skipped.push({ payment, reason: payment.tipo_pago });
      continue;
    }

    if (payment.estado === "Pagado" || payment.estado === "En revisión") {
      frozen.push({ payment });
      continue;
    }

    if (payment.estado === "Anulado") {
      continue; // ignorar
    }

    // Es "Pendiente" — calcular nuevo importe
    let newAmount = 0;
    if (payment.tipo_pago === "Único" || payment.tipo_pago === "único") {
      // Pago único = total con descuento solo si aplica (mismas reglas que en alta)
      newAmount = Math.max(0, newCuotas.total - (descuentoAplicado || 0));
    } else {
      // Tres meses estándar
      newAmount = getImportePorMesFromConfig(
        newCategory,
        payment.mes,
        categoryConfigs,
        payment.mes === "Junio" ? (descuentoAplicado || 0) : 0
      );
    }

    if (newAmount !== payment.cantidad) {
      recalculable.push({
        payment,
        oldAmount: payment.cantidad,
        newAmount,
        diff: newAmount - payment.cantidad,
      });
    }
  }

  // Calcular totales
  const totalPendienteAntes = recalculable.reduce((s, r) => s + (r.oldAmount || 0), 0);
  const totalPendienteDespues = recalculable.reduce((s, r) => s + (r.newAmount || 0), 0);
  const totalPagado = frozen
    .filter(f => f.payment.estado === "Pagado")
    .reduce((s, f) => s + (f.payment.cantidad || 0), 0);

  return {
    canRecalculate: recalculable.length > 0,
    recalculable,
    frozen,
    skipped,
    oldCategory,
    newCategory,
    oldCuotas,
    newCuotas,
    totalPendienteAntes,
    totalPendienteDespues,
    totalPagado,
    temporada: activeSeason.temporada,
  };
}

/**
 * Aplica el recálculo: actualiza los pagos pendientes con los nuevos importes.
 * Devuelve el número de pagos actualizados.
 */
export async function applyPaymentRecalculation(plan, adminEmail) {
  if (!plan?.recalculable?.length) return 0;

  let updated = 0;
  const fechaCambio = new Date().toISOString();

  for (const item of plan.recalculable) {
    try {
      const prevNotas = item.payment.notas || "";
      const nota = `[${new Date().toLocaleDateString('es-ES')}] Recalculado por cambio de categoría (${plan.oldCategory} → ${plan.newCategory}): ${item.oldAmount}€ → ${item.newAmount}€. Admin: ${adminEmail || 'sistema'}.`;
      const notasFinales = prevNotas ? `${prevNotas}\n${nota}` : nota;

      await base44.entities.Payment.update(item.payment.id, {
        cantidad: item.newAmount,
        notas: notasFinales,
      });
      updated++;
    } catch (err) {
      console.error("Error actualizando pago:", item.payment.id, err);
    }
  }

  return updated;
}