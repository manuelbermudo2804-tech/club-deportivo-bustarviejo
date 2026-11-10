import { getPaymentCollected, getPaymentOutstanding } from "@/components/payments/paymentHelpers";

export const eur = (v) => (Number(v) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

const seasonKey = (s) => (s ? String(s).replace(/[^\d]/g, "") : "");
export const seasonMatches = (a, b) => !!a && !!b && seasonKey(a) === seasonKey(b);

const MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

const isOverdue = (payment, temporada) => {
  const month = MONTHS[String(payment.mes || "").trim().toLowerCase()];
  if (!month) return false;
  const now = new Date();
  const startYear = Number(String(temporada).match(/20\d{2}/)?.[0]) || now.getFullYear();
  const year = month >= 6 ? startYear : startYear + 1;
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
};

const sum = (arr, fn) => arr.reduce((s, x) => s + (Number(fn(x)) || 0), 0);

export function computeFinanceStats({ activeSeason, payments, lotteryOrders, clubMembers, sponsors, transactions }) {
  const t = activeSeason?.temporada;
  const seasonPayments = payments.filter((p) => seasonMatches(p.temporada, t) && p.is_deleted !== true);
  const pending = seasonPayments.filter((p) => p.estado === "Pendiente");
  const overdue = pending.filter((p) => isOverdue(p, t));
  const review = seasonPayments.filter((p) => p.estado === "En revisión");
  const lottery = lotteryOrders.filter((o) => seasonMatches(o.temporada, t));
  // Socios-padre automáticos ya van incluidos en la cuota del jugador
  const members = clubMembers.filter((m) => seasonMatches(m.temporada, t) && m.es_socio_padre !== true && m.origen_pago !== "socio_padre_auto");
  // Patrocinios: solo lo realmente cobrado esta temporada
  const sponsorPaid = (s) => sum((s.pagos_temporadas || []).filter((x) => seasonMatches(x.temporada, t)), (x) => x.importe);
  const sponsorsUnpaid = sponsors.filter((s) => s.activo === true && Number(s.precio_anual) > 0 && !(s.pagos_temporadas || []).some((x) => seasonMatches(x.temporada, t)));
  const seasonTx = transactions.filter((tx) => (!tx.temporada || seasonMatches(tx.temporada, t)) && tx.estado !== "Anulado");

  const stats = {
    cuotasPagadas: sum(seasonPayments, getPaymentCollected),
    cuotasPagadasCount: seasonPayments.filter((p) => p.estado === "Pagado").length,
    cuotasPendientes: sum(pending, getPaymentOutstanding),
    cuotasPendientesCount: pending.length,
    cuotasVencidas: sum(overdue, getPaymentOutstanding),
    cuotasVencidasCount: overdue.length,
    cuotasEnRevision: sum(review, (p) => p.cantidad),
    cuotasEnRevisionCount: review.length,
    loteriaTotal: sum(lottery, (o) => o.total),
    loteriaPagada: sum(lottery.filter((o) => o.pagado === true), (o) => o.total),
    loteriaPendiente: sum(lottery.filter((o) => o.pagado === false), (o) => o.total),
    sociosPagados: sum(members.filter((m) => m.estado_pago === "Pagado"), (m) => m.cuota_pagada || m.cuota_socio),
    sociosPendientes: sum(members.filter((m) => m.estado_pago !== "Pagado"), (m) => m.cuota_socio),
    sociosCount: members.length,
    patrociniosTotal: sum(sponsors, sponsorPaid),
    patrociniosPagadosCount: sponsors.filter((s) => sponsorPaid(s) > 0).length,
    patrociniosPendientes: sum(sponsorsUnpaid, (s) => s.precio_anual),
    patrociniosPendientesCount: sponsorsUnpaid.length,
    gastos: sum(seasonTx.filter((x) => x.tipo === "Gasto"), (x) => x.cantidad),
  };
  stats.totalIngresos = stats.cuotasPagadas + stats.loteriaPagada + stats.sociosPagados + stats.patrociniosTotal;
  stats.totalPendiente = stats.cuotasPendientes + stats.loteriaPendiente + stats.sociosPendientes + stats.patrociniosPendientes;
  stats.totalEsperado = stats.totalIngresos + stats.totalPendiente + stats.cuotasEnRevision;
  return stats;
}

// Importe habitual de una cuota fraccionada (lo usan los paneles de deudores y categorías)
export function makeGetImportePorMes(activeSeason, payments) {
  return (_deporte, mes) => {
    if (Number(activeSeason?.cuota_tres_meses) > 0) return Number(activeSeason.cuota_tres_meses);
    const freq = {};
    let best = 0, bestVal = 0;
    payments
      .filter((p) => seasonMatches(p.temporada, activeSeason?.temporada) && p.mes === mes && !/^único$/i.test(p.tipo_pago || ""))
      .forEach((p) => {
        const k = Math.round(Number(p.cantidad) || 0);
        if (!k) return;
        freq[k] = (freq[k] || 0) + 1;
        if (freq[k] > best) { best = freq[k]; bestVal = k; }
      });
    if (bestVal) return bestVal;
    return Number(activeSeason?.cuota_unica) > 0 ? Number(activeSeason.cuota_unica) / 3 : 0;
  };
}