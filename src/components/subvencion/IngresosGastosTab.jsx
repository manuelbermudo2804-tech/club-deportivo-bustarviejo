import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { inSeason, eur, fmtDate, esEstaSubvencion } from "@/components/subvencion/expedienteConfig";
import { downloadExcel } from "@/components/subvencion/exportExcel";
import IndicadorCard from "@/components/subvencion/IndicadorCard";

const sumBy = (items, key) => items.reduce((m, x) => { m[x[key]] = (m[x[key]] || 0) + (x.cantidad || 0); return m; }, {});

export default function IngresosGastosTab({ exp }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [movs, pagos] = await Promise.all([
        base44.entities.FinancialTransaction.list("-fecha", 5000),
        base44.entities.Payment.filter({ estado: "Pagado" }, "-fecha_pago", 5000),
      ]);
      const season = movs.filter((m) => m.estado !== "Anulado" && inSeason(m.temporada, m.fecha, exp.temporada));
      const ingresos = season.filter((m) => m.tipo === "Ingreso" && !(m.automatico && m.categoria === "Inscripciones") && !(m.categoria === "Subvenciones" && esEstaSubvencion(m, exp.entidad)));
      const otras = ingresos.filter((m) => m.categoria === "Subvenciones");
      const gastos = season.filter((m) => m.tipo === "Gasto");
      const cuotas = pagos.filter((p) => !p.is_deleted && inSeason(p.temporada, p.fecha_pago, exp.temporada)).reduce((s, p) => s + (p.cantidad || 0), 0);
      setData({ ingresosCat: sumBy(ingresos, "categoria"), gastosCat: sumBy(gastos, "categoria"), otras, cuotas });
    })();
  }, [exp.temporada, exp.entidad]);

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-orange-500" /></div>;

  const filasIngresos = [
    { concepto: `Subvención ${exp.entidad || "Ayuntamiento"}`, importe: exp.importe_concedido || 0 },
    { concepto: "Cuotas de jugadores (pagos registrados en la app)", importe: data.cuotas },
    ...Object.entries(data.ingresosCat).map(([c, v]) => ({ concepto: c, importe: v })),
  ];
  const filasGastos = Object.entries(data.gastosCat).map(([c, v]) => ({ concepto: c, importe: v }));
  const totalIng = filasIngresos.reduce((s, f) => s + f.importe, 0);
  const totalGas = filasGastos.reduce((s, f) => s + f.importe, 0);
  const ok = totalIng <= totalGas;

  const exportar = () => downloadExcel(`Ingresos_gastos_${exp.temporada}.xlsx`, [
    { name: "Cuadro global", rows: [
      ...filasIngresos.map((f) => ({ Tipo: "INGRESO", Concepto: f.concepto, "Importe (€)": f.importe })),
      { Tipo: "TOTAL INGRESOS", Concepto: "", "Importe (€)": totalIng },
      ...filasGastos.map((f) => ({ Tipo: "GASTO", Concepto: f.concepto, "Importe (€)": f.importe })),
      { Tipo: "TOTAL GASTOS", Concepto: "", "Importe (€)": totalGas },
    ] },
    { name: "Otras subvenciones", rows: data.otras.length
      ? data.otras.map((o) => ({ "Entidad concedente": o.proveedor_cliente || "", Concepto: o.concepto, "Importe (€)": o.cantidad, "Fecha cobro": fmtDate(o.fecha), "Temporada de la actividad": o.temporada_actividad || o.temporada || "" }))
      : [{ "Declaración": `El club no ha recibido otras subvenciones o ayudas para la misma finalidad en la temporada ${exp.temporada}.` }] },
  ]);

  const Tabla = ({ titulo, filas, total }) => (
    <Card className="rounded-xl"><CardContent className="p-4">
      <p className="font-semibold text-slate-800 mb-2">{titulo}</p>
      {filas.map((f) => <div key={f.concepto} className="flex justify-between text-sm py-1 border-b border-slate-100"><span>{f.concepto}</span><span>{eur(f.importe)}</span></div>)}
      <div className="flex justify-between font-bold text-sm pt-2"><span>Total</span><span>{eur(total)}</span></div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <IndicadorCard label="Total ingresos" value={eur(totalIng)} />
        <IndicadorCard label="Total gastos" value={eur(totalGas)} />
        <IndicadorCard label="Otras subvenciones" value={data.otras.length} />
      </div>
      <p className={`text-sm flex items-center gap-1 ${ok ? "text-green-700" : "text-red-600"}`}>
        {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {ok ? "Correcto: los ingresos no superan el coste total de la actividad." : "Atención: los ingresos superan a los gastos. El convenio no lo permite; revisa que estén registrados todos los gastos."}
      </p>
      <Button onClick={exportar} className="bg-orange-600 hover:bg-orange-700"><Download className="w-4 h-4 mr-2" /> Descargar cuadro y relación de subvenciones (Excel)</Button>
      <div className="grid md:grid-cols-2 gap-3">
        <Tabla titulo="Ingresos" filas={filasIngresos} total={totalIng} />
        <Tabla titulo="Gastos" filas={filasGastos} total={totalGas} />
      </div>
      <Card className="rounded-xl"><CardContent className="p-4 space-y-1">
        <p className="font-semibold text-slate-800">Otras subvenciones y ayudas</p>
        <p className="text-xs text-slate-500">Se registran como ingreso de categoría «Subvenciones» en el Panel Financiero (ej: Comunidad de Madrid, ayudas de arbitraje de la Federación). Indica en notas si corresponden a otra temporada.</p>
        {data.otras.length === 0 ? <p className="text-sm text-slate-500">Ninguna registrada: se generará la declaración de no haberlas recibido.</p>
          : data.otras.map((o) => <div key={o.id} className="flex justify-between text-sm"><span>{o.proveedor_cliente || "—"} · {o.concepto}</span><span>{eur(o.cantidad)}</span></div>)}
      </CardContent></Card>
    </div>
  );
}