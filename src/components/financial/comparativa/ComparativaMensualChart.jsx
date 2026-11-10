import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { GitCompare } from "lucide-react";
import { eur } from "@/components/financial/panel/financeStats";
import { MESES, MESES_LARGOS, previousSeason, collectIncome, monthlyTotals } from "./buildMonthly";
import MonthDetailDialog from "./MonthDetailDialog";

export default function ComparativaMensualChart({ activeSeason, payments, lotteryOrders, clubMembers }) {
  const [detalle, setDetalle] = useState(null);
  const actual = activeSeason?.temporada;
  const anterior = previousSeason(actual);

  const { data, itemsActual, itemsAnterior, resumen } = useMemo(() => {
    const src = { payments, lotteryOrders, clubMembers };
    const a = collectIncome(actual, src);
    const b = collectIncome(anterior, src);
    const ta = monthlyTotals(a);
    const tb = monthlyTotals(b);
    // Compara solo hasta el mes actual de la temporada
    const hoy = (new Date().getMonth() + 7) % 12;
    const acumA = ta.slice(0, hoy + 1).reduce((s, v) => s + v, 0);
    const acumB = tb.slice(0, hoy + 1).reduce((s, v) => s + v, 0);
    const diff = acumB > 0 ? Math.round(((acumA - acumB) / acumB) * 100) : null;
    return {
      data: MESES.map((mes, i) => ({ mes, idx: i, [actual]: ta[i], [anterior]: tb[i] })),
      itemsActual: a,
      itemsAnterior: b,
      resumen: { acumA, acumB, diff, hastaMes: MESES_LARGOS[hoy] },
    };
  }, [actual, anterior, payments, lotteryOrders, clubMembers]);

  if (!actual) return null;

  const openMonth = (temporada, items) => (bar) => {
    const idx = bar?.payload?.idx;
    if (idx === undefined) return;
    setDetalle({ title: `Cobros de ${MESES_LARGOS[idx]} · ${temporada}`, items: items.filter((i) => i.mesIndex === idx) });
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
            <GitCompare className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg md:text-xl">Esta temporada vs. la anterior</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Hasta {resumen.hastaMes}: <b>{eur(resumen.acumA)}</b> frente a <b>{eur(resumen.acumB)}</b>
              {resumen.diff !== null && (
                <span className={resumen.diff >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-600"}>
                  {" "}({resumen.diff >= 0 ? "+" : ""}{resumen.diff}%)
                </span>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="mb-3 text-xs text-slate-500">Pulsa una barra para ver los cobros de ese mes.</p>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => `${Math.round(v / 100) / 10}k€`} />
            <Tooltip formatter={(v) => eur(v)} cursor={{ fill: "#f1f5f9" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={anterior} fill="#cbd5e1" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={openMonth(anterior, itemsAnterior)} />
            <Bar dataKey={actual} fill="#7c3aed" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={openMonth(actual, itemsActual)} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
      <MonthDetailDialog open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.title} items={detalle?.items} />
    </Card>
  );
}