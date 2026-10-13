import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const eur = (n) => `${(n || 0).toFixed(2)} €`;

export default function StripeComisiones({ meses }) {
  const tot = meses.reduce((a, m) => ({ bruto: a.bruto + m.bruto, comision: a.comision + m.comision, neto: a.neto + m.neto }), { bruto: 0, comision: 0, neto: 0 });
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Comisiones de Stripe por mes</CardTitle></CardHeader>
      <CardContent>
        <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="py-2">Mes</th><th>Cobros</th><th>Cobrado</th><th>Comisión</th><th>Neto</th>
          </tr></thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes} className="border-b">
                <td className="py-2">{m.mes}</td><td>{m.cobros}</td><td>{eur(m.bruto)}</td>
                <td className="text-red-600">-{eur(m.comision)}</td><td className="font-semibold">{eur(m.neto)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2">Total</td><td></td><td>{eur(tot.bruto)}</td>
              <td className="text-red-600">-{eur(tot.comision)}</td><td>{eur(tot.neto)}</td>
            </tr>
          </tbody>
        </table></div>
      </CardContent>
    </Card>
  );
}