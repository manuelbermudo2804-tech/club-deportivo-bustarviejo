import React from "react";
import { AlertTriangle, Info } from "lucide-react";

const money = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v) || 0);

export default function BudgetReviewNotices({ info, baseSeason }) {
  const { unassigned, possibleDuplicates, hasBaseBudget } = info;
  return (
    <>
      {possibleDuplicates.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div><b>Posible ingreso duplicado.</b> El presupuesto {baseSeason} tiene varias partidas que parecen la misma cuota de jugadores: <b>{possibleDuplicates.join(", ")}</b>. Si son lo mismo, deja una a 0 en la propuesta para no contarla dos veces.</div>
        </div>
      )}
      {hasBaseBudget && unassigned.count > 0 && (
        <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <Info className="h-5 w-5 shrink-0" />
          <div><b>{unassigned.count} movimientos de {baseSeason} sin partida asignada</b> ({money(unassigned.ingresos)} de ingresos y {money(unassigned.gastos)} de gastos). No se suman al presupuesto para no duplicar; asígnales partida en Movimientos para que cuenten en "Llevado hasta hoy".</div>
        </div>
      )}
    </>
  );
}