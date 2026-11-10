import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp } from "lucide-react";
import SubTabs from "./SubTabs";
import ResumenMetricas from "./ResumenMetricas";
import FinancialHealthIndicator from "@/components/financial/FinancialHealthIndicator.jsx";
import MonthlyEvolutionChart from "@/components/financial/MonthlyEvolutionChart.jsx";
import EndOfSeasonForecast from "@/components/financial/EndOfSeasonForecast.jsx";
import FinancialGoalsTracker from "@/components/financial/FinancialGoalsTracker.jsx";
import TopDebtorsPanel from "@/components/financial/TopDebtorsPanel.jsx";
import CategoryBreakdown from "@/components/financial/CategoryBreakdown.jsx";
import CategoryProfitability from "@/components/financial/CategoryProfitability.jsx";
import RetentionAnalysis from "@/components/financial/RetentionAnalysis.jsx";
import CashFlowAnalysis from "@/components/financial/CashFlowAnalysis.jsx";
import FinancialRatios from "@/components/financial/FinancialRatios.jsx";
import SeasonalityAnalysis from "@/components/financial/SeasonalityAnalysis.jsx";
import IncomeDistributionPie from "@/components/financial/IncomeDistributionPie.jsx";
import IncomeProjection from "@/components/financial/IncomeProjection.jsx";
import FinancialAlerts from "@/components/financial/FinancialAlerts.jsx";
import AutomaticMorosidadAlert from "@/components/financial/AutomaticMorosidadAlert.jsx";

const OPTIONS = [
  { value: "evolucion", label: "Evolución" },
  { value: "deudores", label: "Deudores y categorías" },
  { value: "rentabilidad", label: "Rentabilidad" },
  { value: "retencion", label: "Retención" },
  { value: "flujo", label: "Flujo de caja" },
  { value: "ratios", label: "Ratios" },
  { value: "estacionalidad", label: "Estacionalidad" },
  { value: "alertas", label: "Alertas" },
];

export default function InformesTab({ stats, activeSeason, allSeasons, payments, players, transactions, lotteryOrders, clubMembers, sponsors, customPlans, getImportePorMes, onCompare, onPDF, onCSV }) {
  const [view, setView] = useState("evolucion");
  const totals = { totalIngresos: stats.totalIngresos, totalPendiente: stats.totalPendiente, totalEsperado: stats.totalEsperado };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onCompare}><TrendingUp className="mr-2 h-4 w-4" /> Comparar temporadas</Button>
        <Button variant="outline" onClick={onPDF}><Download className="mr-2 h-4 w-4" /> Descargar PDF</Button>
        <Button variant="outline" onClick={onCSV}><FileText className="mr-2 h-4 w-4" /> Descargar Excel</Button>
      </div>
      <SubTabs options={OPTIONS} value={view} onChange={setView} />

      {view === "evolucion" && (
        <div className="space-y-6">
          <FinancialHealthIndicator {...totals} stats={stats} />
          <ResumenMetricas stats={stats} jugadores={players.filter((p) => p.activo === true).length} />
          <div className="grid gap-6 xl:grid-cols-2">
            <IncomeDistributionPie stats={stats} />
            <IncomeProjection {...totals} stats={stats} />
          </div>
          <MonthlyEvolutionChart payments={payments} clothingOrders={[]} lotteryOrders={lotteryOrders} clubMembers={clubMembers} sponsors={sponsors} activeSeason={activeSeason} />
          <EndOfSeasonForecast {...totals} stats={stats} activeSeason={activeSeason} payments={payments} />
          <FinancialGoalsTracker {...totals} activeSeason={activeSeason} />
        </div>
      )}
      {view === "deudores" && (
        <div className="space-y-6">
          <TopDebtorsPanel players={players} payments={payments} activeSeason={activeSeason} getImportePorMes={getImportePorMes} customPlans={customPlans} />
          <CategoryBreakdown players={players} payments={payments} activeSeason={activeSeason} getImportePorMes={getImportePorMes} />
        </div>
      )}
      {view === "rentabilidad" && <CategoryProfitability payments={payments} transactions={transactions} players={players} activeSeason={activeSeason} />}
      {view === "retencion" && <RetentionAnalysis allSeasons={allSeasons} allPlayers={players} />}
      {view === "flujo" && <CashFlowAnalysis payments={payments} transactions={transactions} clothingOrders={[]} lotteryOrders={lotteryOrders} clubMembers={clubMembers} sponsors={sponsors} activeSeason={activeSeason} />}
      {view === "ratios" && <FinancialRatios totalIngresos={stats.totalIngresos} totalPendiente={stats.totalPendiente} totalGastos={stats.gastos} stats={stats} />}
      {view === "estacionalidad" && <SeasonalityAnalysis payments={payments} activeSeason={activeSeason} />}
      {view === "alertas" && (
        <div className="space-y-6">
          <AutomaticMorosidadAlert {...totals} />
          <FinancialAlerts {...totals} stats={stats} />
        </div>
      )}
    </div>
  );
}