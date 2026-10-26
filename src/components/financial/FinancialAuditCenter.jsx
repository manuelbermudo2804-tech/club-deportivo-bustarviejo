import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCw, ShieldAlert, Activity, Landmark, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const money = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v) || 0);
const dateText = (v) => v ? new Date(v).toLocaleDateString("es-ES") : "—";

export default function FinancialAuditCenter({ activeSeason }) {
  const { data: transactions = [], isLoading: txLoading, refetch: refreshTx } = useQuery({
    queryKey: ["financialAuditTransactions"],
    queryFn: () => base44.entities.FinancialTransaction.list("-fecha", 500),
    staleTime: 60000,
  });
  const { data: movements = [], isLoading: bankLoading, refetch: refreshMovements } = useQuery({
    queryKey: ["financialAuditBankMovements"],
    queryFn: () => base44.entities.BankMovement.list("-fecha", 500),
    staleTime: 60000,
  });
  const { data: sessions = [], refetch: refreshSessions } = useQuery({
    queryKey: ["financialAuditSessions"],
    queryFn: () => base44.entities.ReconciliationSession.list("-fecha_recepcion", 500),
    staleTime: 60000,
  });
  const { data: budgets = [], refetch: refreshBudgets } = useQuery({
    queryKey: ["financialAuditBudgets"],
    queryFn: () => base44.entities.Budget.list("-created_date", 500),
    staleTime: 60000,
  });

  const audit = useMemo(() => {
    const season = activeSeason?.temporada || "2026-2027";
    const norm = (v) => String(v || "").replace(/[^\d]/g, "");
    const txSeason = transactions.filter(t => t.temporada && norm(t.temporada) === norm(season)).filter(t => t.estado !== "Anulado");
    const unassignedSeasonTx = transactions.filter(t => !t.temporada && t.estado !== "Anulado");
    const bankSeason = movements.filter(m => {
      const movementDate = String(m.fecha || "");
      if (activeSeason?.fecha_inicio && movementDate < activeSeason.fecha_inicio) return false;
      if (activeSeason?.fecha_fin && movementDate > activeSeason.fecha_fin) return false;
      const session = sessions.find(s => s.id === m.reconciliation_session_id);
      return !session || !session.fecha_inicio || !session.fecha_fin || (movementDate >= session.fecha_inicio && movementDate <= session.fecha_fin);
    });
    const stripePayouts = txSeason.filter(t => /stripe/i.test(String(t.concepto || "")) && t.tipo === "Ingreso" && t.estado === "Cobrado");
    const unlinkedBank = bankSeason.filter(m => m.reconciliado === true && !m.financial_transaction_id && !m.payment_id);
    const pendingBank = bankSeason.filter(m => m.reconciliado !== true);
    // La relación canónica de conciliación está en BankMovement.financial_transaction_id.
    const txIds = new Set(transactions.map(t => t.id));
    const missingTxLinks = bankSeason.filter(m => m.financial_transaction_id && !txIds.has(m.financial_transaction_id));
    const bankByTx = new Map();
    bankSeason.filter(m => m.financial_transaction_id).forEach(m => {
      const key = m.financial_transaction_id;
      if (!bankByTx.has(key)) bankByTx.set(key, []);
      bankByTx.get(key).push(m);
    });
    const duplicateBankLinks = [...bankByTx.entries()].filter(([,items]) => items.length > 1).map(([id,items]) => [id,items.length]);
    const budgetsBySeason = new Map();
    budgets.filter(b => b.temporada).forEach(b => {
      const key = norm(b.temporada);
      if (!budgetsBySeason.has(key)) budgetsBySeason.set(key, []);
      budgetsBySeason.get(key).push(b);
    });
    const duplicateBudgets = [...budgetsBySeason.entries()].filter(([,items]) => items.length > 1).map(([key,items]) => ({ season: items[0].temporada, items }));
    const balanceIssues = sessions.filter(s => Number.isFinite(Number(s.diferencia_saldos)) && Math.abs(Number(s.diferencia_saldos)) > 0.01);
    const latestSession = [...sessions].sort((a,b) => String(b.fecha_recepcion||"").localeCompare(String(a.fecha_recepcion||"")))[0];
    const categoryPartidaMismatch = txSeason.filter(t => {
      const cat = String(t.categoria || "").trim().toLocaleLowerCase("es");
      const part = String(t.partida_nombre || "").trim().toLocaleLowerCase("es");
      return cat && part && !part.includes(cat) && !cat.includes(part);
    });
    return { season, txSeason, unassignedSeasonTx, bankSeason, stripePayouts, unlinkedBank, pendingBank, missingTxLinks, duplicateBankLinks, duplicateBudgets, balanceIssues, latestSession, categoryPartidaMismatch };
  }, [activeSeason, transactions, movements, sessions, budgets]);

  const refreshAll = async () => { await Promise.all([refreshTx(), refreshMovements(), refreshSessions(), refreshBudgets()]); };
  const loading = txLoading || bankLoading;
  const issues = [
    { title: "Posibles liquidaciones Stripe contabilizadas como ingreso", count: audit.stripePayouts.length, detail: audit.stripePayouts.length ? audit.stripePayouts.map(t => `${dateText(t.fecha)} · ${money(t.cantidad)} · ${t.concepto}`).slice(0,5).join("\n") : "No se han detectado por el texto del concepto.", level: audit.stripePayouts.length ? "review" : "ok" },
    { title: "Transacciones sin temporada asignada", count: audit.unassignedSeasonTx.length, detail: audit.unassignedSeasonTx.length ? audit.unassignedSeasonTx.slice(0,6).map(t => `${dateText(t.fecha)} · ${money(t.cantidad)} · ${t.tipo} · ${t.concepto}`).join("\n") : "No se han detectado.", level: audit.unassignedSeasonTx.length ? "review" : "ok" },
    { title: "Movimientos bancarios conciliados sin enlace a pago o transacción", count: audit.unlinkedBank.length, detail: audit.unlinkedBank.length ? audit.unlinkedBank.slice(0,6).map(m => `${dateText(m.fecha)} · ${money(m.importe)} · ${m.concepto}`).join("\n") : "No se han detectado.", level: audit.unlinkedBank.length ? "review" : "ok" },
    { title: "Movimientos bancarios pendientes de conciliación", count: audit.pendingBank.length, detail: audit.pendingBank.length ? audit.pendingBank.slice(0,6).map(m => `${dateText(m.fecha)} · ${money(m.importe)} · ${m.concepto}`).join("\n") : "No se han detectado.", level: audit.pendingBank.length ? "review" : "ok" },
    { title: "Presupuestos duplicados por temporada", count: audit.duplicateBudgets.reduce((n,x)=>n+x.items.length,0), detail: audit.duplicateBudgets.length ? audit.duplicateBudgets.map(x => `${x.season}: ${x.items.map(b=>b.nombre || b.id).join(" / ")} (${x.items.length} registros)`).join("\n") : "No se han detectado temporadas con más de un presupuesto.", level: audit.duplicateBudgets.length ? "review" : "ok" },
    { title: "Sesiones de extracto con diferencia de saldo", count: audit.balanceIssues.length, detail: audit.balanceIssues.length ? audit.balanceIssues.map(s => `${s.archivo_nombre || s.id}: diferencia ${money(s.diferencia_saldos)}`).join("\n") : "Todas las sesiones con diferencia informada cuadran dentro de 0,01 €.", level: audit.balanceIssues.length ? "review" : "ok" },
    { title: "Categoría y partida con nombres distintos", count: audit.categoryPartidaMismatch.length, detail: audit.categoryPartidaMismatch.length ? audit.categoryPartidaMismatch.slice(0,6).map(t => `${dateText(t.fecha)} · ${money(t.cantidad)} · categoría: ${t.categoria} · partida: ${t.partida_nombre} · ${t.concepto}`).join("\n") : "No se han detectado diferencias de denominación.", level: audit.categoryPartidaMismatch.length ? "review" : "ok" },
    { title: "Transacciones enlazadas a varios movimientos bancarios", count: audit.duplicateBankLinks.length, detail: audit.duplicateBankLinks.length ? audit.duplicateBankLinks.map(([id,n])=>`${id}: ${n} movimientos bancarios`).join("\n") : "No se han detectado.", level: audit.duplicateBankLinks.length ? "review" : "ok" },
    { title: "Movimientos bancarios con enlace a transacción inexistente", count: audit.missingTxLinks.length, detail: audit.missingTxLinks.length ? audit.missingTxLinks.slice(0,6).map(m => `${dateText(m.fecha)} · ${money(m.importe)} · ${m.concepto}`).join("\n") : "No se han detectado.", level: audit.missingTxLinks.length ? "review" : "ok" },
  ];
  const issueCount = issues.filter(i=>i.level==="review").reduce((n,i)=>n+i.count,0);

  return <div className="space-y-5 rounded-[2rem] bg-gradient-to-b from-slate-50 via-white to-orange-50/50 p-2 sm:p-4">
    <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl shadow-slate-950/15 ring-1 ring-white/10 sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-indigo-400/15 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-200"><ShieldAlert className="h-4 w-4"/> Control · Trazabilidad</div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Centro de Control <span className="text-orange-300">Financiero</span></h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Revisión de trazabilidad, conciliación y posibles duplicidades. Las alertas ayudan a priorizar el trabajo; no modifican ni reclasifican movimientos automáticamente.</p></div>
      <Button variant="secondary" onClick={refreshAll} className="relative z-10 shrink-0 rounded-xl border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur hover:bg-white/20"><RefreshCw className="mr-2 h-4 w-4"/>Actualizar auditoría</Button>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-gradient-to-br from-white to-slate-100/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"><CardContent className="relative p-5"><div className="absolute right-4 top-4 rounded-xl bg-slate-200 p-2 text-slate-700"><ListChecks className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Transacciones</p><p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{loading ? "…" : audit.txSeason.length}</p><p className="mt-2 text-xs text-slate-500">Temporada {audit.season}</p></CardContent></Card>
      <Card className="overflow-hidden rounded-2xl border-blue-100 bg-gradient-to-br from-white to-blue-50/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"><CardContent className="relative p-5"><div className="absolute right-4 top-4 rounded-xl bg-blue-100 p-2 text-blue-700"><Landmark className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wider text-blue-800/70">Movimientos bancarios</p><p className="mt-3 text-3xl font-black tracking-tight text-blue-900">{loading ? "…" : audit.bankSeason.length}</p><p className="mt-2 text-xs text-slate-500">Registros cargados en la aplicación</p></CardContent></Card>
      <Card className="overflow-hidden rounded-2xl border-amber-100 bg-gradient-to-br from-white to-amber-50/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"><CardContent className="relative p-5"><div className="absolute right-4 top-4 rounded-xl bg-amber-100 p-2 text-amber-700"><Activity className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wider text-amber-800/70">Pendientes de conciliar</p><p className="mt-3 text-3xl font-black tracking-tight text-amber-800">{loading ? "…" : audit.pendingBank.length}</p><p className="mt-2 text-xs text-slate-500">Requieren revisión antes del cierre</p></CardContent></Card>
      <Card className="overflow-hidden rounded-2xl border-rose-100 bg-gradient-to-br from-white to-rose-50/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"><CardContent className="relative p-5"><div className="absolute right-4 top-4 rounded-xl bg-rose-100 p-2 text-rose-700"><AlertTriangle className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wider text-rose-800/70">Alertas para revisión</p><p className="mt-3 text-3xl font-black tracking-tight text-rose-800">{loading ? "…" : issueCount}</p><p className="mt-2 text-xs text-slate-500">Pueden solaparse; no son un total contable</p></CardContent></Card>
    </div>
    {audit.latestSession && <Card className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 shadow-sm"><CardContent className="flex gap-4 p-5 sm:p-6"><span className="mt-0.5 rounded-xl bg-emerald-100 p-2 text-emerald-700"><CheckCircle2 className="h-5 w-5"/></span><div className="text-sm"><p className="font-semibold text-emerald-950">Último extracto importado: {audit.latestSession.archivo_nombre || "archivo sin nombre"}</p><p className="mt-1 text-emerald-900">Periodo {dateText(audit.latestSession.fecha_inicio)}–{dateText(audit.latestSession.fecha_fin)} · {audit.latestSession.movimientos_totales ?? "—"} movimientos · {audit.latestSession.movimientos_reconciliados ?? 0} conciliados · {audit.latestSession.movimientos_pendientes ?? 0} pendientes · diferencia de saldo {money(audit.latestSession.diferencia_saldos)}.</p><p className="mt-1 text-xs text-emerald-800">Este resumen procede de la sesión de importación registrada; no sustituye la revisión individual de los movimientos.</p></div></CardContent></Card>}
    <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 px-5 py-5 sm:px-6"><CardTitle className="flex items-center gap-3"><span className="rounded-xl bg-orange-100 p-2 text-orange-700"><ShieldAlert className="h-5 w-5"/></span>Incidencias detectadas</CardTitle><p className="text-sm text-slate-500">Son señales de auditoría, no correcciones automáticas. Cada coincidencia debe verificarse antes de modificar los registros.</p></CardHeader><CardContent className="space-y-3">
      {issues.map((issue,i)=><div key={issue.title} className={"rounded-2xl border p-4 transition-colors " + (issue.level === "review" ? "border-amber-200 bg-gradient-to-r from-amber-50/80 to-white" : "border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2">{issue.level==="review"?<AlertTriangle className="h-4 w-4 text-amber-600"/>:<CheckCircle2 className="h-4 w-4 text-emerald-600"/>}<p className="font-semibold text-slate-900">{issue.title}</p></div><Badge variant="outline" className={issue.level==="review"?"border-amber-300 text-amber-800":"border-emerald-300 text-emerald-800"}>{issue.count} {issue.level==="review"?"por revisar":"detectados"}</Badge></div>
        <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-slate-600">{issue.detail}</pre>
      </div>)}
    </CardContent></Card>
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm"><CardHeader className="border-b border-slate-100"><CardTitle className="flex items-center gap-3"><span className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><ClipboardCheck className="h-5 w-5"/></span>Reglas de cierre</CardTitle></CardHeader><CardContent><ul className="space-y-3 pl-0 text-sm text-slate-700"><li className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200/70"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"/>Las transferencias internas y liquidaciones de pasarela no deben sumarse como un segundo ingreso.</li><li className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200/70"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"/>Los importes no se reclasifican automáticamente por coincidencia de palabras.</li><li className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200/70"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"/>Una diferencia o un movimiento sin enlace queda pendiente hasta revisar evidencia.</li><li className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200/70"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600"/>El cierre presupuestario solo se considera preparado cuando los extractos, transacciones y cobros estén conciliados y las excepciones estén justificadas.</li></ul></CardContent></Card>
  </div>;
}
