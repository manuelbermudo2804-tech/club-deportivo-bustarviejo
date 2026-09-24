import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Plus, Loader2, Info } from "lucide-react";
import { inSeason, eur, fmtDate } from "@/components/subvencion/expedienteConfig";
import { downloadExcel } from "@/components/subvencion/exportExcel";
import IndicadorCard from "@/components/subvencion/IndicadorCard";
import GastoRow from "@/components/subvencion/GastoRow";
import GastoSubvencionDialog from "@/components/subvencion/GastoSubvencionDialog";
import NuevoGastoDialog from "@/components/subvencion/NuevoGastoDialog";

const importeDe = (g) => (g.importe_imputado ?? g.cantidad) || 0;

export default function GastosTab({ exp }) {
  const [gastos, setGastos] = useState(null);
  const [editing, setEditing] = useState(null);
  const [nuevo, setNuevo] = useState(false);

  const load = useCallback(async () => {
    const all = await base44.entities.FinancialTransaction.filter({ tipo: "Gasto" }, "fecha", 3000);
    setGastos(all.filter((g) => g.estado !== "Anulado" && inSeason(g.temporada, g.fecha, exp.temporada)));
  }, [exp.temporada]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (g) => {
    const value = g.subvencion_expediente_id === exp.id ? null : exp.id;
    setGastos((prev) => prev.map((x) => (x.id === g.id ? { ...x, subvencion_expediente_id: value } : x)));
    await base44.entities.FinancialTransaction.update(g.id, { subvencion_expediente_id: value });
  };

  if (!gastos) return <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-orange-500" /></div>;

  const imputados = gastos.filter((g) => g.subvencion_expediente_id === exp.id);
  const totalImputado = imputados.reduce((s, g) => s + importeDe(g), 0);
  const incompletos = imputados.filter((g) => !g.documento_url || !g.justificante_pago_url || !g.fecha_pago || !g.numero_factura || !g.proveedor_cliente).length;
  const cubre = totalImputado >= (exp.importe_concedido || 0);

  const exportar = () => downloadExcel(`Relacion_gastos_${exp.temporada}.xlsx`, [{
    name: "Relación de gastos",
    rows: imputados.map((g, i) => ({
      "Nº": i + 1, "Proveedor": g.proveedor_cliente || "", "Concepto": g.concepto, "Nº factura": g.numero_factura || "",
      "Fecha factura": fmtDate(g.fecha_factura || g.fecha), "Importe factura (€)": g.cantidad, "Importe imputado (€)": importeDe(g),
      "Fecha pago": fmtDate(g.fecha_pago), "Factura adjunta": g.documento_url ? "Sí" : "No", "Justificante adjunto": g.justificante_pago_url ? "Sí" : "No",
    })),
  }]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndicadorCard label="Subvención a justificar" value={eur(exp.importe_concedido)} />
        <IndicadorCard label="Gastos imputados" value={eur(totalImputado)} tone={cubre ? "green" : "amber"} />
        <IndicadorCard label="Nº de gastos imputados" value={imputados.length} />
        <IndicadorCard label="Imputados sin completar" value={incompletos} tone={incompletos ? "red" : "green"} />
      </div>
      <p className="text-xs text-slate-500 flex items-start gap-1">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Marca los gastos que se justifican con esta subvención. Cada uno necesita factura, justificante de pago y fecha de pago: no basta con la factura.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setNuevo(true)} variant="outline"><Plus className="w-4 h-4 mr-2" /> Registrar gasto</Button>
        <Button onClick={exportar} disabled={!imputados.length} className="bg-orange-600 hover:bg-orange-700"><Download className="w-4 h-4 mr-2" /> Descargar relación numerada (Excel)</Button>
      </div>
      {gastos.length === 0 ? (
        <p className="text-center text-slate-400 py-10">Aún no hay gastos registrados en esta temporada.</p>
      ) : (
        <div className="overflow-x-auto border rounded-xl bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2">Imputar</th><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Proveedor</th>
                <th className="p-2 text-left">Concepto</th><th className="p-2 text-left">Nº factura</th><th className="p-2 text-right">Importe</th>
                <th className="p-2">Factura</th><th className="p-2">Justif.</th><th className="p-2 text-left">Pagado</th><th />
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <GastoRow key={g.id} g={g} imputado={g.subvencion_expediente_id === exp.id} onToggle={() => toggle(g)} onEdit={() => setEditing(g)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <GastoSubvencionDialog gasto={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      <NuevoGastoDialog open={nuevo} onClose={() => setNuevo(false)} temporada={exp.temporada} expedienteId={exp.id} onCreated={() => { setNuevo(false); load(); }} />
    </div>
  );
}