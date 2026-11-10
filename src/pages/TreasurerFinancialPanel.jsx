import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Home, ArrowLeftRight, Calculator, BarChart3 } from "lucide-react";
import { toast } from "sonner";

import TransactionForm from "@/components/financial/TransactionForm";
import AIFinancialForecasting from "@/components/financial/AIFinancialForecasting";
import SeasonComparison from "@/components/financial/SeasonComparison.jsx";
import HoyTab from "@/components/financial/panel/HoyTab";
import MovimientosTab from "@/components/financial/panel/MovimientosTab";
import PresupuestoTab from "@/components/financial/panel/PresupuestoTab";
import InformesTab from "@/components/financial/panel/InformesTab";
import { computeFinanceStats, makeGetImportePorMes, seasonMatches } from "@/components/financial/panel/financeStats";
import { exportFinancePDF, exportFinanceCSV, exportTransactionsCSV } from "@/components/financial/panel/financeExports";

// Compatibilidad con enlaces antiguos (?tab=bancario, ?tab=presupuestos...)
const OLD_TABS = {
  resumen: ["hoy"], bancario: ["movimientos", "banco"], transacciones: ["movimientos", "movimientos"], stripe: ["movimientos", "stripe"],
  presupuestos: ["presupuesto", "actual"], presupuesto2728: ["presupuesto", "siguiente"], tesoreria: ["presupuesto", "caja"], analisis: ["informes"],
};
const initialTab = () => {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return OLD_TABS[tab] || (tab ? [tab] : ["hoy"]);
};

