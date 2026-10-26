import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, RefreshCw, Save, TrendingUp, TrendingDown, Wallet, CalendarDays, AlertTriangle, CheckCircle2, FileSpreadsheet, Search, Loader2, CircleHelp } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const CURRENT_START = "2026-07-01";
const CURRENT_END = "2027-06-30";
const TARGET_SEASON = "2027-2028";
const TARGET_LABEL = "2027/2028";
const money = (value) => (Number(value) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const number = (value) => Number(value) || 0;
const clean = (value) => String(value || "").trim();
const keyOf = (tx) => clean(tx.partida_nombre) || clean(tx.categoria) || "Sin partida";
const groupKey = (type, name) => type + "::" + name.toLocaleLowerCase("es-ES");
const isCurrentSeasonDate = (date) => !!date && date >= CURRENT_START && date <= CURRENT_END;
const budgetCategory = (type, name) => {
  if (type === "Ingreso") return "Ingresos";
  const text = name.toLocaleLowerCase("es-ES");
  if (/provisi[oó]n|inversi[oó]n|equipamiento|obra|mejora/.test(text)) return "Inversiones";
  if (/n[oó]mina|salario|entrenador|federaci[oó]n|seguro|gestor[ií]a|banco|comisi[oó]n|web|dominio|redes|retenci[oó]n|laboral/.test(text)) return "Gastos Fijos";
  return "Gastos Variables";
};

export default function BudgetPlanner() {
  const [transactions, setTransactions] = useState([]);
  const [bankMovements, setBankMovements] = useState([]);
  const [savedBudget, setSavedBudget] = useState(null);
  const [draftLines, setDraftLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showOnlyReview, setShowOnlyReview] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, movements, budgets] = await Promise.all([
        base44.entities.FinancialTransaction.filter({}, "fecha", 500, 0),
        base44.entities.BankMovement.filter({}, "fecha", 500, 0),
        base44.entities.Budget.filter({ temporada: TARGET_SEASON }, "-updated_date", 20, 0)
      ]);
      const validTxs = (txs || []).filter(t => !t.is_sample && t.estado !== "Anulado");
      const validMovements = (movements || []).filter(m => !m.is_sample);
      setTransactions(validTxs);
      setBankMovements(validMovements);
      const currentBudget = (budgets || []).find(b => b.nombre === "Presupuesto construido desde movimientos") || (budgets || [])[0] || null;
      setSavedBudget(currentBudget);
      const currentActuals = buildActualGroups(validTxs);
      if (currentBudget?.partidas?.length) {
        const existing = currentBudget.partidas;
        const seen = new Set();
        const merged = existing.map(line => {
          const match = currentActuals.find(a => groupKey(a.tipo, a.nombre) === groupKey(a.tipo, line.nombre));
          if (match) seen.add(groupKey(match.tipo, match.nombre));
          return { ...line, ejecutado: match?.ejecutado ?? number(line.ejecutado), tipoMovimiento: match?.tipo || (line.categoria === "Ingresos" ? "Ingreso" : "Gasto") };
        });
        currentActuals.forEach(actual => {
          if (!seen.has(groupKey(actual.tipo, actual.nombre))) merged.push({ id: makeId(), nombre: actual.nombre, categoria: budgetCategory(actual.tipo, actual.nombre), presupuestado: actual.ejecutado, ejecutado: actual.ejecutado, tipoMovimiento: actual.tipo });
        });
        setDraftLines(merged);
      } else {
        setDraftLines(currentActuals.map(a => ({ id: makeId(), nombre: a.nombre, categoria: budgetCategory(a.tipo, a.nombre), presupuestado: a.ejecutado, ejecutado: a.ejecutado, tipoMovimiento: a.tipo })));
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error cargando presupuesto desde movimientos", error);
      toast.error("No se han podido cargar las transacciones y los movimientos bancarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const currentTransactions = useMemo(() => transactions.filter(t => isCurrentSeasonDate(t.fecha)), [transactions]);
  const currentBankMovements = useMemo(() => bankMovements.filter(m => isCurrentSeasonDate(m.fecha)), [bankMovements]);
  const currentBankLinkedIds = useMemo(() => new Set(currentBankMovements.map(m => m.id)), [currentBankMovements]);
  const categorizedCurrent = useMemo(() => currentTransactions.filter(t => clean(t.partida_nombre) || clean(t.categoria)), [currentTransactions]);
  const needsReview = useMemo(() => currentTransactions.filter(t => t.revisar_clasificacion || !clean(t.partida_nombre)), [currentTransactions]);
  const unmatchedBankMovements = useMemo(() => currentBankMovements.filter(m => !m.financial_transaction_id), [currentBankMovements]);

  const actualGroups = useMemo(() => buildActualGroups(transactions), [transactions]);
  const totals = useMemo(() => {
    const incomes = currentTransactions.filter(t => t.tipo === "Ingreso").reduce((sum, t) => sum + number(t.cantidad), 0);
    const expenses = currentTransactions.filter(t => t.tipo === "Gasto").reduce((sum, t) => sum + number(t.cantidad), 0);
    const incomesForecast = draftLines.filter(l => (l.tipoMovimiento || (l.categoria === "Ingresos" ? "Ingreso" : "Gasto")) === "Ingreso").reduce((sum, l) => sum + number(l.presupuestado), 0);
    const expensesForecast = draftLines.filter(l => (l.tipoMovimiento || (l.categoria === "Ingresos" ? "Ingreso" : "Gasto")) === "Gasto").reduce((sum, l) => sum + number(l.presupuestado), 0);
    return { incomes, expenses, net: incomes - expenses, incomesForecast, expensesForecast, forecastNet: incomesForecast - expensesForecast };
  }, [currentTransactions, draftLines]);

  const updateLine = (id, field, value) => setDraftLines(prev => prev.map(line => line.id === id ? { ...line, [field]: field === "presupuestado" ? value : value } : line));
  const saveBudget = async () => {
    setSaving(true);
    try {
      const partidas = draftLines.map(line => ({
        id: line.id || makeId(),
        nombre: clean(line.nombre),
        categoria: ["Ingresos", "Gastos Fijos", "Gastos Variables", "Inversiones"].includes(line.categoria) ? line.categoria : budgetCategory(line.tipoMovimiento || (line.categoria === "Ingresos" ? "Ingreso" : "Gasto"), line.nombre),
        presupuestado: Math.max(0, number(line.presupuestado)),
        ejecutado: number(actualGroups.find(a => groupKey(a.tipo, a.nombre) === groupKey(line.tipoMovimiento || (line.categoria === "Ingresos" ? "Ingreso" : "Gasto"), line.nombre))?.ejecutado ?? line.ejecutado)
      }));
      const incomes = partidas.filter(p => p.categoria === "Ingresos").reduce((s, p) => s + p.presupuestado, 0);
      const expenses = partidas.filter(p => p.categoria !== "Ingresos").reduce((s, p) => s + p.presupuestado, 0);
      const executedIncome = currentTransactions.filter(t => t.tipo === "Ingreso").reduce((s, t) => s + number(t.cantidad), 0);
      const executedExpenses = currentTransactions.filter(t => t.tipo === "Gasto").reduce((s, t) => s + number(t.cantidad), 0);
      const payload = {
        temporada: TARGET_SEASON,
        nombre: "Presupuesto construido desde movimientos",
        partidas,
        total_presupuestado_ingresos: incomes,
        total_presupuestado_gastos: expenses,
        total_ejecutado_ingresos: executedIncome,
        total_ejecutado_gastos: executedExpenses,
        activo: true,
        notas: "Presupuesto generado y actualizado a partir de transacciones reales de la temporada 2026/2027. No procede de plantilla.",
        fecha_ultima_actualizacion_ejecutado: new Date().toISOString()
      };
      let result;
      if (savedBudget?.id) result = await base44.entities.Budget.update(savedBudget.id, payload);
      else result = await base44.entities.Budget.create(payload);
      setSavedBudget(result || { ...payload, id: savedBudget?.id });
      toast.success("Presupuesto 2027/2028 guardado con las partidas y cifras actuales.");
      await loadData();
    } catch (error) {
      console.error("Error guardando presupuesto", error);
      toast.error("No se pudo guardar el presupuesto. No se ha borrado ningún dato.");
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const needle = query.toLocaleLowerCase("es-ES");
    return currentTransactions.filter(t => {
      const text = [t.fecha, t.concepto, t.categoria, t.partida_nombre, t.proveedor_cliente, t.cantidad].join(" ").toLocaleLowerCase("es-ES");
      return (!needle || text.includes(needle)) && (!showOnlyReview || t.revisar_clasificacion || !clean(t.partida_nombre));
    }).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [currentTransactions, query, showOnlyReview]);

  const byPartida = useMemo(() => {
    const map = new Map();
    currentTransactions.forEach(t => {
      const name = keyOf(t);
      const key = groupKey(t.tipo, name);
      const row = map.get(key) || { nombre: name, tipo: t.tipo, total: 0, count: 0, review: 0, months: new Set() };
      row.total += number(t.cantidad);
      row.count += 1;
      row.review += t.revisar_clasificacion ? 1 : 0;
      if (t.fecha) row.months.add(t.fecha.slice(0, 7));
      map.set(key, row);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [currentTransactions]);

  if (loading) return <div className="mx-auto max-w-7xl p-6"><div className="flex items-center gap-3 rounded-2xl border bg-white p-8 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Construyendo el presupuesto desde las transacciones reales…</div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link to="/TreasurerFinancialPanel" className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white"><ArrowLeft className="h-4 w-4" />Volver a Tesorería</Link>
            <Button variant="outline" onClick={loadData} className="border-white/25 bg-white/10 text-white hover:bg-white/20"><RefreshCw className="mr-2 h-4 w-4" />Actualizar datos</Button>
          </div>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2"><Badge className="border border-orange-300/30 bg-orange-400/15 text-orange-100">TESORERÍA · MOTOR REAL</Badge><Badge className="bg-white/10 text-white">Sin plantillas</Badge></div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Presupuesto vivo {TARGET_LABEL}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">Se construye con los movimientos clasificados de toda la temporada 2026/2027. Cada nuevo extracto y cada corrección alimentan las partidas; las previsiones de 2027/2028 se ajustan aquí y se guardan sin borrar el histórico.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:min-w-64">
              <p className="text-xs uppercase tracking-wider text-slate-400">Fecha objetivo de cierre</p>
              <p className="mt-1 text-2xl font-bold">30 junio 2027</p>
              <p className="mt-1 text-xs text-slate-300">Cierre de 2026/2027 y consolidación del presupuesto siguiente</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <HeroMetric label="Ingresos registrados" value={money(totals.incomes)} icon={<TrendingUp className="h-5 w-5" />} />
            <HeroMetric label="Gastos registrados" value={money(totals.expenses)} icon={<TrendingDown className="h-5 w-5" />} />
            <HeroMetric label="Resultado real registrado" value={money(totals.net)} icon={<Wallet className="h-5 w-5" />} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard icon={<CalendarDays className="h-5 w-5" />} label="Ventana contable" value="01/07/2026 – 30/06/2027" note="Se calcula por fecha real del movimiento, no por plantillas ni por el nombre de temporada." />
          <InfoCard icon={<FileSpreadsheet className="h-5 w-5" />} label="Fuente de verdad" value={currentTransactions.length + " transacciones"} note={currentBankMovements.length + " movimientos bancarios en el mismo periodo. No se suman de nuevo para evitar duplicar importes."} />
          <InfoCard icon={needsReview.length ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />} label="Pendientes de clasificar" value={String(needsReview.length)} note={unmatchedBankMovements.length + " movimientos bancarios todavía sin transacción vinculada."} />
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex items-start gap-3"><CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><strong>Importante para que el presupuesto sea fiable:</strong> las cifras reales se calculan solo desde FinancialTransaction. Los movimientos bancarios sirven para comprobar cobertura y conciliación, pero no se vuelven a sumar, porque muchos ya están representados en las transacciones. La temporada completa se irá completando a medida que importes los siguientes extractos y termines de clasificar los movimientos.</div></div>
        </div>

        <Tabs defaultValue="resumen" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-sm md:grid-cols-4">
            <TabsTrigger value="resumen" className="py-3">Resumen</TabsTrigger>
            <TabsTrigger value="partidas" className="py-3">Partidas reales</TabsTrigger>
            <TabsTrigger value="proyeccion" className="py-3">Presupuesto 27/28</TabsTrigger>
            <TabsTrigger value="movimientos" className="py-3">Movimientos y revisión</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-lg">Ejecución real por tipo</CardTitle></CardHeader><CardContent className="space-y-5">
                <ProgressMetric label="Ingresos de temporada" amount={totals.incomes} max={Math.max(totals.incomes, totals.expenses, 1)} color="bg-emerald-500" />
                <ProgressMetric label="Gastos de temporada" amount={totals.expenses} max={Math.max(totals.incomes, totals.expenses, 1)} color="bg-rose-500" />
                <div className={"rounded-xl p-4 " + (totals.net >= 0 ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900")}><p className="text-sm">Resultado provisional</p><p className="mt-1 text-2xl font-bold">{money(totals.net)}</p><p className="mt-1 text-xs opacity-80">No equivale al saldo bancario; refleja solo las transacciones cargadas en el periodo.</p></div>
              </CardContent></Card>
              <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-lg">Partidas con mayor movimiento</CardTitle></CardHeader><CardContent><div className="space-y-3">{byPartida.slice(0, 8).map(row => <div key={groupKey(row.tipo, row.nombre)} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div className="min-w-0"><p className="truncate font-medium text-slate-800">{row.nombre}</p><p className="text-xs text-slate-500">{row.count} movimientos · {row.tipo === "Ingreso" ? "Ingreso" : "Gasto"}</p></div><p className={"shrink-0 font-semibold " + (row.tipo === "Ingreso" ? "text-emerald-700" : "text-rose-700")}>{money(row.total)}</p></div>)}{!byPartida.length && <p className="text-sm text-slate-500">Aún no hay transacciones fechadas dentro de la temporada.</p>}</div></CardContent></Card>
            </div>
            <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-lg">Cómo vamos a llegar al 30 de junio</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Milestone n="01" title="Cada extracto nuevo" text="La fecha inicial se toma desde el último movimiento importado. Se detectan solapamientos y no se duplican transacciones." />
              <Milestone n="02" title="Aprendizaje de partidas" text="Al corregir una categoría o partida, el sistema aprende el concepto para proponerla en movimientos futuros." />
              <Milestone n="03" title="Cierre y previsión" text="El 30/06/2027 revisamos pendientes, ejecutado, partidas recurrentes y gastos extraordinarios para cerrar la temporada y dejar preparado 2027/2028." />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="partidas" className="space-y-4">
            <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-lg">Ejecución por partida · temporada 2026/2027</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>Partida</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Movimientos</TableHead><TableHead className="text-right">Meses activos</TableHead><TableHead className="text-right">Importe real</TableHead></TableRow></TableHeader><TableBody>
                {byPartida.map(row => <TableRow key={groupKey(row.tipo, row.nombre)}><TableCell className="font-medium">{row.nombre}{row.review > 0 && <Badge variant="destructive" className="ml-2">{row.review} revisar</Badge>}</TableCell><TableCell><Badge variant="outline" className={row.tipo === "Ingreso" ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"}>{row.tipo}</Badge></TableCell><TableCell className="text-right">{row.count}</TableCell><TableCell className="text-right">{row.months.size}</TableCell><TableCell className={"text-right font-semibold " + (row.tipo === "Ingreso" ? "text-emerald-700" : "text-rose-700")}>{money(row.total)}</TableCell></TableRow>)}
                {!byPartida.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">No hay movimientos reales en el rango de fechas.</TableCell></TableRow>}
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="proyeccion" className="space-y-4">
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:flex-row sm:items-center"><div><h2 className="font-bold text-orange-950">Presupuesto que se construye desde los datos</h2><p className="mt-1 text-sm text-orange-900/80">Cada partida nace de una partida real observada en 2026/2027. Ajusta la previsión de 2027/2028 y guarda; al actualizar datos, el ejecutado se recalcula sin reemplazar tus previsiones.</p></div><Button onClick={saveBudget} disabled={saving} className="bg-orange-600 hover:bg-orange-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar presupuesto vivo</Button></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><SummaryTile label="Previsión de ingresos 27/28" value={money(totals.incomesForecast)} tone="green" /><SummaryTile label="Previsión de gastos 27/28" value={money(totals.expensesForecast)} tone="red" /><SummaryTile label="Resultado previsto 27/28" value={money(totals.forecastNet)} tone={totals.forecastNet >= 0 ? "blue" : "red"} /></div>
            <Card className="border-0 shadow-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Partida derivada de movimientos</TableHead><TableHead>Clasificación</TableHead><TableHead className="text-right">Ejecutado 26/27</TableHead><TableHead className="text-right">Previsión 27/28 (€)</TableHead></TableRow></TableHeader><TableBody>
              {draftLines.map(line => <TableRow key={line.id}><TableCell className="min-w-48 font-medium">{line.nombre}</TableCell><TableCell><Badge variant="outline">{line.categoria}</Badge></TableCell><TableCell className="text-right tabular-nums">{money(line.ejecutado)}</TableCell><TableCell className="w-48"><Input type="number" min="0" step="0.01" value={line.presupuestado ?? 0} onChange={e => updateLine(line.id, "presupuestado", e.target.value)} className="ml-auto max-w-40 text-right" aria-label={"Previsión para " + line.nombre} /></TableCell></TableRow>)}
              {!draftLines.length && <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">Primero hay que registrar movimientos en la temporada.</TableCell></TableRow>}
            </TableBody></Table></CardContent></Card>
            <p className="text-xs text-slate-500">La previsión no se presenta como definitiva: mientras la temporada siga abierta, se irá revisando con nuevos movimientos y con las decisiones del club. El guardado crea/actualiza el presupuesto 2027/2028; no modifica ni borra las transacciones originales.</p>
          </TabsContent>

          <TabsContent value="movimientos" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar concepto, categoría, partida, proveedor…" className="bg-white pl-9" /></div><Button variant={showOnlyReview ? "default" : "outline"} onClick={() => setShowOnlyReview(v => !v)}>{showOnlyReview ? "Mostrando pendientes" : "Ver pendientes de revisión"}</Button></div>
            <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-lg">Movimientos que alimentan el presupuesto</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Partida / categoría</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Importe</TableHead></TableRow></TableHeader><TableBody>
              {filteredTransactions.map(tx => <TableRow key={tx.id}><TableCell className="whitespace-nowrap">{tx.fecha || "—"}</TableCell><TableCell className="min-w-56"><p className="font-medium">{tx.concepto}</p>{tx.proveedor_cliente && <p className="text-xs text-slate-500">{tx.proveedor_cliente}</p>}</TableCell><TableCell><p>{tx.partida_nombre || "Sin partida"}</p><p className="text-xs text-slate-500">{tx.categoria || "Sin categoría"}</p></TableCell><TableCell>{tx.revisar_clasificacion || !clean(tx.partida_nombre) ? <Badge variant="destructive">Revisar</Badge> : <Badge variant="outline" className="border-emerald-200 text-emerald-700">Clasificado</Badge>}</TableCell><TableCell className={"text-right font-semibold " + (tx.tipo === "Ingreso" ? "text-emerald-700" : "text-rose-700")}>{tx.tipo === "Gasto" ? "−" : "+"}{money(tx.cantidad)}</TableCell></TableRow>)}
              {!filteredTransactions.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">No hay resultados para este filtro.</TableCell></TableRow>}
            </TableBody></Table></CardContent></Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row"><span>{lastRefresh ? "Datos actualizados: " + lastRefresh.toLocaleString("es-ES") : "Datos pendientes de actualizar"}</span><span>Histórico cargado: {transactions.length} transacciones · {bankMovements.length} movimientos bancarios</span></div>
      </div>
    </div>
  );
}

function buildActualGroups(transactions) {
  const map = new Map();
  (transactions || []).filter(t => !t.is_sample && isCurrentSeasonDate(t.fecha) && t.estado !== "Anulado").forEach(t => {
    const nombre = keyOf(t);
    const key = groupKey(t.tipo, nombre);
    const row = map.get(key) || { nombre, tipo: t.tipo, ejecutado: 0, count: 0 };
    row.ejecutado += number(t.cantidad);
    row.count += 1;
    map.set(key, row);
  });
  return [...map.values()].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, "es"));
}
function makeId() { return "budget_line_" + Math.random().toString(36).slice(2, 10); }
function HeroMetric({ label, value, icon }) { return <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">{icon}</div><div className="min-w-0"><p className="text-sm text-slate-300">{label}</p><p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{value}</p></div></div>; }
function InfoCard({ icon, label, value, note }) { return <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-slate-500">{icon}{label}</div><p className="mt-2 text-lg font-bold text-slate-900">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{note}</p></CardContent></Card>; }
function ProgressMetric({ label, amount, max, color }) { return <div><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">{label}</span><strong>{money(amount)}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={"h-full rounded-full " + color} style={{ width: Math.min(100, max ? amount / max * 100 : 0) + "%" }} /></div></div>; }
function Milestone({ n, title, text }) { return <div className="rounded-xl border bg-slate-50 p-4"><div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">{n}</div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-5 text-slate-600">{text}</p></div>; }
function SummaryTile({ label, value, tone }) { const tones = { green: "border-emerald-200 bg-emerald-50 text-emerald-800", red: "border-rose-200 bg-rose-50 text-rose-800", blue: "border-blue-200 bg-blue-50 text-blue-800" }; return <div className={"rounded-xl border p-4 " + (tones[tone] || tones.blue)}><p className="text-sm opacity-80">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }
