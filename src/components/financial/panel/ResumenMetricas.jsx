import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { eur } from "./financeStats";

const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : "0");

export default function ResumenMetricas({ stats, jugadores }) {
  const items = [
    { label: "Tasa de cobro", value: `${pct(stats.totalIngresos, stats.totalEsperado)}%`, detail: "Cobrado sobre el total esperado" },
    { label: "Cuota media cobrada por jugador", value: eur(jugadores ? stats.cuotasPagadas / jugadores : 0), detail: `${jugadores} jugadores activos` },
    { label: "Morosidad", value: `${pct(stats.totalPendiente, stats.totalEsperado)}%`, detail: `${eur(stats.totalPendiente)} sin cobrar` },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {items.map((i) => (
        <Card key={i.label}>
          <CardContent className="p-5">
            <p className="text-sm text-slate-600">{i.label}</p>
            <p className="text-2xl font-bold text-slate-900">{i.value}</p>
            <p className="mt-1 text-xs text-slate-500">{i.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}