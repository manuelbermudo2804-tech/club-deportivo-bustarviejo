import { getPaymentCollected } from "@/components/payments/paymentHelpers";
import { seasonMatches } from "@/components/financial/panel/financeStats";

export const MESES = ["Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May"];
export const MESES_LARGOS = ["Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo"];

// "2026-2027" -> "2025-2026"
export const previousSeason = (temporada) => {
  const years = String(temporada || "").match(/\d{4}/g);
  if (!years || years.length < 2) return null;
  return `${Number(years[0]) - 1}-${Number(years[1]) - 1}`;
};

// Posición del mes dentro de la temporada (junio = 0 ... mayo = 11)
const seasonMonthIndex = (date) => {
  const d = new Date(date);
  if (isNaN(d)) return -1;
  return (d.getMonth() + 7) % 12;
};

// Lista plana de cobros de una temporada con su mes
export function collectIncome(temporada, { payments, lotteryOrders, clubMembers }) {
  if (!temporada) return [];
  const items = [];
  payments.forEach((p) => {
    if (p.is_deleted === true || !seasonMatches(p.temporada, temporada)) return;
    const importe = getPaymentCollected(p);
    if (importe <= 0) return;
    items.push({ origen: "Cuotas", nombre: p.jugador_nombre, concepto: p.mes || "Cuota", importe, fecha: p.fecha_pago || p.created_date });
  });
  lotteryOrders.forEach((o) => {
    if (o.pagado !== true || !seasonMatches(o.temporada, temporada)) return;
    items.push({ origen: "Lotería", nombre: o.jugador_nombre, concepto: "Lotería", importe: Number(o.total) || 0, fecha: o.fecha_pago || o.created_date });
  });
  clubMembers.forEach((m) => {
    if (m.estado_pago !== "Pagado" || !seasonMatches(m.temporada, temporada)) return;
    items.push({ origen: "Socios", nombre: m.nombre_completo, concepto: "Cuota de socio", importe: Number(m.cuota_pagada) || 0, fecha: m.fecha_pago || m.created_date });
  });
  return items.map((i) => ({ ...i, mesIndex: seasonMonthIndex(i.fecha) })).filter((i) => i.mesIndex >= 0 && i.importe > 0);
}

export function monthlyTotals(items) {
  const totals = Array(12).fill(0);
  items.forEach((i) => { totals[i.mesIndex] += i.importe; });
  return totals;
}