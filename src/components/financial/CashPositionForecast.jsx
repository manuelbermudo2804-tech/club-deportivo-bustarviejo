import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Wallet, CalendarRange } from "lucide-react";

const euro = (value) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
const PERIOD_MONTHS = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

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

export default function CashPositionForecast() {
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

  const activeAccounts = accounts.filter(a => a.activa !== false);
  const hasBalances = activeAccounts.some(a => Number.isFinite(Number(a.saldo_actual)) && a.saldo_actual !== undefined && a.saldo_actual !== null);
  const cashNow = activeAccounts.reduce((sum, a) => sum + (Number(a.saldo_actual) || 0), 0);

  const forecast = useMemo(() => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let running = cashNow;
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
      const recurring = commitments.reduce((sum, c) => sum + (dueInMonth(c, month) ? Number(c.importe) || 0 : 0), 0);
      const outstanding = transactions.filter(t => {
        if (t.estado !== "Pendiente" || t.tipo !== "Gasto" || t.estado === "Anulado") return false;
        const d = t.fecha ? new Date(t.fecha + "T00:00:00") : null;
        return d && monthKey(d) === monthKey(month) && Number(t.cantidad) > 0;
      }).reduce((sum, t) => sum + Number(t.cantidad || 0), 0);
      const pendingIncome = transactions.filter(t => {
        if (t.estado !== "Pendiente" || t.tipo !== "Ingreso") return false;
        const d = t.fecha ? new Date(t.fecha + "T00:00:00") : null;
        return d && monthKey(d) === monthKey(month) && Number(t.cantidad) > 0;
      }).reduce((sum, t) => sum + Number(t.cantidad || 0), 0);
      // No se suman ingresos recurrentes estimados: solo ingresos pendientes registrados.
      const totalOut = recurring + outstanding;
      running = running - totalOut + pendingIncome;
      return { key: monthKey(month), label: month.toLocaleDateString("es-ES", { month: "long", year: "numeric" }), opening: running + totalOut - pendingIncome, recurring, outstanding, pendingIncome, totalOut, closing: running };
    });
  }, [cashNow, commitments, transactions]);

  const loading = accountsLoading || commitmentsLoading || transactionsLoading;
  const last = forecast[forecast.length - 1];
  const minBalance = forecast.length ? Math.min(...forecast.map(m => m.closing)) : cashNow;
  const registeredCommitments = commitments.filter(c => c.activo !== false).length;
  const missingBalances = activeAccounts.filter(a => a.saldo_actual === undefined || a.saldo_actual === null || a.saldo_actual === "").length;

  if (loading) return <Card><CardContent className="p-6 text-slate-500">Calculando posición de tesorería…</CardContent></Card>;
  if (accountsError) return <Card><CardContent className="p-6 text-red-600">No se pudieron cargar las cuentas bancarias. Revisa los permisos de tesorería.</CardContent></Card>;

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
        <p className="text-xs text-slate-500">Aviso contra duplicidades: si un gasto pendiente también está registrado como compromiso recurrente, ambos podrían restarse. Revisa los conceptos y estados antes de usar el saldo proyectado como base de una decisión.</p>
      </CardContent>
    </Card>
  </div>;
}
