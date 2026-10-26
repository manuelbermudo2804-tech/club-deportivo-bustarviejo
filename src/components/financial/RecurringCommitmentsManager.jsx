import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarClock, Plus, Save, Trash2, Wallet, AlertTriangle } from "lucide-react";

const CATEGORIES = ["Personal", "Federación", "Arbitrajes", "Seguros", "Suministros", "Instalaciones", "Material Deportivo", "Marketing", "Otros Gastos"];
const PERIODS = [
  { value: "mensual", label: "Mensual" },
  { value: "bimestral", label: "Cada 2 meses" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];
const emptyForm = () => ({
  nombre: "", tercero: "", categoria: "Personal", subcategoria: "", importe: "",
  periodicidad: "mensual", fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: "", dia_pago: "1", activo: true, notas: ""
});
const euro = (value) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value || 0);

function countOccurrences(item, from, months) {
  let count = 0;
  for (let i = 0; i < months; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const start = item.fecha_inicio ? new Date(item.fecha_inicio + "T00:00:00") : null;
    const end = item.fecha_fin ? new Date(item.fecha_fin + "T23:59:59") : null;
    if (start && d < new Date(start.getFullYear(), start.getMonth(), 1)) continue;
    if (end && d > new Date(end.getFullYear(), end.getMonth(), 1)) continue;
    const interval = ({ mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 })[item.periodicidad] || 1;
    const monthDiff = (d.getFullYear() - (start?.getFullYear() || from.getFullYear())) * 12 + d.getMonth() - (start?.getMonth() || from.getMonth());
    if (monthDiff >= 0 && monthDiff % interval === 0) count++;
  }
  return count;
}

