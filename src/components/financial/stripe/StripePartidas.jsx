import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const eur = (n) => `${(n || 0).toFixed(2)} €`;
const NOMBRES = {
  pago_cuota_batch: "Cuotas (pago agrupado)",
  pago_cuota: "Cuotas (pago individual)",
  landing_submission: "Inscripciones de páginas/eventos",
  porra: "Porra",
  collaboration_payment: "Colaboraciones / patrocinio",
  cuota_socio: "Cuotas de socio",
  alta_socio_referido: "Altas de socio",
  otro: "Otros",
};

export default function StripePartidas({ partidas, gastos }) {
  const tot = partidas.reduce((a, p) => ({ bruto: a.bruto + p.bruto, comision: a.comision + p.comision, neto: a.neto + p.neto }), { bruto: 0, comision: 0, neto: 0 });
  const otrosGastos = (gastos?.devoluciones || 0) + (gastos?.otras_comisiones || 0);
  const final = tot.neto - otrosGastos;
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Ingresos por Stripe por partidas (todo el historial)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="py-2">Partida</th><th>Cobros</th><th>Ingresado</th><th>Comisión</th><th>Neto</th>
          </tr></thead>
          <tbody>
            {partidas.map((p) => (
              <tr key={p.tipo} className="border-b">
                <td className="py-2">{NOMBRES[p.tipo] || p.tipo}</td><td>{p.cobros}</td><td>{eur(p.bruto)}</td>
                <td className="text-red-600">-{eur(p.comision)}</td><td className="font-semibold">{eur(p.neto)}</td>
              </tr>
            ))}
            <tr className="font-bold border-b">
              <td className="py-2">Total cobrado</td><td></td><td>{eur(tot.bruto)}</td>
              <td className="text-red-600">-{eur(tot.comision)}</td><td>{eur(tot.neto)}</td>
            </tr>
          </tbody>
        </table></div>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="p-3 rounded-lg bg-red-50"><p className="text-slate-500">Devoluciones</p><p className="font-bold text-red-700">-{eur(gastos?.devoluciones)}</p></div>
          <div className="p-3 rounded-lg bg-red-50"><p className="text-slate-500">Otros cargos de Stripe</p><p className="font-bold text-red-700">-{eur(gastos?.otras_comisiones)}</p></div>
          <div className="p-3 rounded-lg bg-green-50"><p className="text-slate-500">Lo que realmente le queda al club</p><p className="font-bold text-green-700">{eur(final)}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}