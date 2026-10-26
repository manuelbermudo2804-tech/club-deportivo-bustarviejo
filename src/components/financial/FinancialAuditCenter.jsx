import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCw, ShieldAlert } from "lucide-react";
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
    const txSeason = transactions.filter(t => !t.temporada || norm(t.temporada) === norm(season)).filter(t => t.estado !== "Anulado");
    const bankSeason = movements.filter(m => {
      const session = sessions.find(s => s.id === m.reconciliation_session_id);
      return !session || !session.fecha_inicio || !session.fecha_fin || (String(m.fecha || "") >= session.fecha_inicio && String(m.fecha || "") <= session.fecha_fin);
    });
    const stripePayouts = txSeason.filter(t => /stripe/i.test(String(t.concepto || "")) && t.tipo === "Ingreso" && t.estado === "Cobrado");
    const unlinkedBank = bankSeason.filter(m => m.reconciliado === true && !m.financial_transaction_id && !m.payment_id);
    const pendingBank = bankSeason.filter(m => m.reconciliado !== true);
    const missingTxLinks = txSeason.filter(t => t.bank_movement_id && !bankSeason.some(m => m.id === t.bank_movement_id));
    const dupTxByBank = new Map();
    txSeason.filter(t => t.bank_movement_id).forEach(t => {
      const key = t.bank_movement_id;
      dupTxByBank.set(key, (dupTxByBank.get(key) || 0) + 1);
    });
    const duplicateBankLinks = [...dupTxByBank.entries()].filter(([,n]) => n > 1);
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
    return { season, txSeason, bankSeason, stripePayouts, unlinkedBank, pendingBank, missingTxLinks, duplicateBankLinks, duplicateBudgets, balanceIssues, latestSession, categoryPartidaMismatch };
  }, [activeSeason, transactions, movements, sessions, budgets]);

  const refreshAll = async () => { await Promise.all([refreshTx(), refreshMovements(), refreshSessions(), refreshBudgets()]); };
  const loading = txLoading || bankLoading;
  const issues = [
    { title: "Posibles liquidaciones Stripe contabilizadas como ingreso", count: audit.stripePayouts.length, detail: audit.stripePayouts.length ? audit.stripePayouts.map(t => `${dateText(t.fecha)} · ${money(t.cantidad)} · ${t.concepto}`).slice(0,5).join("\n") : "No se han detectado por el texto del concepto.", level: audit.stripePayouts.length ? "review" : "ok" },
    { title: "Movimientos bancarios conciliados sin enlace a pago o transacción", count: audit.unlinkedBank.length, detail: audit.unlinkedBank.length ? audit.unlinkedBank.slice(0,6).map(m => `${dateText(m.fecha)} · ${money(m.importe)} · ${m.concepto}`).join("\n") : "No se han detectado.", level: audit.unlinkedBank.length ? "review" : "ok" },
    { title: "Movimientos bancarios pendientes de conciliación", count: audit.pendingBank.length, detail: audit.pendingBank.length ? audit.pendingBank.slice(0,6).map(m => `${dateText(m.fecha)} · ${money(m.importe)} · ${m.concepto}`).join("\n") : "No se han detectado.", level: audit.pendingBank.length ? "review" : "ok" },
    { title: "Presupuestos duplicados por temporada", count: audit.duplicateBudgets.reduce((n,x)=>n+x.items.length,0), detail: audit.duplicateBudgets.length ? audit.duplicateBudgets.map(x => `${x.season}: ${x.items.map(b=>b.nombre || b.id).join(" / ")} (${x.items.length} registros)`).join("\n") : "No se han detectado temporadas con más de un presupuesto.", level: audit.duplicateBudgets.length ? "review" : "ok" },
    { title: "Sesiones de extracto con diferencia de saldo", count: audit.balanceIssues.length, detail: audit.balanceIssues.length ? audit.balanceIssues.map(s => `${s.archivo_nombre || s.id}: diferencia ${money(s.diferencia_saldos)}`).join("\n") : "Todas las sesiones con diferencia informada cuadran dentro de 0,01 €.", level: audit.balanceIssues.length ? "review" : "ok" },
    { title: "Transacciones con enlace bancario repetido", count: audit.duplicateBankLinks.length, detail: audit.duplicateBankLinks.length ? audit.duplicateBankLinks.map(([id,n])=>`${id}: ${n} transacciones`).join("\n") : "No se han detectado.", level: audit.duplicateBankLinks.length ? "review" : "ok" },
    { title: "Transacciones cuyo movimiento bancario enlazado no aparece", count: audit.missingTxLinks.length, detail: audit.missingTxLinks.length ? audit.missingTxLinks.slice(0,6).map(t => `${dateText(t.fecha)} · ${money(t.cantidad)} · ${t.concepto}`).join("\n") : "No se han detectado.", level: audit.missingTxLinks.length ? "review" : "ok" },
  ];
  const issueCount = issues.filter(i=>i.level==="review").reduce((n,i)=>n+i.count,0);

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-2xl font-bold text-slate-900">Centro de Control y Auditoría Financiera</h2><p className="text-sm text-slate-500">Revisión de trazabilidad, conciliación y posibles duplicidades. No modifica ni reclasifica movimientos.</p></div>
      <Button variant="outline" onClick={refreshAll}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar auditoría</Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Transacciones de la temporada</p><p className="mt-2 text-2xl font-bold">{loading ? "…" : audit.txSeason.length}</p><p className="text-xs text-slate-500">{audit.season}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Movimientos bancarios</p><p className="mt-2 text-2xl font-bold">{loading ? "…" : audit.bankSeason.length}</p><p className="text-xs text-slate-500">Registros cargados en la aplicación</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Pendientes de conciliar</p><p className="mt-2 text-2xl font-bold text-amber-700">{loading ? "…" : audit.pendingBank.length}</p><p className="text-xs text-slate-500">No se consideran resueltos automáticamente</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Alertas para revisión</p><p className="mt-2 text-2xl font-bold text-rose-700">{loading ? "…" : issueCount}</p><p className="text-xs text-slate-500">Pueden solaparse; no son un total contable</p></CardContent></Card>
    </div>
    {audit.latestSession && <Card className="border-emerald-200 bg-emerald-50/60"><CardContent className="flex gap-3 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/><div className="text-sm"><p className="font-semibold text-emerald-950">Último extracto importado: {audit.latestSession.archivo_nombre || "archivo sin nombre"}</p><p className="mt-1 text-emerald-900">Periodo {dateText(audit.latestSession.fecha_inicio)}–{dateText(audit.latestSession.fecha_fin)} · {audit.latestSession.movimientos_totales ?? "—"} movimientos · {audit.latestSession.movimientos_reconciliados ?? 0} conciliados · {audit.latestSession.movimientos_pendientes ?? 0} pendientes · diferencia de saldo {money(audit.latestSession.diferencia_saldos)}.</p><p className="mt-1 text-xs text-emerald-800">Este resumen procede de la sesión de importación registrada; no sustituye la revisión individual de los movimientos.</p></div></CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-orange-600"/>Incidencias detectadas</CardTitle><p className="text-sm text-slate-500">Son señales de auditoría, no correcciones automáticas. Cada coincidencia debe verificarse antes de modificar los registros.</p></CardHeader><CardContent className="space-y-3">
      {issues.map((issue,i)=><div key={issue.title} className="rounded-xl border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2">{issue.level==="review"?<AlertTriangle className="h-4 w-4 text-amber-600"/>:<CheckCircle2 className="h-4 w-4 text-emerald-600"/>}<p className="font-semibold text-slate-900">{issue.title}</p></div><Badge variant="outline" className={issue.level==="review"?"border-amber-300 text-amber-800":"border-emerald-300 text-emerald-800"}>{issue.count} {issue.level==="review"?"por revisar":"detectados"}</Badge></div>
        <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-slate-600">{issue.detail}</pre>
      </div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-orange-600"/>Reglas de cierre</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-slate-700"><li>Las transferencias internas y liquidaciones de pasarela no deben sumarse como un segundo ingreso.</li><li>Los importes no se reclasifican automáticamente por coincidencia de palabras.</li><li>Una diferencia o un movimiento sin enlace queda pendiente hasta revisar evidencia.</li><li>El cierre presupuestario solo se considera preparado cuando los extractos, transacciones y cobros estén conciliados y las excepciones estén justificadas.</li></ul></CardContent></Card>
  </div>;
}
