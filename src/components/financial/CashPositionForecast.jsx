import React, { useMemo } from "react";
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
  const registeredCommitments = commitments.filter(c => c.activo !== false).length;
  const missingBalances = activeAccounts.filter(a => a.saldo_actual === undefined || a.saldo_actual === null || a.saldo_actual === "").length;

  if (loading) return <Card><CardContent className="p-6 text-slate-500">Calculando posición de tesorería…</CardContent></Card>;
  if (accountsError) return <Card><CardContent className="p-6 text-red-600">No se pudieron cargar las cuentas bancarias. Revisa los permisos de tesorería.</CardContent></Card>;

  if (compact) return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Dinero disponible en bancos</p><p className="mt-2 text-2xl font-bold">{euro(cashNow)}</p><p className="mt-1 text-xs text-slate-500">Según los últimos saldos registrados</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Pendiente de cobrar</p><p className="mt-2 text-2xl font-bold text-green-700">{euro(pendingPaymentsTotal + pendingFinancialIncomeTotal)}</p><p className="mt-1 text-xs text-slate-500">Cuotas y otros ingresos pendientes de cobrar</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Pendiente de pagar</p><p className="mt-2 text-2xl font-bold text-red-700">{euro((forecast[0]?.recurring || 0) + (forecast[0]?.outstanding || 0))}</p><p className="mt-1 text-xs text-slate-500">Gastos pendientes y compromisos no duplicados</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Previsión a 12 meses</p><p className="mt-2 text-2xl font-bold">{euro(last?.closing)}</p><p className="mt-1 text-xs text-slate-500">Con los datos registrados actualmente</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Mínimo proyectado</p><p className={`mt-2 text-2xl font-bold ${minBalance < 0 ? "text-red-700" : "text-slate-900"}`}>{euro(minBalance)}</p><Badge variant={minBalance < 0 ? "destructive" : "secondary"} className="mt-2">{minBalance < 0 ? "Riesgo de saldo negativo" : "Previsión preliminar"}</Badge></CardContent></Card>
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4 sm:p-5">
          <details>
            <summary className="cursor-pointer list-none font-semibold text-slate-800">
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700">i</span>
              ¿De dónde sale cada cifra?
              <span className="ml-2 text-sm font-normal text-slate-500">Pulsa para ver el cálculo</span>
            </summary>
            <div className="mt-4 grid gap-3 border-t pt-4 text-sm text-slate-700 md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold">Dinero disponible en bancos: {euro(cashNow)}</p>
                <p className="mt-1">Suma el campo «saldo actual» de las cuentas bancarias activas registradas en Bancario. No se calcula sumando los movimientos del extracto. Si el saldo guardado está desactualizado o no conciliado, puede no coincidir con el saldo real.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold">Pendiente de cobrar: {euro(pendingPaymentsTotal + pendingFinancialIncomeTotal)}</p>
                <p className="mt-1">Suma cuotas/pagos que no están marcados como «Pagado» o «Anulado» y otros ingresos financieros con estado «Pendiente». Se excluyen pagos eliminados y se intenta evitar duplicidades por importe y nombre.</p>
                <p className="mt-2 text-xs text-slate-500">Cuotas y pagos: {euro(pendingPaymentsTotal)} · Otros ingresos pendientes: {euro(pendingFinancialIncomeTotal)}.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold">Pendiente de pagar: {euro((forecast[0]?.recurring || 0) + (forecast[0]?.outstanding || 0))}</p>
                <p className="mt-1">Suma los gastos financieros pendientes asignados al mes actual y los compromisos recurrentes activos que vencen este mes. Si una transacción coincide con un compromiso, intenta no descontarlo dos veces.</p>
                <p className="mt-2 text-xs text-slate-500">Compromisos no duplicados: {euro(forecast[0]?.recurring || 0)} · Gastos pendientes registrados: {euro(forecast[0]?.outstanding || 0)}.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold">Previsión a 12 meses: {euro(last?.closing)}</p>
                <p className="mt-1">Parte del saldo bancario registrado y proyecta mes a mes los gastos pendientes, compromisos recurrentes e ingresos pendientes asignados a cada mes. No incorpora ingresos futuros aún no registrados ni gastos que no se hayan introducido.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 md:col-span-2">
                <p className="font-semibold">Mínimo proyectado: {euro(minBalance)}</p>
                <p className="mt-1">Es el saldo de cierre más bajo entre los 12 meses proyectados. Ayuda a detectar el momento de menor liquidez; no es el saldo actual ni el resultado anual del club.</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 md:col-span-2">
                <p className="font-semibold">Importante: previsión preliminar</p>
                <p className="mt-1">La fiabilidad depende de que los saldos bancarios estén actualizados, los pagos correctamente clasificados y los compromisos recurrentes completos. Las cuotas vencidas que siguen pendientes se asignan al mes actual. Las coincidencias para evitar duplicados dependen de que los importes y nombres/conceptos estén identificados de forma reconocible.</p>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
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