export default function RecurringCommitmentsManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data: commitments = [], isLoading, error } = useQuery({
    queryKey: ["recurringFinancialCommitments"],
    queryFn: () => base44.entities.RecurringFinancialCommitment.list(),
    staleTime: 30000,
  });

  const active = useMemo(() => commitments.filter(x => x.activo !== false), [commitments]);
  const monthlyEquivalent = useMemo(() => active.reduce((sum, item) => {
    const divisor = ({ mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 })[item.periodicidad] || 1;
    return sum + (Number(item.importe) || 0) / divisor;
  }, 0), [active]);
  const next12Months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
      const amount = active.reduce((sum, item) => sum + (Number(item.importe) || 0) * countOccurrences(item, date, 1), 0);
      return { label: date.toLocaleDateString("es-ES", { month: "short", year: "numeric" }), amount };
    });
  }, [active]);
  const total12Months = next12Months.reduce((sum, month) => sum + month.amount, 0);

  const save = async () => {
    if (!form?.nombre?.trim() || !form?.fecha_inicio || !(Number(form.importe) > 0)) {
      toast.error("Indica nombre, importe positivo y fecha de inicio.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        nombre: form.nombre.trim(),
        tercero: form.tercero?.trim() || "",
        subcategoria: form.subcategoria?.trim() || "",
        importe: Number(form.importe),
        dia_pago: Number(form.dia_pago) || 1,
        fecha_fin: form.fecha_fin || undefined,
      };
      if (form.id) {
        await base44.entities.RecurringFinancialCommitment.update(form.id, payload);
        toast.success("Compromiso actualizado");
      } else {
        await base44.entities.RecurringFinancialCommitment.create(payload);
        toast.success("Compromiso recurrente creado");
      }
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ["recurringFinancialCommitments"] });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar el compromiso");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await base44.entities.RecurringFinancialCommitment.update(item.id, { activo: item.activo === false });
      await queryClient.invalidateQueries({ queryKey: ["recurringFinancialCommitments"] });
      toast.success(item.activo === false ? "Compromiso reactivado" : "Compromiso desactivado");
    } catch (e) {
      toast.error("No se pudo actualizar el compromiso");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Compromisos activos</p><p className="mt-1 text-2xl font-bold">{active.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Coste mensual equivalente</p><p className="mt-1 text-2xl font-bold">{euro(monthlyEquivalent)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Compromisos previstos · 12 meses</p><p className="mt-1 text-2xl font-bold">{euro(total12Months)}</p></CardContent></Card>
      </div>

      <Card className="border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-orange-600" />Pagos recurrentes del club</CardTitle>
          <Button onClick={() => setForm(emptyForm())} className="bg-orange-600 hover:bg-orange-700"><Plus className="mr-2 h-4 w-4" />Añadir compromiso</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" /><p>Registra aquí sueldos, asignaciones de entrenadores, seguros y otros pagos habituales. Esta lista calcula compromisos previstos; todavía no equivale al dinero disponible para gastar. Para eso hay que cruzarla con los saldos bancarios y los ingresos confirmados.</p></div>
          </div>
          {form && (
            <div className="rounded-xl border bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold">{form.id ? "Editar compromiso" : "Nuevo compromiso recurrente"}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><label className="mb-1 block text-sm">Concepto *</label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Sueldo coordinador" /></div>
                <div><label className="mb-1 block text-sm">Persona / proveedor</label><Input value={form.tercero} onChange={e => setForm({ ...form, tercero: e.target.value })} placeholder="Nombre" /></div>
                <div><label className="mb-1 block text-sm">Importe por pago (€) *</label><Input type="number" min="0" step="0.01" value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm">Categoría</label><Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div><label className="mb-1 block text-sm">Periodicidad</label><Select value={form.periodicidad} onValueChange={v => setForm({ ...form, periodicidad: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                <div><label className="mb-1 block text-sm">Día previsto de pago</label><Input type="number" min="1" max="31" value={form.dia_pago} onChange={e => setForm({ ...form, dia_pago: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm">Fecha de inicio *</label><Input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm">Fecha de fin (opcional)</label><Input type="date" value={form.fecha_fin || ""} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm">Detalle</label><Input value={form.subcategoria} onChange={e => setForm({ ...form, subcategoria: e.target.value })} placeholder="Asignación mensual" /></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-sm">Notas</label><Input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Condiciones, variaciones o aclaraciones" /></div>
              </div>
              <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700"><Save className="mr-2 h-4 w-4" />{saving ? "Guardando..." : "Guardar compromiso"}</Button></div>
            </div>
          )}
          {isLoading ? <p className="py-6 text-center text-slate-500">Cargando compromisos…</p> : error ? <p className="py-6 text-center text-red-600">No se pudieron cargar los compromisos.</p> : active.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center"><Wallet className="mx-auto mb-2 h-10 w-10 text-slate-400" /><p className="font-semibold">Todavía no hay pagos recurrentes registrados</p><p className="mt-1 text-sm text-slate-500">Empieza por el coordinador y las asignaciones mensuales de los entrenadores.</p></div> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Concepto</th><th className="p-3">Categoría</th><th className="p-3">Periodicidad</th><th className="p-3 text-right">Importe</th><th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody>{commitments.map(item => <tr key={item.id} className="border-b last:border-0"><td className="p-3"><div className="font-medium">{item.nombre}</div><div className="text-xs text-slate-500">{item.tercero || item.subcategoria || "Sin detalle"}</div></td><td className="p-3">{item.categoria}</td><td className="p-3">{PERIODS.find(p => p.value === item.periodicidad)?.label || item.periodicidad}</td><td className="p-3 text-right font-semibold">{euro(item.importe)}</td><td className="p-3"><Badge variant={item.activo === false ? "secondary" : "default"}>{item.activo === false ? "Inactivo" : "Activo"}</Badge></td><td className="p-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setForm({ ...item, importe: String(item.importe), dia_pago: String(item.dia_pago || 1) })}>Editar</Button><Button size="sm" variant="ghost" onClick={() => toggleActive(item)}><Trash2 className="mr-1 h-4 w-4" />{item.activo === false ? "Reactivar" : "Desactivar"}</Button></div></td></tr>)}</tbody></table></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compromisos previstos por mes</CardTitle></CardHeader>
        <CardContent><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{next12Months.map(month => <div key={month.label} className="rounded-lg border p-3"><p className="text-xs capitalize text-slate-500">{month.label}</p><p className="mt-1 text-lg font-semibold">{euro(month.amount)}</p></div>)}</div><p className="mt-3 text-xs text-slate-500">Estimación basada únicamente en los compromisos activos registrados. No incluye aún gastos puntuales, ingresos previstos ni saldos bancarios.</p></CardContent>
      </Card>
    </div>
  );
}
