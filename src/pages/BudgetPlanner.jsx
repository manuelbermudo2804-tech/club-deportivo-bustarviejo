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
const canonicalName = (value) => {
  const name = clean(value).toLocaleLowerCase("es").replace(/[áàä]/g,"a").replace(/[éèë]/g,"e").replace(/[íìï]/g,"i").replace(/[óòö]/g,"o").replace(/[úùü]/g,"u").replace(/ñ/g,"n");
  if (["inscripciones jugadores", "inscripcion jugadores", "inscripciones"].includes(name)) return "inscripciones";
  if (["loteria navidad", "loteria"].includes(name)) return "loteria";
  if (["subvenciones ayuntamiento", "subvenciones"].includes(name)) return "subvenciones";
  return name;
};
const keyFor = (category, name) => clean(category).toLocaleLowerCase("es") + "||" + canonicalName(name);

export default function BudgetPlanner({ onScenarioChange }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({});
  const [notes, setNotes] = useState("Borrador de planificación. Las cifras se revisarán con los extractos y compromisos confirmados antes del cierre.");
  const [filter, setFilter] = useState("all");
  const [stressIncomePct, setStressIncomePct] = useState(5);
  const [stressExpensePct, setStressExpensePct] = useState(5);

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
      if (income && t.estado !== "Cobrado") return;
      if (!income && t.estado !== "Pagado") return;
      // Las liquidaciones de Stripe son traspasos de tesorería: no se vuelven a sumar como ingreso.
      if (income && /transferencia.*stripe|stripe.*transferencia|transferencia.*club deportivo bustarviejo|traspaso entre cuentas|transferencia interna/i.test(String(t.concepto || ""))) return;
      const amount = Number(t.cantidad || 0);
      const matchingBudgetLine = (baseBudget?.partidas || []).find(p => clean(p.nombre).toLocaleLowerCase("es") === clean(t.partida_nombre).toLocaleLowerCase("es"));
      const budgetCategory = income ? "Ingresos" : (matchingBudgetLine?.categoria || "Gastos Variables");
      // Se conserva la categoría real del movimiento como nombre de partida; no se fuerza "Otros Ingresos/Gastos".
      add(budgetCategory, clean(t.categoria) || clean(t.partida_nombre) || "Categoría sin informar", amount, "Transacciones cobradas/pagadas", t.tipo);
    });
    // If the selected base season has no records, use the latest available prior season only as a clearly-labelled fallback.
    const hasBaseSeasonData = transactions.some(t => sameSeason(t.temporada, BASE_SEASON)) || Boolean(baseBudget);
    if (!hasBaseSeasonData) {
      const seasons = [...new Set(transactions.map(t => t.temporada).filter(Boolean))].sort((a,b) => normalizeSeason(b).localeCompare(normalizeSeason(a)));
      const fallback = seasons.find(s => normalizeSeason(s) < normalizeSeason(TARGET_SEASON));
      if (fallback) transactions.filter(t => sameSeason(t.temporada, fallback) && t.estado !== "Anulado").forEach(t => {
        const income = t.tipo === "Ingreso";
        if (income && t.estado !== "Cobrado") return;
        if (!income && t.estado !== "Pagado") return;
        if (income && /transferencia.*stripe|stripe.*transferencia|transferencia.*club deportivo bustarviejo|traspaso entre cuentas|transferencia interna/i.test(String(t.concepto || ""))) return;
        const matchingBudgetLine = (baseBudget?.partidas || []).find(p => clean(p.nombre).toLocaleLowerCase("es") === clean(t.partida_nombre).toLocaleLowerCase("es"));
        add(income ? "Ingresos" : (matchingBudgetLine?.categoria || "Gastos Variables"), clean(t.categoria) || clean(t.partida_nombre) || "Categoría sin informar", Number(t.cantidad || 0), "Histórico alternativo " + fallback, t.tipo);
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
        const saved = targetBudget?.partidas?.find(p => keyFor(p.categoria, p.nombre) === row.key);
        if (saved) next[row.key] = Number(saved.presupuestado || 0);
        else if (next[row.key] === undefined) next[row.key] = row.historico > 0 ? row.historico : (row.presupuestoBase || 0);
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

  const stressResult = totals.income * (1 - Math.max(0, Number(stressIncomePct) || 0) / 100) - totals.expense * (1 + Math.max(0, Number(stressExpensePct) || 0) / 100);

  const aiScenario = useMemo(() => ({
    temporada: TARGET_SEASON,
    ingresos: Math.round(totals.income * 100) / 100,
    gastos: Math.round(totals.expense * 100) / 100,
    resultado: Math.round(totals.result * 100) / 100,
    baseIngresos: Math.round(totals.baseIncome * 100) / 100,
    baseGastos: Math.round(totals.baseExpense * 100) / 100,
    partidas: targetRows.map(row => ({ categoria: row.categoria, nombre: row.nombre, tipo: row.categoria === "Ingresos" || row.kind === "Ingreso" ? "Ingreso" : "Gasto", base: Number(row.presupuestoBase || row.historico || 0), propuesto: Number(draft[row.key] ?? row.actualTarget ?? 0) })).slice(0, 100),
    notas: notes,
  }), [totals, targetRows, draft, notes]);

  useEffect(() => { if (onScenarioChange) onScenarioChange(aiScenario); }, [aiScenario, onScenarioChange]);

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

  return <div className="space-y-6 rounded-[2rem] bg-gradient-to-b from-orange-50/70 via-white to-slate-50/80 p-2 sm:p-4">
    <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6 text-white shadow-2xl shadow-orange-950/15 ring-1 ring-white/10 sm:p-8">
      <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-1/3 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-200"><Calculator className="h-4 w-4"/> Planificación · Escenarios</div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Presupuesto <span className="text-orange-300">2027/2028</span></h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Plan editable por partidas para preparar la temporada con tiempo. Los cambios de esta pantalla no alteran los movimientos contables ni el presupuesto hasta que pulses Guardar borrador.</p></div>
        <div className="relative z-10 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm"><Button variant="secondary" onClick={exportCSV} className="rounded-xl"><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button><Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || loading} className="rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-950/30 hover:bg-orange-400"><Save className="mr-2 h-4 w-4"/>{saveMutation.isPending ? "Guardando…" : targetBudget ? "Guardar cambios" : "Guardar borrador"}</Button></div>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="group overflow-hidden rounded-2xl border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"><CardContent className="relative p-5"><div className="absolute right-4 top-4 rounded-xl bg-emerald-100 p-2 text-emerald-700"><TrendingUp className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800/70">Ingresos propuestos</p><p className="mt-3 text-2xl font-extrabold tracking-tight text-emerald-800">{money(totals.income)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Importes editables, aún no confirmados.</p></CardContent></Card>
      <Card className="group overflow-hidden rounded-2xl border-rose-100 bg-gradient-to-br from-white to-rose-50/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"><CardContent className="relative p-5"><div className="absolute right-4 top-4 rounded-xl bg-rose-100 p-2 text-rose-700"><TrendingDown className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wider text-rose-800/70">Gastos propuestos</p><p className="mt-3 text-2xl font-extrabold tracking-tight text-rose-800">{money(totals.expense)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Pendientes de contrastar con compromisos.</p></CardContent></Card>
      <Card className={"group overflow-hidden rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg " + (totals.result >= 0 ? "border-teal-100 bg-gradient-to-br from-white to-teal-50/80" : "border-red-200 bg-gradient-to-br from-white to-red-50/90")}><CardContent className="relative p-5"><div className={"absolute right-4 top-4 rounded-xl p-2 " + (totals.result >= 0 ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700")}><Wallet className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Resultado previsto</p><p className={"mt-3 text-2xl font-extrabold tracking-tight " + (totals.result >= 0 ? "text-teal-800" : "text-red-800")}>{money(totals.result)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Ingresos menos gastos presupuestados.</p></CardContent></Card>
      <Card className="group overflow-hidden rounded-2xl border-slate-200 bg-gradient-to-br from-white to-slate-100/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"><CardContent className="relative p-5"><div className="absolute right-4 top-4 rounded-xl bg-slate-200 p-2 text-slate-700"><Calculator className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Resultado de referencia</p><p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-800">{money(totals.baseResult)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Presupuesto base o histórico disponible.</p></CardContent></Card>
    </div>

    {bankMovements.length === 0 && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="h-5 w-5 shrink-0"/><div><b>Falta información bancaria.</b> Aún no hay movimientos bancarios cargados para verificar el histórico. El plan se puede preparar, pero no debe considerarse cerrado.</div></div>}
    {bankMovements.length > 0 && !readyToReview && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="h-5 w-5 shrink-0"/><div><b>Conciliación pendiente.</b> Hay movimientos bancarios sin conciliar. Las cifras históricas y el presupuesto final deben revisarse contra los extractos antes de aprobarse.</div></div>}
    <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-orange-50 px-5 py-5 sm:px-6"><CardTitle className="flex items-center gap-3"><span className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><Calculator className="h-5 w-5"/></span><span>Prueba de resistencia del presupuesto</span></CardTitle><p className="text-sm leading-6 text-slate-500">Simula una temporada menos favorable sin modificar las partidas que has introducido.</p></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3"><div><label className="mb-1 block text-sm font-medium">Caída de ingresos (%)</label><Input type="number" min="0" max="100" value={stressIncomePct} onChange={e=>setStressIncomePct(Math.max(0,Math.min(100,Number(e.target.value)||0)))}/></div><div><label className="mb-1 block text-sm font-medium">Aumento de gastos (%)</label><Input type="number" min="0" max="100" value={stressExpensePct} onChange={e=>setStressExpensePct(Math.max(0,Math.min(100,Number(e.target.value)||0)))}/></div><div className="rounded-xl bg-slate-900 p-4 text-white"><p className="text-sm text-slate-300">Resultado bajo estrés</p><p className={"mt-1 text-2xl font-bold " + (stressResult >= 0 ? "text-emerald-300" : "text-rose-300")}>{money(stressResult)}</p><p className="mt-1 text-xs text-slate-300">Con ingresos −{stressIncomePct}% y gastos +{stressExpensePct}%.</p></div></div><p className="mt-3 text-xs text-slate-500">Es una simulación matemática, no una predicción de probabilidad. Los porcentajes son modificables.</p></CardContent></Card>

    <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 px-5 py-5 sm:px-6"><CardTitle className="flex items-center gap-3"><span className="rounded-xl bg-orange-100 p-2 text-orange-700"><Wallet className="h-5 w-5"/></span><span>Partidas y simulador de cambios</span></CardTitle><p className="text-sm leading-6 text-slate-500">Cambia cualquier importe y mira inmediatamente cómo cambia el resultado. La columna de variación compara con la base disponible; las cifras históricas no son una garantía de ingresos futuros.</p></CardHeader><CardContent>
      <div className="mb-5 flex flex-wrap gap-2 rounded-xl bg-slate-50 p-2"><Button className="rounded-lg" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todas</Button><Button className="rounded-lg" variant={filter === "income" ? "default" : "outline"} onClick={() => setFilter("income")}>Ingresos</Button><Button className="rounded-lg" variant={filter === "expense" ? "default" : "outline"} onClick={() => setFilter("expense")}>Gastos</Button><Button className="ml-auto rounded-lg" variant="outline" onClick={async () => { await Promise.all([refetchTx(),refetchBudgets(),refetchBank()]); toast.success("Datos actualizados"); }}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button></div>
      {loading ? <p className="py-8 text-center text-slate-500">Cargando histórico…</p> : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50"><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-3 pr-3">Tipo / partida</th><th className="py-3 pr-3 text-right">Base (€)</th><th className="py-3 pr-3 text-right">Propuesta 27/28 (€)</th><th className="py-3 pr-3 text-right">Variación (€)</th><th className="py-3 pr-3 text-right">Variación (%)</th></tr></thead><tbody>{visibleRows.map(row => { const value = Number(draft[row.key] ?? row.actualTarget ?? 0); const base = Number(row.presupuestoBase || row.historico || 0); const delta = value-base; const income = row.categoria === "Ingresos" || row.kind === "Ingreso"; return <tr key={row.key} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-orange-50/50"><td className="py-3 pr-3"><div className="font-medium">{row.nombre}</div><div className="text-xs text-slate-500">{row.categoria} · {row.source.join(" / ")}</div></td><td className="py-3 pr-3 text-right">{money(base)}</td><td className="py-3 pr-3 text-right"><Input aria-label={"Propuesta para " + row.nombre} type="number" min="0" step="0.01" value={draft[row.key] ?? row.actualTarget ?? 0} onChange={e => updateValue(row.key,e.target.value)} className="ml-auto w-36 rounded-lg border-slate-200 bg-white text-right font-semibold shadow-sm focus-visible:ring-orange-500"/></td><td className={"py-3 pr-3 text-right font-medium " + (delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-500")}>{formatDelta(delta)}</td><td className="py-3 pr-3 text-right">{base ? ((delta/base)*100).toLocaleString("es-ES",{maximumFractionDigits:1})+"%" : "—"}</td></tr>; })}</tbody></table></div>}
      {!loading && !targetRows.length && <p className="py-8 text-center text-slate-500">Todavía no hay partidas históricas. Añade registros financieros o crea un presupuesto base para que el simulador use categorías reales, sin inventarlas.</p>}
      <div className="mt-4"><label className="mb-2 block text-sm font-medium">Notas y supuestos del borrador</label><textarea className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anota supuestos, compromisos, subvenciones pendientes, escenarios de cuotas…" /></div>
    </CardContent></Card>

    <Card className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm"><CardContent className="flex items-start gap-4 p-5 sm:p-6"><span className="mt-0.5 rounded-xl bg-blue-100 p-2 text-blue-700"><Info className="h-5 w-5"/></span><div className="text-sm text-blue-950"><p className="font-semibold">Cómo se utilizará para el cierre del 30 de junio de 2028</p><p className="mt-1">Este es un borrador vivo, no una certificación contable. Cada nuevo extracto debe importarse y conciliarse en el panel bancario. Antes de aprobar el presupuesto final, habrá que resolver diferencias de saldo, pagos duplicados, transferencias de liquidación Stripe, partidas sin clasificar y compromisos aún no confirmados. El histórico de cuotas/pagos se usa como referencia, pero no se suma a las transacciones contables para evitar duplicidades.</p></div></CardContent></Card>
  </div>;
}
