import React, { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Download, Save, RefreshCw, Calculator, Wallet, TrendingUp, TrendingDown, Info } from "lucide-react";
import { toast } from "sonner";

const TARGET_SEASON = "2027/2028";
const BASE_SEASON = "2026/2027";
const money = (value) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(value) || 0);
const normalizeSeason = (value) => String(value || "").replace(/[^\d]/g, "");
const sameSeason = (a,b) => normalizeSeason(a) === normalizeSeason(b);
const clean = (value) => String(value || "").trim();
const keyFor = (category, name) => clean(category).toLocaleLowerCase("es") + "||" + clean(name).toLocaleLowerCase("es");

export default function BudgetPlanner() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({});
  const [notes, setNotes] = useState("Borrador de planificación. Las cifras se revisarán con los extractos y compromisos confirmados antes del cierre.");
  const [filter, setFilter] = useState("all");

  const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ["budget2728Transactions"],
    queryFn: () => base44.entities.FinancialTransaction.list("-fecha", 500),
    staleTime: 60000,
  });
  const { data: budgets = [], isLoading: budgetsLoading, refetch: refetchBudgets } = useQuery({
    queryKey: ["budget2728Budgets"],
    queryFn: () => base44.entities.Budget.list("-created_date", 500),
    staleTime: 60000,
  });
  const { data: bankMovements = [], refetch: refetchBank } = useQuery({
    queryKey: ["budget2728BankMovements"],
    queryFn: () => base44.entities.BankMovement.list("-fecha", 500),
    staleTime: 60000,
  });

  const targetBudget = useMemo(() => budgets.find(b => sameSeason(b.temporada, TARGET_SEASON)) || null, [budgets]);
  const baseBudget = useMemo(() => budgets.find(b => sameSeason(b.temporada, BASE_SEASON)) || null, [budgets]);

  const baseRows = useMemo(() => {
    const map = new Map();
    const add = (category, name, amount, source, kind) => {
      const safeCategory = clean(category) || (kind === "Ingreso" ? "Ingresos" : "Gastos sin clasificar");
      const safeName = clean(name) || "Partida sin informar";
      const key = keyFor(safeCategory, safeName);
      if (!map.has(key)) map.set(key, { key, categoria: safeCategory, nombre: safeName, historico: 0, presupuestoBase: 0, source: new Set(), kind: kind || (safeCategory.toLocaleLowerCase("es").includes("ingres") ? "Ingreso" : "Gasto") });
      const row = map.get(key);
      row.source.add(source);
      if (Number.isFinite(Number(amount))) {
        if (source === "Presupuesto base") row.presupuestoBase += Number(amount || 0);
        else row.historico += Number(amount || 0);
      }
    };
    (baseBudget?.partidas || []).forEach(p => add(p.categoria, p.nombre, p.presupuestado, "Presupuesto base", p.categoria === "Ingresos" ? "Ingreso" : "Gasto"));
    transactions.filter(t => sameSeason(t.temporada, BASE_SEASON) && t.estado !== "Anulado").forEach(t => {
      const income = t.tipo === "Ingreso";
      const amount = income ? Number(t.cantidad || 0) : -Number(t.cantidad || 0);
      add(income ? "Ingresos" : (clean(t.categoria) || "Gastos sin clasificar"), t.partida_nombre || t.categoria, amount, "Transacciones registradas", t.tipo);
    });
    // If the selected base season has no records, use the latest available prior season only as a clearly-labelled fallback.
    const hasBaseSeasonData = transactions.some(t => sameSeason(t.temporada, BASE_SEASON)) || Boolean(baseBudget);
    if (!hasBaseSeasonData) {
      const seasons = [...new Set(transactions.map(t => t.temporada).filter(Boolean))].sort((a,b) => normalizeSeason(b).localeCompare(normalizeSeason(a)));
      const fallback = seasons.find(s => normalizeSeason(s) < normalizeSeason(TARGET_SEASON));
      if (fallback) transactions.filter(t => sameSeason(t.temporada, fallback) && t.estado !== "Anulado").forEach(t => {
        const income = t.tipo === "Ingreso";
        add(income ? "Ingresos" : (clean(t.categoria) || "Gastos sin clasificar"), t.partida_nombre || t.categoria, income ? Number(t.cantidad || 0) : -Number(t.cantidad || 0), "Histórico alternativo " + fallback, t.tipo);
      });
    }
    return [...map.values()].map(r => ({
      ...r,
      // Do not mix actual income and expenses; retain historical magnitude for each budget line.
      historico: Math.abs(r.historico),
      source: [...r.source],
    })).sort((a,b) => {
      const aIncome = a.kind === "Ingreso" || a.categoria === "Ingresos";
      const bIncome = b.kind === "Ingreso" || b.categoria === "Ingresos";
      return Number(bIncome) - Number(aIncome) || a.categoria.localeCompare(b.categoria, "es") || a.nombre.localeCompare(b.nombre, "es");
    });
  }, [baseBudget, transactions]);

  useEffect(() => {
    if (!baseRows.length) return;
    setDraft(current => {
      const next = { ...current };
      baseRows.forEach(row => {
        if (next[row.key] === undefined) {
          const saved = targetBudget?.partidas?.find(p => keyFor(p.categoria, p.nombre) === row.key);
          next[row.key] = saved ? Number(saved.presupuestado || 0) : (row.presupuestoBase || row.historico || 0);
        }
      });
      if (targetBudget?.notas && notes.startsWith("Borrador de planificación")) setNotes(targetBudget.notas);
      return next;
    });
  }, [baseRows, targetBudget]);

  const targetRows = useMemo(() => {
    const existing = new Map((targetBudget?.partidas || []).map(p => [keyFor(p.categoria,p.nombre), p]));
    const keys = new Set(baseRows.map(r => r.key));
    const extras = (targetBudget?.partidas || []).filter(p => !keys.has(keyFor(p.categoria,p.nombre))).map(p => ({
      key: keyFor(p.categoria,p.nombre), categoria: p.categoria || "Sin clasificar", nombre: p.nombre || "Partida sin nombre",
      historico: 0, presupuestoBase: 0, source: ["Presupuesto 2027/2028"], kind: p.categoria === "Ingresos" ? "Ingreso" : "Gasto"
    }));
    return [...baseRows, ...extras].map(row => {
      const saved = existing.get(row.key);
      return { ...row, actualTarget: saved ? Number(saved.presupuestado || 0) : Number(draft[row.key] ?? row.presupuestoBase ?? row.historico ?? 0) };
    });
  }, [baseRows, targetBudget, draft]);

  const totals = useMemo(() => {
    let income = 0, expense = 0, baseIncome = 0, baseExpense = 0;
    targetRows.forEach(row => {
      const amount = Number(draft[row.key] ?? row.actualTarget ?? 0);
      const isIncome = row.categoria === "Ingresos" || row.kind === "Ingreso";
      if (isIncome) income += amount; else expense += amount;
      const baseAmount = Number(row.presupuestoBase || row.historico || 0);
      if (isIncome) baseIncome += baseAmount; else baseExpense += baseAmount;
    });
    return { income, expense, result: income - expense, baseIncome, baseExpense, baseResult: baseIncome - baseExpense };
  }, [targetRows, draft]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const partidas = targetRows.map((row, index) => ({
        id: targetBudget?.partidas?.find(p => keyFor(p.categoria,p.nombre) === row.key)?.id || "p2728_" + index + "_" + row.key.replace(/[^a-z0-9]/gi,"_").slice(0,36),
        nombre: row.nombre,
        categoria: row.categoria === "Ingresos" ? "Ingresos" : (["Gastos Fijos","Gastos Variables","Inversiones"].includes(row.categoria) ? row.categoria : "Gastos Variables"),
        presupuestado: Math.round(Number(draft[row.key] ?? row.actualTarget ?? 0) * 100) / 100,
        ejecutado: 0,
      }));
      const payload = {
        temporada: TARGET_SEASON,
        nombre: "Presupuesto " + TARGET_SEASON,
        partidas,
        total_presupuestado_ingresos: Math.round(totals.income * 100) / 100,
        total_presupuestado_gastos: Math.round(totals.expense * 100) / 100,
        notas: notes,
        activo: true,
      };
      if (targetBudget?.id) return base44.entities.Budget.update(targetBudget.id, payload);
      return base44.entities.Budget.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budget2728Budgets"] });
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Borrador del presupuesto 2027/2028 guardado");
    },
    onError: (error) => toast.error("No se pudo guardar el presupuesto: " + (error?.message || "error desconocido")),
  });

  const updateValue = (key, value) => setDraft(current => ({ ...current, [key]: value === "" ? "" : Math.max(0, Number(value) || 0) }));
  const visibleRows = targetRows.filter(r => filter === "all" || (filter === "income" ? r.categoria === "Ingresos" || r.kind === "Ingreso" : !(r.categoria === "Ingresos" || r.kind === "Ingreso")));
  const exportCSV = () => {
    const rows = [["Temporada","Tipo","Categoría","Partida","Base histórica/presupuesto","Propuesta 2027/2028","Variación"], ...targetRows.map(r => {
      const value = Number(draft[r.key] ?? r.actualTarget ?? 0);
      const base = Number(r.presupuestoBase || r.historico || 0);
      return [TARGET_SEASON, r.categoria === "Ingresos" || r.kind === "Ingreso" ? "Ingreso" : "Gasto", r.categoria, r.nombre, base.toFixed(2), value.toFixed(2), (value-base).toFixed(2)];
    })];
    const csv = rows.map(row => row.map(cell => '"' + String(cell ?? "").replace(/"/g,'""') + '"').join(";")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "presupuesto_CDBustarviejo_2027-2028.csv"; link.click(); URL.revokeObjectURL(url);
  };
  const loading = txLoading || budgetsLoading;
  const readyToReview = bankMovements.length > 0 && bankMovements.every(m => m.reconciliado === true);
  const formatDelta = (v) => (v > 0 ? "+" : "") + money(v);

  return <div className="space-y-6">
    <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300"><Calculator className="h-4 w-4"/> Planificación y escenarios</div><h2 className="text-2xl font-bold sm:text-3xl">Presupuesto 2027/2028</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">Plan editable por partidas para preparar la temporada con tiempo. Los cambios de esta pantalla no alteran los movimientos contables ni el presupuesto hasta que pulses Guardar borrador.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={exportCSV}><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button><Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || loading} className="bg-orange-600 text-white hover:bg-orange-500"><Save className="mr-2 h-4 w-4"/>{saveMutation.isPending ? "Guardando…" : targetBudget ? "Guardar cambios" : "Guardar borrador"}</Button></div>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Ingresos propuestos</p><p className="mt-1 text-2xl font-bold text-emerald-700">{money(totals.income)}</p><p className="text-xs text-slate-500">Importes editables, no ingresos confirmados.</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Gastos propuestos</p><p className="mt-1 text-2xl font-bold text-rose-700">{money(totals.expense)}</p><p className="text-xs text-slate-500">Pendientes de contrastar con compromisos.</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Resultado previsto</p><p className={"mt-1 text-2xl font-bold " + (totals.result >= 0 ? "text-emerald-700" : "text-rose-700")}>{money(totals.result)}</p><p className="text-xs text-slate-500">Ingresos menos gastos presupuestados.</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Resultado de referencia</p><p className="mt-1 text-2xl font-bold">{money(totals.baseResult)}</p><p className="text-xs text-slate-500">Presupuesto base o histórico disponible.</p></CardContent></Card>
    </div>

    {bankMovements.length === 0 && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="h-5 w-5 shrink-0"/><div><b>Falta información bancaria.</b> Aún no hay movimientos bancarios cargados para verificar el histórico. El plan se puede preparar, pero no debe considerarse cerrado.</div></div>}
    {bankMovements.length > 0 && !readyToReview && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="h-5 w-5 shrink-0"/><div><b>Conciliación pendiente.</b> Hay movimientos bancarios sin conciliar. Las cifras históricas y el presupuesto final deben revisarse contra los extractos antes de aprobarse.</div></div>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-orange-600"/>Partidas y simulador de cambios</CardTitle><p className="text-sm text-slate-500">Cambia cualquier importe y mira inmediatamente cómo cambia el resultado. La columna de variación compara con la base disponible; las cifras históricas no son una garantía de ingresos futuros.</p></CardHeader><CardContent>
      <div className="mb-4 flex flex-wrap gap-2"><Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todas</Button><Button variant={filter === "income" ? "default" : "outline"} onClick={() => setFilter("income")}>Ingresos</Button><Button variant={filter === "expense" ? "default" : "outline"} onClick={() => setFilter("expense")}>Gastos</Button><Button variant="outline" onClick={async () => { await Promise.all([refetchTx(),refetchBudgets(),refetchBank()]); toast.success("Datos actualizados"); }}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button></div>
      {loading ? <p className="py-8 text-center text-slate-500">Cargando histórico…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3 pr-3">Tipo / partida</th><th className="py-3 pr-3 text-right">Base (€)</th><th className="py-3 pr-3 text-right">Propuesta 27/28 (€)</th><th className="py-3 pr-3 text-right">Variación (€)</th><th className="py-3 pr-3 text-right">Variación (%)</th></tr></thead><tbody>{visibleRows.map(row => { const value = Number(draft[row.key] ?? row.actualTarget ?? 0); const base = Number(row.presupuestoBase || row.historico || 0); const delta = value-base; const income = row.categoria === "Ingresos" || row.kind === "Ingreso"; return <tr key={row.key} className="border-b last:border-0 hover:bg-slate-50"><td className="py-3 pr-3"><div className="font-medium">{row.nombre}</div><div className="text-xs text-slate-500">{row.categoria} · {row.source.join(" / ")}</div></td><td className="py-3 pr-3 text-right">{money(base)}</td><td className="py-3 pr-3 text-right"><Input aria-label={"Propuesta para " + row.nombre} type="number" min="0" step="0.01" value={draft[row.key] ?? row.actualTarget ?? 0} onChange={e => updateValue(row.key,e.target.value)} className="ml-auto w-36 text-right"/></td><td className={"py-3 pr-3 text-right font-medium " + (delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-500")}>{formatDelta(delta)}</td><td className="py-3 pr-3 text-right">{base ? ((delta/base)*100).toLocaleString("es-ES",{maximumFractionDigits:1})+"%" : "—"}</td></tr>; })}</tbody></table></div>}
      {!loading && !targetRows.length && <p className="py-8 text-center text-slate-500">Todavía no hay partidas históricas. Añade registros financieros o crea un presupuesto base para que el simulador use categorías reales, sin inventarlas.</p>}
      <div className="mt-4"><label className="mb-2 block text-sm font-medium">Notas y supuestos del borrador</label><textarea className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anota supuestos, compromisos, subvenciones pendientes, escenarios de cuotas…" /></div>
    </CardContent></Card>

    <Card className="border-blue-200 bg-blue-50/60"><CardContent className="flex items-start gap-3 p-4"><Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"/><div className="text-sm text-blue-950"><p className="font-semibold">Cómo se utilizará para el cierre del 30 de junio de 2028</p><p className="mt-1">Este es un borrador vivo, no una certificación contable. Cada nuevo extracto debe importarse y conciliarse en el panel bancario. Antes de aprobar el presupuesto final, habrá que resolver diferencias de saldo, pagos duplicados, transferencias de liquidación Stripe, partidas sin clasificar y compromisos aún no confirmados. El histórico de cuotas/pagos se usa como referencia, pero no se suma a las transacciones contables para evitar duplicidades.</p></div></CardContent></Card>
  </div>;
}
