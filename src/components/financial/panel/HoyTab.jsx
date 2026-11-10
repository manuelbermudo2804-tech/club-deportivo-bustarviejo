import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Wallet, CheckCircle2, Clock, TrendingDown, CreditCard, Users, Building2, Clover } from "lucide-react";
import KpiCard from "./KpiCard";
import ConceptRow from "./ConceptRow";
import { eur } from "./financeStats";
import SolidarityFundWidget from "@/components/financial/SolidarityFundWidget.jsx";

export default function HoyTab({ stats, activeSeason, payments }) {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["cashForecastBankAccounts"],
    queryFn: () => base44.entities.BankAccount.list(),
    staleTime: 60000,
  });
  const banco = accounts.filter((a) => a.activa !== false).reduce((s, a) => s + (Number(a.saldo_actual) || 0), 0);
  const showLottery = activeSeason?.loteria_navidad_abierta || stats.loteriaTotal > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Wallet} label="Dinero en el banco" value={isLoading ? "…" : eur(banco)} detail="Saldo según el último extracto subido" tone="blue" />
        <KpiCard icon={CheckCircle2} label="Cobrado esta temporada" value={eur(stats.totalIngresos)} detail={stats.cuotasEnRevision > 0 ? `+ ${eur(stats.cuotasEnRevision)} en revisión (${stats.cuotasEnRevisionCount} pagos)` : "Cuotas, socios, patrocinios y lotería"} tone="green" />
        <KpiCard icon={Clock} label="Pendiente de cobrar" value={eur(stats.totalPendiente)} detail={`${eur(stats.cuotasVencidas)} ya vencido (${stats.cuotasVencidasCount} cuotas)`} tone="orange" />
        <KpiCard icon={TrendingDown} label="Gastado esta temporada" value={eur(stats.gastos)} detail="Según los movimientos registrados" tone="red" />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">De dónde viene el dinero</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ConceptRow icon={CreditCard} title="Cuotas de jugadores" subtitle={`${stats.cuotasPagadasCount} cuotas pagadas · ${stats.cuotasPendientesCount} pendientes`} cobrado={stats.cuotasPagadas} pendiente={stats.cuotasPendientes} to={createPageUrl("Payments")} />
          <ConceptRow icon={Users} title="Socios" subtitle={`${stats.sociosCount} socios esta temporada`} cobrado={stats.sociosPagados} pendiente={stats.sociosPendientes} to={createPageUrl("ClubMembersManagement")} />
          <ConceptRow icon={Building2} title="Patrocinios" subtitle={`${stats.patrociniosPagadosCount} han pagado${stats.patrociniosPendientesCount ? ` · ${stats.patrociniosPendientesCount} sin pagar` : ""}`} cobrado={stats.patrociniosTotal} pendiente={stats.patrociniosPendientes} to={createPageUrl("Sponsorships")} />
          {showLottery && (
            <ConceptRow icon={Clover} title="Lotería de Navidad" cobrado={stats.loteriaPagada} pendiente={stats.loteriaPendiente} to={createPageUrl("LotteryManagement")} />
          )}
        </div>
      </div>

      <SolidarityFundWidget activeSeason={activeSeason} payments={payments} />

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to={createPageUrl("PaymentHistory")} className="text-orange-700 hover:underline">Histórico de pagos</Link>
        <Link to={createPageUrl("PaymentReminders")} className="text-orange-700 hover:underline">Recordatorios de pago</Link>
      </div>
    </div>
  );
}