import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ClipboardList, Euro, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const money = (value) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
const normSeason = (value) => String(value || "").replace(/[^\d]/g, "");
const seasonMatches = (a, b) => !a || !b ? true : normSeason(a) === normSeason(b);

export default function SeasonBudgetDashboard({ activeSeason }) {
  const { data: transactions = [], isLoading: txLoading, refetch: refreshTx } = useQuery({
    queryKey: ["budgetDashboardTransactions"],
    queryFn: () => base44.entities.FinancialTransaction.list("-fecha", 500),
    staleTime: 60000,
  });
  const { data: rules = [], refetch: refreshRules } = useQuery({
    queryKey: ["budgetDashboardRules"],
    queryFn: () => base44.entities.ReconciliationRule.list("-veces_aplicada", 500),
    staleTime: 60000,
  });
  const { data: customCategories = [], refetch: refreshCategories } = useQuery({
    queryKey: ["budgetDashboardCategories"],
    queryFn: () => base44.entities.FinancialCategory.list("-orden", 500),
    staleTime: 60000,
  });
  const { data: budgets = [], refetch: refreshBudgets } = useQuery({
    queryKey: ["budgetDashboardBudgets"],
    queryFn: () => base44.entities.Budget.list("-created_date", 500),
    staleTime: 60000,
  });
  const { data: payments = [], isLoading: paymentsLoading, refetch: refreshPayments } = useQuery({
    queryKey: ["budgetDashboardPayments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
    staleTime: 60000,
  });
  const { data: players = [] } = useQuery({
    queryKey: ["budgetDashboardPlayers"],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 60000,
  });

  const model = useMemo(() => {
    const season = activeSeason?.temporada || "2026-2027";
    const inSeason = (row) => {
      if (row.temporada) return seasonMatches(row.temporada, season);
      const date = row.fecha || row.created_date || row.created_at;
      if (!date || !activeSeason?.fecha_inicio || !activeSeason?.fecha_fin) return true;
      const t = new Date(date).getTime();
      return t >= new Date(activeSeason.fecha_inicio).getTime() && t <= new Date(activeSeason.fecha_fin).getTime();
    };
    const tx = transactions.filter(inSeason).filter(t => t.estado !== "Anulado");
    const pay = payments.filter(p => inSeason(p) && p.is_deleted !== true && p.estado !== "Anulado" && p.estado !== "Cancelado");
    const playersById = new Map(players.map(player => [player.id, player]));
    const budget = budgets.find(b => seasonMatches(b.temporada, season));
    const partidas = new Map();
    const add = (name, type, source) => {
      const label = String(name || "").trim();
      if (!label) return;
      const key = label.toLocaleLowerCase("es");
      if (!partidas.has(key)) partidas.set(key, { nombre: label, types: new Set(), sources: new Set() });
      if (type) partidas.get(key).types.add(type);
      if (source) partidas.get(key).sources.add(source);
    };
    tx.forEach(t => { add(t.partida_nombre, t.tipo, "Transacciones · partida"); add(t.categoria, t.tipo, "Transacciones · categoría"); add(t.subcategoria, t.tipo, "Transacciones · subcategoría"); });
    rules.forEach(r => { add(r.partida_nombre, r.tipo_transaccion, "Reglas de conciliación"); add(r.categoria_destino, r.tipo_transaccion, "Reglas de conciliación · categoría"); });
    customCategories.filter(c => c.activa !== false).forEach(c => add(c.nombre, "", "Categorías financieras"));
    (budget?.partidas || []).forEach(p => add(p.nombre, p.categoria === "Ingresos" ? "Ingreso" : "Gasto", "Presupuesto guardado"));
    const rows = [...partidas.values()].map(p => {
      const match = (t) => [t.partida_nombre, t.categoria, t.subcategoria].some(v => String(v || "").trim().toLocaleLowerCase("es") === p.nombre.toLocaleLowerCase("es"));
      const related = tx.filter(match);
      const income = related.filter(t => t.tipo === "Ingreso" && ["Cobrado", "Pagado"].includes(t.estado)).reduce((s,t)=>s+Number(t.cantidad||0),0);
      const expense = related.filter(t => t.tipo === "Gasto" && ["Pagado", "Cobrado"].includes(t.estado)).reduce((s,t)=>s+Number(t.cantidad||0),0);
      const pending = related.filter(t => t.estado === "Pendiente").reduce((s,t)=>s+Number(t.cantidad||0),0);
      const budgetLine = (budget?.partidas || []).find(x => String(x.nombre||"").trim().toLocaleLowerCase("es") === p.nombre.toLocaleLowerCase("es"));
      return { ...p, count: related.length, income, expense, pending, planned: Number(budgetLine?.presupuestado || 0), budgetCategory: budgetLine?.categoria || "" };
    }).sort((a,b) => a.nombre.localeCompare(b.nombre, "es"));
    const actualIncome = tx.filter(t => t.tipo === "Ingreso" && t.estado === "Cobrado").reduce((s,t)=>s+Number(t.cantidad||0),0);
    const actualExpenses = tx.filter(t => t.tipo === "Gasto" && t.estado === "Pagado").reduce((s,t)=>s+Number(t.cantidad||0),0);
    const pendingTx = tx.filter(t => t.estado === "Pendiente").reduce((s,t)=>s+Number(t.cantidad||0),0);
    const paidPlayerFees = pay.filter(p=>p.estado==="Pagado").reduce((s,p)=>s+Number(p.cantidad||0),0);
    const pendingPlayerFees = pay.filter(p=>p.estado==="Pendiente"||p.estado==="En revisión").reduce((s,p)=>s+Number(p.cantidad||0),0);
    // Solo contar como revisión lo que está marcado expresamente; no convertir automáticamente
    // todas las transacciones sin partida detallada en incidencias.
    const unclassified = tx.filter(t => t.revisar_clasificacion === true);
    const sportsSummary = pay.reduce((acc, payment) => {
      const player = playersById.get(payment.jugador_id);
      const category = String(payment.categoria_actividad || payment.categoria_equipo || payment.equipo_nombre || player?.deporte || "Categoría no informada").trim();
      if (!acc[category]) acc[category] = { count: 0, paid: 0, pending: 0 };
      acc[category].count += 1;
      if (payment.estado === "Pagado") acc[category].paid += Number(payment.cantidad || 0);
      if (payment.estado === "Pendiente" || payment.estado === "En revisión") acc[category].pending += Number(payment.cantidad || 0);
      return acc;
    }, {});
    return { season, tx, pay, rows, actualIncome, actualExpenses, pendingTx, paidPlayerFees, pendingPlayerFees, unclassified, sportsSummary, budget };
  }, [activeSeason, transactions, rules, customCategories, budgets, payments, players]);

  const refreshAll = async () => { await Promise.all([refreshTx(), refreshRules(), refreshCategories(), refreshBudgets(), refreshPayments()]); };

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-2xl font-bold text-slate-900">Presupuesto de temporada {model.season}</h2><p className="text-sm text-slate-500">Construido con las categorías y partidas que ya existen en la aplicación.</p></div>
      <Button variant="outline" onClick={refreshAll}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar datos</Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Ingresos contabilizados y cobrados</p><p className="mt-2 text-2xl font-bold text-emerald-700">{money(model.actualIncome)}</p><p className="mt-1 text-xs text-slate-500">Desde transacciones financieras en estado Cobrado.</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Gastos contabilizados y pagados</p><p className="mt-2 text-2xl font-bold text-rose-700">{money(model.actualExpenses)}</p><p className="mt-1 text-xs text-slate-500">Desde transacciones financieras en estado Pagado.</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Resultado de transacciones</p><p className={"mt-2 text-2xl font-bold "+(model.actualIncome-model.actualExpenses>=0?"text-emerald-700":"text-rose-700")}>{money(model.actualIncome-model.actualExpenses)}</p><p className="mt-1 text-xs text-slate-500">No equivale al saldo bancario.</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Movimientos por revisar</p><p className="mt-2 text-2xl font-bold text-amber-700">{model.unclassified.length}</p><p className="mt-1 text-xs text-slate-500">Sin partida o marcados para revisión.</p></CardContent></Card>
    </div>
    <Card className="border-amber-200 bg-amber-50/60"><CardContent className="flex items-start gap-3 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/><div className="text-sm text-amber-950"><p className="font-semibold">Control de duplicidades: Stripe y cuotas</p><p className="mt-1">Los cobros de cuotas registrados en la aplicación se muestran aparte para control de cobrado y pendiente; no se suman a los ingresos contables de arriba. Las liquidaciones netas de Stripe al banco tampoco se deben registrar como un segundo ingreso. Las comisiones se reflejarán según el detalle contable real, sin volver a descontarlas si ya están incluidas en el importe contabilizado.</p><p className="mt-1">Cobrado según registros de cuotas: <b>{money(model.paidPlayerFees)}</b> · Pendiente / en revisión: <b>{money(model.pendingPlayerFees)}</b>. Estas cifras son de control y no se añaden al total de ingresos.</p></div></CardContent></Card>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-orange-600"/>Inventario completo de categorías y partidas</CardTitle><p className="text-sm text-slate-500">Incluye nombres encontrados en transacciones, categorías financieras, reglas de conciliación y presupuestos guardados. Las filas se conservan por nombre; no se sustituyen por plantillas.</p></CardHeader>
      <CardContent>
        {txLoading || paymentsLoading ? <p className="py-8 text-center text-slate-500">Cargando registros…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3 pr-3">Partida / categoría existente</th><th className="py-3 pr-3 text-right">Movimientos</th><th className="py-3 pr-3 text-right">Ingresos cobrados</th><th className="py-3 pr-3 text-right">Gastos pagados</th><th className="py-3 pr-3 text-right">Pendiente en transacciones</th><th className="py-3 pr-3">Origen</th></tr></thead><tbody>{model.rows.map((r,i)=><tr key={r.nombre} className="border-b last:border-0 hover:bg-slate-50"><td className="py-3 pr-3 font-medium text-slate-900">{r.nombre}{r.sources.size>1&&<Badge variant="outline" className="ml-2">varios orígenes</Badge>}</td><td className="py-3 pr-3 text-right">{r.count}</td><td className="py-3 pr-3 text-right text-emerald-700">{money(r.income)}</td><td className="py-3 pr-3 text-right text-rose-700">{money(r.expense)}</td><td className="py-3 pr-3 text-right">{money(r.pending)}</td><td className="py-3 pr-3 text-xs text-slate-500">{[...r.sources].join(" · ")}</td></tr>)}</tbody></table></div>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500"><Badge variant="outline">{model.rows.length} nombres únicos detectados</Badge><Badge variant="outline">{model.tx.length} transacciones en el filtro</Badge><Badge variant="outline">{model.pay.length} registros de cuotas/pagos</Badge></div>
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Euro className="h-5 w-5 text-orange-600"/>Control de inscripciones por categoría deportiva</CardTitle><p className="text-sm text-slate-500">Desglose de los registros de pagos; independiente de la contabilidad para evitar duplicidades.</p></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3">Categoría deportiva registrada</th><th className="py-3 text-right">N.º pagos</th><th className="py-3 text-right">Pagado</th><th className="py-3 text-right">Pendiente / revisión</th></tr></thead><tbody>{Object.entries(model.sportsSummary).sort((a,b)=>a[0].localeCompare(b[0],"es")).map(([name,v])=><tr key={name} className="border-b last:border-0"><td className="py-3">{name}</td><td className="py-3 text-right">{v.count}</td><td className="py-3 text-right text-emerald-700">{money(v.paid)}</td><td className="py-3 text-right">{money(v.pending)}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-slate-500">Categoría obtenida del pago o, si falta, del deporte del jugador asociado. Se excluyen pagos anulados y eliminados. Los importes reflejan pagos registrados; las cuotas futuras que aún no tienen registro se calculan aparte en el panel de tesorería.</p></CardContent></Card>
  </div>;
}
