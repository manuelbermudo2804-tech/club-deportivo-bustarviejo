import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import SubTabs from "./SubTabs";
import FinancialAuditCenter from "@/components/financial/FinancialAuditCenter";
import SeasonBudgetDashboard from "@/components/financial/SeasonBudgetDashboard";
import CashPositionForecast from "@/components/financial/CashPositionForecast.jsx";
import RecurringCommitmentsManager from "@/components/financial/RecurringCommitmentsManager.jsx";
import BudgetPlanner from "@/pages/BudgetPlanner";

const OPTIONS = [
  { value: "actual", label: "Temporada actual" },
  { value: "siguiente", label: "Temporada 27/28" },
  { value: "caja", label: "Previsión de caja y pagos fijos" },
];

export default function PresupuestoTab({ initialView = "actual", activeSeason, onScenarioChange, onOpenAI }) {
  const [view, setView] = useState(initialView);
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <SubTabs options={OPTIONS} value={view} onChange={setView} />
        {view !== "caja" && (
          <Button onClick={onOpenAI} className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="mr-2 h-4 w-4" /> Análisis IA
          </Button>
        )}
      </div>

      {view === "actual" && (
        <div className="space-y-8">
          <SeasonBudgetDashboard activeSeason={activeSeason} />
          <FinancialAuditCenter activeSeason={activeSeason} />
        </div>
      )}
      {view === "siguiente" && <BudgetPlanner onScenarioChange={onScenarioChange} />}
      {view === "caja" && (
        <div className="space-y-6">
          <CashPositionForecast activeSeason={activeSeason} />
          <RecurringCommitmentsManager />
        </div>
      )}
    </div>
  );
}