const TABS = [
  { value: "hoy", label: "Hoy", icon: Home },
  { value: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { value: "presupuesto", label: "Presupuesto", icon: Calculator },
  { value: "informes", label: "Informes", icon: BarChart3 },
];

const useList = (key, entity, sort) => useQuery({
  queryKey: [key],
  queryFn: () => base44.entities[entity].list(sort),
  staleTime: 120000,
  refetchOnWindowFocus: false,
});

export default function TreasurerFinancialPanel() {
  const queryClient = useQueryClient();
  const [[startTab, startView]] = useState(initialTab);
  const [activeTab, setActiveTab] = useState(startTab);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAIForecasting, setShowAIForecasting] = useState(false);
  const [budgetPlanForAI, setBudgetPlanForAI] = useState(null);
  const [showSeasonComparison, setShowSeasonComparison] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: allSeasons = [] } = useList("seasons", "SeasonConfig");
  const { data: payments = [] } = useList("payments", "Payment");
  const { data: players = [] } = useList("players", "Player");
  const { data: lotteryOrders = [] } = useList("lotteryOrders", "LotteryOrder");
  const { data: clubMembers = [] } = useList("clubMembers", "ClubMember");
  const { data: sponsors = [] } = useList("sponsors", "Sponsor");
  const { data: customPlans = [] } = useList("customPaymentPlans", "CustomPaymentPlan");
  const { data: budgets = [] } = useList("budgets", "Budget", "-created_date");
  const { data: transactions = [] } = useList("transactions", "FinancialTransaction", "-fecha");

  const activeSeason = allSeasons.find((s) => s.activa === true) || null;
  const currentBudget = budgets.find((b) => activeSeason && seasonMatches(b.temporada, activeSeason.temporada)) || null;
  // Incluye los movimientos sin temporada para que no queden ocultos
  const seasonTransactions = transactions.filter((t) => !activeSeason || !t.temporada || seasonMatches(t.temporada, activeSeason.temporada));

  const stats = useMemo(
    () => computeFinanceStats({ activeSeason, payments, lotteryOrders, clubMembers, sponsors, transactions }),
    [activeSeason, payments, lotteryOrders, clubMembers, sponsors, transactions]
  );
  const getImportePorMes = useMemo(() => makeGetImportePorMes(activeSeason, payments), [activeSeason, payments]);

  const afterTransactionChange = async () => {
    await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    if (currentBudget?.id) {
      await base44.functions.invoke("updateBudgetExecuted", { budgetId: currentBudget.id }).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  };

  const createTransaction = useMutation({
    mutationFn: (data) => base44.entities.FinancialTransaction.create(data),
    onSuccess: async () => {
      await afterTransactionChange();
      setShowAddTransaction(false);
      toast.success("Movimiento registrado");
    },
    onError: () => toast.error("No se pudo guardar el movimiento. Revisa los datos e inténtalo de nuevo."),
  });

  const deleteTransaction = useMutation({
    mutationFn: (id) => base44.entities.FinancialTransaction.delete(id),
    onSuccess: async () => { await afterTransactionChange(); toast.success("Movimiento eliminado"); },
    onError: () => toast.error("No se pudo eliminar el movimiento"),
  });

  const handleDelete = (id) => {
    if (id && window.confirm("¿Quieres eliminar este movimiento? Esta acción no se puede deshacer.")) deleteTransaction.mutate(id);
  };
  const handleExportTransactions = (rows = seasonTransactions) => {
    if (!rows?.length) return toast.info("No hay movimientos para exportar");
    exportTransactionsCSV(rows, activeSeason?.temporada);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-3 pb-28 sm:p-4 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Panel Financiero</h1>
          <p className="text-sm text-slate-500">Cómo está el dinero del club</p>
        </div>
        {activeSeason && <Badge className="border border-green-200 bg-green-100 text-green-700">Temporada {activeSeason.temporada}</Badge>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex h-auto min-h-12 flex-col gap-1 rounded-xl px-1 py-2 text-xs sm:flex-row sm:gap-2 sm:text-sm data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="hoy" className="mt-6">
          <HoyTab stats={stats} activeSeason={activeSeason} payments={payments} />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-6">
          <MovimientosTab
            initialView={startTab === "movimientos" ? startView : undefined}
            activeSeason={activeSeason}
            transactions={seasonTransactions}
            onAdd={() => setShowAddTransaction(true)}
            onDelete={handleDelete}
            onExport={handleExportTransactions}
          />
        </TabsContent>

        <TabsContent value="presupuesto" className="mt-6">
          <PresupuestoTab
            initialView={startTab === "presupuesto" ? startView : undefined}
            activeSeason={activeSeason}
            onScenarioChange={setBudgetPlanForAI}
            onOpenAI={() => setShowAIForecasting(true)}
          />
        </TabsContent>

        <TabsContent value="informes" className="mt-6">
          <InformesTab
            stats={stats}
            activeSeason={activeSeason}
            allSeasons={allSeasons}
            payments={payments}
            players={players}
            transactions={seasonTransactions}
            lotteryOrders={lotteryOrders}
            clubMembers={clubMembers}
            sponsors={sponsors}
            customPlans={customPlans}
            getImportePorMes={getImportePorMes}
            onCompare={() => setShowSeasonComparison(true)}
            onPDF={() => { exportFinancePDF(stats, activeSeason?.temporada); toast.success("PDF descargado"); }}
            onCSV={() => { exportFinanceCSV(stats, activeSeason?.temporada); toast.success("Excel descargado"); }}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo movimiento</DialogTitle></DialogHeader>
          <TransactionForm
            partidas={currentBudget?.partidas || []}
            temporada={activeSeason?.temporada || ""}
            onSubmit={(data) => createTransaction.mutate(data)}
            onCancel={() => setShowAddTransaction(false)}
            isSubmitting={createTransaction.isPending}
          />
        </DialogContent>
      </Dialog>

      <AIFinancialForecasting open={showAIForecasting} onClose={() => setShowAIForecasting(false)} budgetPlan={budgetPlanForAI} />

      {showSeasonComparison && (
        <SeasonComparison open={showSeasonComparison} onClose={() => setShowSeasonComparison(false)} currentSeason={activeSeason} allSeasons={allSeasons} />
      )}
    </div>
  );
}