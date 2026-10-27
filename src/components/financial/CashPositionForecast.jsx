import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Wallet, CalendarRange } from "lucide-react";

const euro = (value) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
const PERIOD_MONTHS = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const normalizeText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function paymentMonthKey(payment, activeSeason) {
  const monthNames = { junio: 5, septiembre: 8, diciembre: 11 };
  const monthName = String(payment.mes || "").toLowerCase();
  const years = String(activeSeason?.temporada || "").match(/\d{4}/g) || [];
  const currentYear = new Date().getFullYear();
  const startYear = Number(years[0]) || currentYear;
  const endYear = Number(years[1]) || startYear + 1;
  const now = new Date();
  const currentKey = monthKey(new Date(now.getFullYear(), now.getMonth(), 1));
  if (monthName in monthNames) {
    const year = monthName === "junio" ? endYear : startYear;
    const dueKey = monthKey(new Date(year, monthNames[monthName], 1));
    // Las cuotas vencidas se proyectan como cobro pendiente del mes actual.
    return dueKey < currentKey ? currentKey : dueKey;
  }
  return currentKey;
}

function isPendingPayment(payment) {
  return payment.is_deleted !== true && !["Pagado", "Anulado"].includes(payment.estado) && Number(payment.cantidad) > 0;
}

function matchesCommitment(commitment, transaction) {
  const name = normalizeText(commitment.nombre);
  const thirdParty = normalizeText(commitment.tercero);
  const concept = normalizeText(transaction.concepto);
  const party = normalizeText(transaction.proveedor_cliente);
  const conceptMatch = name.length > 2 && concept.length > 2 && (concept === name || concept.includes(name) || name.includes(concept));
  const thirdPartyMatch = thirdParty.length > 2 && (concept.includes(thirdParty) || party.includes(thirdParty));
  return conceptMatch || thirdPartyMatch;
}

function dueInMonth(item, month) {
  if (item.activo === false || !item.fecha_inicio || !(Number(item.importe) > 0)) return false;
  const start = new Date(item.fecha_inicio + "T00:00:00");
  const end = item.fecha_fin ? new Date(item.fecha_fin + "T23:59:59") : null;
  if (month.getFullYear() < start.getFullYear() || (month.getFullYear() === start.getFullYear() && month.getMonth() < start.getMonth())) return false;
  if (end && new Date(month.getFullYear(), month.getMonth(), 1) > new Date(end.getFullYear(), end.getMonth(), 1)) return false;
  const interval = PERIOD_MONTHS[item.periodicidad] || 1;
  const diff = (month.getFullYear() - start.getFullYear()) * 12 + month.getMonth() - start.getMonth();
  return diff >= 0 && diff % interval === 0;
}

export default function CashPositionForecast({ compact = false, activeSeason }) {
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ["cashForecastBankAccounts"],
    queryFn: () => base44.entities.BankAccount.list(),
    staleTime: 60000,
  });
  const { data: commitments = [], isLoading: commitmentsLoading } = useQuery({
    queryKey: ["recurringFinancialCommitments"],
    queryFn: () => base44.entities.RecurringFinancialCommitment.list(),
    staleTime: 30000,
  });
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["cashForecastFinancialTransactions"],
    queryFn: () => base44.entities.FinancialTransaction.list("-fecha"),
    staleTime: 60000,
  });
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["cashForecastPayments", activeSeason?.temporada],
    queryFn: () => base44.entities.Payment.list(),
    staleTime: 60000,
  });

  const normalizedActiveSeason = String(activeSeason?.temporada || "").replace(/\D/g, "");
  const seasonPayments = payments.filter((payment) =>
    !normalizedActiveSeason || !payment.temporada || String(payment.temporada).replace(/\D/g, "") === normalizedActiveSeason
  );
  const pendingFinancialIncome = transactions.filter((t) =>
    t.estado === "Pendiente" &&
    t.tipo === "Ingreso" &&
    Number(t.cantidad) > 0 &&
    (!normalizedActiveSeason || !t.temporada || String(t.temporada).replace(/\D/g, "") === normalizedActiveSeason)
  );
  // Un cobro solo puede aparecer una vez en la previsión: si ya existe como partida
  // financiera pendiente, no volvemos a sumar el Payment equivalente.
  const pendingPayments = seasonPayments.filter((payment) => {
    if (!isPendingPayment(payment)) return false;
    const paymentName = normalizeText(payment.jugador_nombre);
    const amount = Number(payment.cantidad) || 0;
    const representedInLedger = pendingFinancialIncome.some((transaction) => {
      if (Math.abs((Number(transaction.cantidad) || 0) - amount) >= 0.02) return false;
      const concept = normalizeText(transaction.concepto);
      const party = normalizeText(transaction.proveedor_cliente);
      return paymentName.length > 2 && (concept.includes(paymentName) || party.includes(paymentName));
    });
    return !representedInLedger;
  });
  const pendingPaymentsTotal = pendingPayments.reduce((sum, payment) => sum + (Number(payment.cantidad) || 0), 0);
  const pendingFinancialIncomeTotal = pendingFinancialIncome.reduce((sum, transaction) => sum + (Number(transaction.cantidad) || 0), 0);

  const activeAccounts = accounts.filter(a => a.activa !== false);
  const hasBalances = activeAccounts.some(a => Number.isFinite(Number(a.saldo_actual)) && a.saldo_actual !== undefined && a.saldo_actual !== null);
  const cashNow = activeAccounts.reduce((sum, a) => sum + (Number(a.saldo_actual) || 0), 0);

  const forecast = useMemo(() => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let running = cashNow;
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
      const currentKey = monthKey(currentMonth);
      const monthTransactions = transactions.filter((t) => {
        const d = t.fecha ? new Date(t.fecha + "T00:00:00") : null;
        if (!d || t.estado === "Anulado") return false;
        const actualKey = monthKey(d);
        const effectiveKey = t.estado === "Pendiente" && actualKey < currentKey ? currentKey : actualKey;
        return effectiveKey === monthKey(month);
      });
      const pendingExpenseTransactions = monthTransactions.filter((t) =>
        t.estado === "Pendiente" && t.tipo === "Gasto" && Number(t.cantidad) > 0
      );
      // Si una obligación recurrente ya tiene una transacción registrada (pendiente o pagada),
      // esa transacción sustituye a la estimación y evita descontar el mismo gasto dos veces.
      const recurring = commitments.filter((c) => dueInMonth(c, month)).filter((c) =>
        !monthTransactions.some((t) => t.tipo === "Gasto" && matchesCommitment(c, t))
      ).reduce((sum, c) => sum + (Number(c.importe) || 0), 0);
      const outstanding = pendingExpenseTransactions.reduce((sum, t) => sum + Number(t.cantidad || 0), 0);
      const pendingIncomeTransactions = monthTransactions.filter((t) =>
        t.estado === "Pendiente" && t.tipo === "Ingreso" && Number(t.cantidad) > 0
      ).reduce((sum, t) => sum + Number(t.cantidad || 0), 0);
      const pendingPaymentIncome = pendingPayments
        .filter((payment) => paymentMonthKey(payment, activeSeason) === monthKey(month))
        .reduce((sum, payment) => sum + (Number(payment.cantidad) || 0), 0);
      const pendingIncome = pendingIncomeTransactions + pendingPaymentIncome;
      // No se suman ingresos recurrentes estimados: solo ingresos pendientes registrados.
      const totalOut = recurring + outstanding;
      running = running - totalOut + pendingIncome;
      return { key: monthKey(month), label: month.toLocaleDateString("es-ES", { month: "long", year: "numeric" }), opening: running + totalOut - pendingIncome, recurring, outstanding, pendingIncome, totalOut, closing: running };
    });
  }, [cashNow, commitments, transactions, pendingPayments, activeSeason]);

  const loading = accountsLoading || commitmentsLoading || transactionsLoading || paymentsLoading;
  const last = forecast[forecast.length - 1];
  const minBalance = forecast.length ? Math.min(...forecast.map(m => m.closing)) : cashNow;
  const currentMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const currentMonthKey = monthKey(currentMonthDate);
  const currentMonthTransactions = transactions.filter((t) => {
    if (!t.fecha || t.estado === "Anulado") return false;
    const date = new Date(t.fecha + "T00:00:00");
    const actualKey = monthKey(date);
    const effectiveKey = t.estado === "Pendiente" && actualKey < currentMonthKey ? currentMonthKey : actualKey;
    return effectiveKey === currentMonthKey;
  });
  const currentMonthPendingExpenses = currentMonthTransactions.filter(t => t.estado === "Pendiente" && t.tipo === "Gasto" && Number(t.cantidad) > 0);
  const currentMonthRecurring = commitments.filter(c => dueInMonth(c, currentMonthDate)).filter(c =>
    !currentMonthTransactions.some(t => t.tipo === "Gasto" && matchesCommitment(c, t))
  );
  const currentMonthRecurringTotal = currentMonthRecurring.reduce((sum, c) => sum + (Number(c.importe) || 0), 0);
  const currentMonthPendingExpensesTotal = currentMonthPendingExpenses.reduce((sum, t) => sum + (Number(t.cantidad) || 0), 0);
  const currentMonthPendingPayments = pendingPayments.filter(payment => paymentMonthKey(payment, activeSeason) === currentMonthKey);
  const currentMonthPendingIncome = pendingFinancialIncome.filter(t => {
    if (!t.fecha) return false;
    const d = new Date(t.fecha + "T00:00:00");
    const k = monthKey(d);
    return (k < currentMonthKey ? currentMonthKey : k) === currentMonthKey;
  });
  const registeredCommitments = commitments.filter(c => c.activo !== false).length;
  const missingBalances = activeAccounts.filter(a => a.saldo_actual === undefined || a.saldo_actual === null || a.saldo_actual === "").length;

  if (loading) return <Card><CardContent className="p-6 text-slate-500">Calculando posición de tesorería…</CardContent></Card>;
  if (accountsError) return <Card><CardContent className="p-6 text-red-600">No se pudieron cargar las cuentas bancarias. Revisa los permisos de tesorería.</CardContent></Card>;

  if (compact) return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Dinero disponible en bancos</p><p className="mt-2 text-2xl font-bold">{euro(cashNow)}</p><p className="mt-1 text-xs text-slate-500">Saldo actual guardado en cuentas activas</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Pendiente de cobrar</p><p className="mt-2 text-2xl font-bold text-green-700">{euro(pendingPaymentsTotal + pendingFinancialIncomeTotal)}</p><p className="mt-1 text-xs text-slate-500">Cuotas pendientes + ingresos financieros pendientes</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Pendiente de pagar</p><p className="mt-2 text-2xl font-bold text-red-700">{euro((forecast[0]?.recurring || 0) + (forecast[0]?.outstanding || 0))}</p><p className="mt-1 text-xs text-slate-500">Gastos pendientes + compromisos recurrentes del mes</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Previsión a 12 meses</p><p className="mt-2 text-2xl font-bold">{euro(last?.closing)}</p><p className="mt-1 text-xs text-slate-500">Saldo estimado al final del periodo</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Mínimo proyectado</p><p className={`mt-2 text-2xl font-bold ${minBalance < 0 ? "text-red-700" : "text-slate-900"}`}>{euro(minBalance)}</p><Badge variant={minBalance < 0 ? "destructive" : "secondary"} className="mt-2">{minBalance < 0 ? "Riesgo de saldo negativo" : "Previsión preliminar"}</Badge></CardContent></Card>
      </div>
      <Card className="border-slate-200 bg-white"><CardContent className="p-4 sm:p-5">
        <button type="button" aria-expanded={showCalculationDetails} onClick={() => setShowCalculationDetails(v => !v)} className="flex w-full items-center justify-between gap-3 rounded-lg text-left font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
          <span><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700">i</span>¿De dónde sale cada cifra?</span><span className="text-sm font-normal text-orange-700">{showCalculationDetails ? "Ocultar explicación −" : "Ver explicación +"}</span>
        </button>
        {showCalculationDetails && <div className="mt-4 grid gap-3 border-t pt-4 text-sm text-slate-700 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold">1. Dinero disponible en bancos = {euro(cashNow)}</p><p className="mt-1">Cálculo: suma de «saldo_actual» de cada cuenta bancaria con «activa» distinta de false. No suma los movimientos del extracto. Hay que comprobar en Bancario que cada saldo guardado sea el saldo real actualizado.</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold">2. Pendiente de cobrar = {euro(pendingPaymentsTotal + pendingFinancialIncomeTotal)}</p><p className="mt-1">El total suma cuotas/pagos pendientes y registros financieros de tipo Ingreso con estado Pendiente. «Ingreso financiero pendiente» no significa dinero ya cobrado: es una operación introducida en la sección Transacciones que alguien dejó marcada como pendiente. Revísala línea a línea antes de confiar en el total.</p><p className="mt-3 font-medium">Cuotas/pagos pendientes incluidos ({currentMonthPendingPayments.length} asignados al mes actual; {euro(pendingPaymentsTotal)} total de temporada):</p>{pendingPayments.length ? <div className="mt-2 max-h-52 overflow-auto rounded border bg-white"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2 text-left">Jugador / concepto</th><th className="p-2 text-left">Temporada / estado</th><th className="p-2 text-right">Importe</th></tr></thead><tbody>{pendingPayments.map((p,i)=><tr key={p.id || i} className="border-t"><td className="p-2">{p.jugador_nombre || p.concepto || "Pago sin nombre"}</td><td className="p-2">{p.temporada || "Sin temporada"} · {p.estado || "Sin estado"}</td><td className="p-2 text-right">{euro(p.cantidad)}</td></tr>)}</tbody></table></div> : <p className="mt-1 text-xs text-slate-500">No hay cuotas pendientes en los registros cargados.</p>}<p className="mt-3 font-medium">Otros ingresos financieros pendientes ({euro(pendingFinancialIncomeTotal)} total):</p>{pendingFinancialIncome.length ? <div className="mt-2 max-h-52 overflow-auto rounded border bg-white"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Concepto / tercero</th><th className="p-2 text-right">Importe</th></tr></thead><tbody>{pendingFinancialIncome.map((t,i)=><tr key={t.id || i} className="border-t"><td className="p-2">{t.fecha || "Sin fecha"}</td><td className="p-2">{t.concepto || "Sin concepto"}{t.proveedor_cliente ? ` · ${t.proveedor_cliente}` : ""}</td><td className="p-2 text-right">{euro(t.cantidad)}</td></tr>)}</tbody></table></div> : <p className="mt-1 text-xs text-slate-500">No hay otros ingresos financieros pendientes.</p>}<p className="mt-2 text-xs text-amber-800">Aviso: la suma puede no representar exclusivamente cuotas realmente pendientes de familias. Revisa las dos listas y cualquier coincidencia duplicada.</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold">3. Pendiente de pagar este mes = {euro(currentMonthRecurringTotal + currentMonthPendingExpensesTotal)}</p><p className="mt-1">Esta cifra solo suma (a) compromisos recurrentes activos cuyo calendario indica que vencen este mes y que no parecen tener una transacción de gasto coincidente, más (b) transacciones de gasto marcadas «Pendiente» con fecha de este mes. No es automáticamente el total de nóminas ni de todas las obligaciones.</p><p className="mt-3 font-medium">Pagos recurrentes incluidos ({currentMonthRecurring.length}; {euro(currentMonthRecurringTotal)}):</p>{currentMonthRecurring.length ? <div className="mt-2 overflow-auto rounded border bg-white"><table className="w-full text-xs"><thead className="bg-slate-100"><tr><th className="p-2 text-left">Concepto / persona</th><th className="p-2 text-left">Periodicidad / categoría</th><th className="p-2 text-right">Importe previsto</th></tr></thead><tbody>{currentMonthRecurring.map((c,i)=><tr key={c.id || i} className="border-t"><td className="p-2">{c.nombre}{c.tercero ? ` · ${c.tercero}` : ""}</td><td className="p-2">{c.periodicidad || "Mensual"} · {c.categoria || "Sin categoría"}</td><td className="p-2 text-right">{euro(c.importe)}</td></tr>)}</tbody></table></div> : <p className="mt-1 text-xs text-slate-500">No hay compromisos recurrentes que la fórmula esté incluyendo para este mes. Comprueba la lista de «Pagos recurrentes del club» debajo de esta previsión.</p>}<p className="mt-3 font-medium">Gastos pendientes registrados ({currentMonthPendingExpenses.length}; {euro(currentMonthPendingExpensesTotal)}):</p>{currentMonthPendingExpenses.length ? <div className="mt-2 max-h-52 overflow-auto rounded border bg-white"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Concepto / proveedor</th><th className="p-2 text-right">Importe</th></tr></thead><tbody>{currentMonthPendingExpenses.map((t,i)=><tr key={t.id || i} className="border-t"><td className="p-2">{t.fecha || "Sin fecha"}</td><td className="p-2">{t.concepto || "Sin concepto"}{t.proveedor_cliente ? ` · ${t.proveedor_cliente}` : ""}</td><td className="p-2 text-right">{euro(t.cantidad)}</td></tr>)}</tbody></table></div> : <p className="mt-1 text-xs text-slate-500">No hay gastos financieros pendientes con fecha efectiva de este mes.</p>}<p className="mt-2 text-xs text-amber-800">Los sueldos y asignaciones de entrenadores solo están incluidos si figuran en «Pagos recurrentes del club» y su fecha/periodicidad corresponde a este mes, o si están registrados como gasto pendiente en Transacciones. Si falta alguna persona o nómina en esas listas, no se suma automáticamente.</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold">4. Previsión a 12 meses = {euro(last?.closing)}</p><p className="mt-1">El cálculo arranca de {euro(cashNow)}. Para cada uno de los próximos 12 meses resta compromisos recurrentes no duplicados y gastos pendientes, y suma ingresos financieros pendientes y cuotas pendientes asignadas a ese mes. No incorpora cuotas futuras aún no registradas, ingresos probables ni gastos no introducidos. La previsión usa fechas/estados y reglas de coincidencia; no equivale a un presupuesto anual.</p></div>
          <div className="rounded-lg bg-slate-50 p-3 md:col-span-2"><p className="font-semibold">5. Mínimo proyectado = {euro(minBalance)}</p><p className="mt-1">Es el menor de los 12 saldos finales mensuales calculados por la previsión anterior. Indica el punto más bajo estimado de liquidez, no el saldo actual.</p></div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 md:col-span-2"><p className="font-semibold">Ojo: estas cifras no están verificadas por sí solas.</p><p className="mt-1">Dependen de los saldos guardados, de los estados/fechas de cada registro y de que los compromisos recurrentes estén completos. Las cuotas vencidas pendientes se desplazan al mes actual. Las coincidencias automáticas pueden fallar; antes de tomar decisiones, hay que contrastar los detalles con el banco y los registros del club.</p></div>
        </div>}
      </CardContent></Card>
    </div>
  );
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><Wallet className="h-4 w-4"/>Saldo bancario registrado</div><p className="mt-2 text-2xl font-bold">{euro(cashNow)}</p><p className="mt-1 text-xs text-slate-500">{activeAccounts.length} cuenta(s) activa(s)</p></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><TrendingDown className="h-4 w-4"/>Compromisos recurrentes</div><p className="mt-2 text-2xl font-bold">{euro(forecast[0]?.recurring)}</p><p className="mt-1 text-xs text-slate-500">Estimados para este mes</p></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><CalendarRange className="h-4 w-4"/>Saldo estimado a 12 meses</div><p className="mt-2 text-2xl font-bold">{euro(last?.closing)}</p><p className="mt-1 text-xs text-slate-500">Sin ingresos futuros no registrados</p></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><AlertTriangle className="h-4 w-4"/>Mínimo proyectado</div><p className="mt-2 text-2xl font-bold">{euro(minBalance)}</p><Badge variant={minBalance < 0 ? "destructive" : "secondary"} className="mt-2">{minBalance < 0 ? "Riesgo de saldo negativo" : "Proyección preliminar"}</Badge></CardContent></Card>
    </div>

    <Card className="border-amber-200">
      <CardHeader><CardTitle>Previsión de caja · próximos 12 meses</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><div className="flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0"/><p><strong>Previsión conservadora, no una autorización automática para gastar.</strong> Parte del saldo_actual guardado en las cuentas, resta compromisos recurrentes y gastos pendientes registrados, y suma solo ingresos pendientes registrados en ese mes. No incluye cuotas futuras aún no registradas, ingresos probables, comisiones de Stripe ni gastos no introducidos. Comprueba que los saldos estén actualizados y conciliados antes de decidir.</p></div></div>
        {activeAccounts.length === 0 && <p className="text-sm text-red-600">No hay cuentas bancarias activas. Añade o activa las cuentas en la sección Bancario para que la proyección tenga una base real.</p>}
        {(missingBalances > 0 || !hasBalances) && <p className="text-sm text-orange-700">Hay cuentas sin saldo registrado o no se ha podido verificar la vigencia de los saldos. La cifra de caja puede estar incompleta.</p>}
        {registeredCommitments === 0 && <p className="text-sm text-orange-700">Todavía no hay compromisos recurrentes activos registrados. La proyección podría infravalorar los gastos.</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Mes</th><th className="p-3 text-right">Recurrentes</th><th className="p-3 text-right">Gastos pendientes</th><th className="p-3 text-right">Ingresos pendientes</th><th className="p-3 text-right">Saldo final estimado</th></tr></thead><tbody>{forecast.map(m => <tr key={m.key} className="border-b last:border-0"><td className="p-3 capitalize">{m.label}</td><td className="p-3 text-right">{euro(m.recurring)}</td><td className="p-3 text-right">{euro(m.outstanding)}</td><td className="p-3 text-right">{euro(m.pendingIncome)}</td><td className="p-3 text-right font-semibold">{euro(m.closing)}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-slate-500">Control de duplicidades activo: cuando una transacción coincide con un compromiso recurrente del mismo mes, la previsión usa la transacción registrada en lugar de volver a descontar el compromiso. Las coincidencias dependen de que los conceptos o proveedores estén identificados de forma reconocible.</p>
      </CardContent>
    </Card>
  </div>;
}
