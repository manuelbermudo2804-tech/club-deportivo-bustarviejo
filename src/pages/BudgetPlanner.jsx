import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, TrendingUp, TrendingDown, Euro, Users, PieChart, BarChart3, Target, Wallet, Pencil, Check, X, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import { toast } from "sonner";

const INITIAL_PLAYERS = {
  "Aficionado": { jugadores: 24, cuota: 360 },
  "Juvenil": { jugadores: 17, cuota: 350 },
  "Cadete": { jugadores: 17, cuota: 350 },
  "Infantil": { jugadores: 19, cuota: 301 },
  "Alevín": { jugadores: 15, cuota: 301 },
  "Benjamín": { jugadores: 14, cuota: 270 },
  "Prebenjamín": { jugadores: 4, cuota: 270 },
  "Femenino": { jugadores: 15, cuota: 350 },
  "Baloncesto": { jugadores: 12, cuota: 235 },
};

const INITIAL_OTHER_INCOME = [
  { nombre: "Lotería Navidad", importe: 13178 },
  { nombre: "Subvenciones (Ayto + CAM)", importe: 6800 },
  { nombre: "Venta equipaciones", importe: 6800 },
  { nombre: "Publicidad / Patrocinios", importe: 2550 },
  { nombre: "Cuota socio (25€/familia)", importe: 2500 },
  { nombre: "Fiesta fin temporada", importe: 1000 },
  { nombre: "Torneos", importe: 800 },
  { nombre: "Equipaciones competición", importe: 450 },
  { nombre: "Federación (devoluciones)", importe: 358 },
];

const INITIAL_EXPENSES = [
  { nombre: "Lotería (compra décimos)", importe: 12000 },
  { nombre: "Federación + seguro accidente", importe: 12281 },
  { nombre: "Sueldos y salarios", importe: 11358 },
  { nombre: "Entrenadores", importe: 10535 },
  { nombre: "Otras equipaciones", importe: 6800 },
  { nombre: "Seguros sociales", importe: 4730 },
  { nombre: "Provisión fondos", importe: 4000 },
  { nombre: "Gestoría", importe: 1400 },
  { nombre: "Fiesta fin temporada", importe: 1200 },
  { nombre: "Gestión redes", importe: 1100 },
  { nombre: "Material deportivo", importe: 1000 },
  { nombre: "Equipaciones competición", importe: 700 },
  { nombre: "Comisiones bancarias", importe: 650 },
  { nombre: "Retenciones", importe: 375 },
  { nombre: "Riesgos laborales", importe: 350 },
  { nombre: "Seguro RC", importe: 297 },
  { nombre: "Cabalgata Reyes", importe: 200 },
  { nombre: "Web + dominio", importe: 180 },
  { nombre: "Obsequios socios", importe: 180 },
  { nombre: "Papelería", importe: 70 },
  { nombre: "Tasas CAM", importe: 50 },
];

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#6366f1"];

export default function BudgetPlanner() {
  const [categories, setCategories] = useState(INITIAL_PLAYERS);
  const [otherIncome, setOtherIncome] = useState(INITIAL_OTHER_INCOME);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [editing, setEditing] = useState(null); // {section, index, field}
  const [editValue, setEditValue] = useState("");

  const startEdit = (section, key, field, currentValue) => {
    setEditing({ section, key, field });
    setEditValue(String(currentValue));
  };
  const saveEdit = () => {
    if (!editing) return;
    const val = Number(editValue) || 0;
    if (editing.section === "categories") {
      setCategories(prev => ({ ...prev, [editing.key]: { ...prev[editing.key], [editing.field]: val } }));
    } else if (editing.section === "otherIncome") {
      setOtherIncome(prev => prev.map((item, i) => i === editing.key ? { ...item, importe: val } : item));
    } else if (editing.section === "expenses") {
      setExpenses(prev => prev.map((item, i) => i === editing.key ? { ...item, importe: val } : item));
    }
    setEditing(null);
  };
  const cancelEdit = () => setEditing(null);

  const totals = useMemo(() => {
    const cuotasTotal = Object.values(categories).reduce((sum, c) => sum + c.jugadores * c.cuota, 0);
    const totalJugadores = Object.values(categories).reduce((sum, c) => sum + c.jugadores, 0);
    const otherIncomeTotal = otherIncome.reduce((sum, i) => sum + i.importe, 0);
    const totalIngresos = cuotasTotal + otherIncomeTotal;
    const totalGastos = expenses.reduce((sum, e) => sum + e.importe, 0);
    const resultado = totalIngresos - totalGastos;
    return { cuotasTotal, totalJugadores, otherIncomeTotal, totalIngresos, totalGastos, resultado };
  }, [categories, otherIncome, expenses]);

  const cuotasPieData = useMemo(() =>
    Object.entries(categories).map(([name, data], i) => ({
      name, value: data.jugadores * data.cuota, color: COLORS[i % COLORS.length]
    }))
  , [categories]);

  const ingresosBarData = useMemo(() => [
    { name: "Cuotas", importe: totals.cuotasTotal },
    ...otherIncome.filter(i => i.importe > 500).map(i => ({ name: i.nombre.split(" ")[0], importe: i.importe })),
  ], [totals.cuotasTotal, otherIncome]);

  const gastosTop = useMemo(() =>
    [...expenses].sort((a, b) => b.importe - a.importe).slice(0, 8)
  , [expenses]);

  const balancePieData = useMemo(() => [
    { name: "Cuotas jugadores", value: totals.cuotasTotal, color: "#3b82f6" },
    { name: "Otros ingresos", value: totals.otherIncomeTotal, color: "#22c55e" },
    { name: "Gastos", value: totals.totalGastos, color: "#ef4444" },
  ], [totals]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Presupuesto Temporada 2025-2026", 20, 20);
    doc.setFontSize(10);
    doc.text(`CD Bustarviejo - Generado: ${new Date().toLocaleDateString("es-ES")}`, 20, 28);

    let y = 40;
    doc.setFontSize(13);
    doc.text("CUOTAS POR CATEGORÍA", 20, y); y += 8;
    doc.setFontSize(9);
    Object.entries(categories).forEach(([name, data]) => {
      doc.text(`${name}: ${data.jugadores} jug. x ${data.cuota}€ = ${(data.jugadores * data.cuota).toLocaleString("es-ES")}€`, 25, y);
      y += 6;
    });
    doc.setFontSize(10);
    y += 2;
    doc.text(`Total cuotas: ${totals.cuotasTotal.toLocaleString("es-ES")}€`, 25, y); y += 10;

    doc.setFontSize(13);
    doc.text("OTROS INGRESOS", 20, y); y += 8;
    doc.setFontSize(9);
    otherIncome.forEach(i => { doc.text(`${i.nombre}: ${i.importe.toLocaleString("es-ES")}€`, 25, y); y += 6; });
    doc.setFontSize(10);
    y += 2;
    doc.text(`Total otros ingresos: ${totals.otherIncomeTotal.toLocaleString("es-ES")}€`, 25, y); y += 10;

    doc.setFontSize(13);
    doc.text("GASTOS", 20, y); y += 8;
    doc.setFontSize(9);
    expenses.forEach(e => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${e.nombre}: ${e.importe.toLocaleString("es-ES")}€`, 25, y); y += 6;
    });
    doc.setFontSize(10);
    y += 2;
    doc.text(`Total gastos: ${totals.totalGastos.toLocaleString("es-ES")}€`, 25, y); y += 12;

    doc.setFontSize(14);
    const res = totals.resultado;
    doc.text(`RESULTADO: ${res >= 0 ? "+" : ""}${res.toLocaleString("es-ES")}€ ${res >= 0 ? "(SUPERÁVIT)" : "(DÉFICIT)"}`, 20, y);

    doc.save("presupuesto_2025-2026.pdf");
    toast.success("PDF descargado");
  };

  const EditableCell = ({ section, keyId, field, value, suffix = "€" }) => {
    const isEditing = editing?.section === section && editing?.key === keyId && editing?.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="w-20 h-7 text-sm p-1"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
          />
          <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
          <button onClick={cancelEdit} className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
        </div>
      );
    }
    return (
      <span
        className="cursor-pointer hover:bg-slate-100 px-1 rounded group inline-flex items-center gap-1"
        onClick={() => startEdit(section, keyId, field, value)}
      >
        {typeof value === "number" ? value.toLocaleString("es-ES") : value}{suffix}
        <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    );
  };

  return (
    <div className="min-h-screen overflow-y-auto p-4 md:p-6 space-y-6 pb-28">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("TreasurerFinancialPanel") + "?tab=presupuestos"}>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">📋 Presupuesto Temporada 2025-2026</h1>
        <p className="text-slate-300 mt-1 text-sm">Simulador interactivo — haz clic en cualquier número para editarlo</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">{totals.totalJugadores} jugadores</Badge>
          <Badge className={`${totals.resultado >= 0 ? "bg-green-500/20 text-green-200 border-green-400/30" : "bg-red-500/20 text-red-200 border-red-400/30"}`}>
            {totals.resultado >= 0 ? "Superávit" : "Déficit"}: {totals.resultado >= 0 ? "+" : ""}{totals.resultado.toLocaleString("es-ES")}€
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="p-4">
            <Euro className="w-6 h-6 mb-2 opacity-70" />
            <p className="text-xs text-blue-200">Cuotas</p>
            <p className="text-2xl font-bold">{totals.cuotasTotal.toLocaleString("es-ES")}€</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardContent className="p-4">
            <Wallet className="w-6 h-6 mb-2 opacity-70" />
            <p className="text-xs text-green-200">Total Ingresos</p>
            <p className="text-2xl font-bold">{totals.totalIngresos.toLocaleString("es-ES")}€</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-gradient-to-br from-red-600 to-red-700 text-white">
          <CardContent className="p-4">
            <TrendingDown className="w-6 h-6 mb-2 opacity-70" />
            <p className="text-xs text-red-200">Total Gastos</p>
            <p className="text-2xl font-bold">{totals.totalGastos.toLocaleString("es-ES")}€</p>
          </CardContent>
        </Card>
        <Card className={`border-none shadow-lg text-white ${totals.resultado >= 0 ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-orange-600 to-red-700"}`}>
          <CardContent className="p-4">
            <Target className="w-6 h-6 mb-2 opacity-70" />
            <p className="text-xs opacity-80">Resultado</p>
            <p className="text-2xl font-bold">{totals.resultado >= 0 ? "+" : ""}{totals.resultado.toLocaleString("es-ES")}€</p>
          </CardContent>
        </Card>
      </div>

      {/* Cuotas por categoría */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Cuotas por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-2 font-semibold">Categoría</th>
                  <th className="text-center p-2 font-semibold">Jugadores</th>
                  <th className="text-center p-2 font-semibold">Cuota</th>
                  <th className="text-right p-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categories).map(([name, data]) => (
                  <tr key={name} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-2 font-medium">{name}</td>
                    <td className="p-2 text-center">
                      <EditableCell section="categories" keyId={name} field="jugadores" value={data.jugadores} suffix="" />
                    </td>
                    <td className="p-2 text-center">
                      <EditableCell section="categories" keyId={name} field="cuota" value={data.cuota} suffix="€" />
                    </td>
                    <td className="p-2 text-right font-bold text-blue-700">
                      {(data.jugadores * data.cuota).toLocaleString("es-ES")}€
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-bold">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">{totals.totalJugadores}</td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right text-blue-800">{totals.cuotasTotal.toLocaleString("es-ES")}€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie cuotas */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="w-5 h-5 text-purple-600" />
              Distribución de Cuotas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RePieChart>
                <Pie data={cuotasPieData.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {cuotasPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={v => `${v.toLocaleString("es-ES")}€`} />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar ingresos vs gastos */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Balance General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[{ name: "Ingresos", value: totals.totalIngresos }, { name: "Gastos", value: totals.totalGastos }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={v => `${v.toLocaleString("es-ES")}€`} />
                <Bar dataKey="value" fill="#3b82f6">
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Otros ingresos */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Otros Ingresos (No-Cuota)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {otherIncome.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <span className="text-sm font-medium text-slate-700">{item.nombre}</span>
                <span className="font-bold text-green-700">
                  <EditableCell section="otherIncome" keyId={i} field="importe" value={item.importe} />
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-green-200 rounded-lg font-bold">
              <span>TOTAL OTROS INGRESOS</span>
              <span className="text-green-800">{totals.otherIncomeTotal.toLocaleString("es-ES")}€</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gastos */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {expenses.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <span className="text-sm font-medium text-slate-700">{item.nombre}</span>
                <span className="font-bold text-red-700">
                  <EditableCell section="expenses" keyId={i} field="importe" value={item.importe} />
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-red-200 rounded-lg font-bold">
              <span>TOTAL GASTOS</span>
              <span className="text-red-800">{totals.totalGastos.toLocaleString("es-ES")}€</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top gastos gráfico */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-red-600" />
            Top 8 Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gastosTop} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="nombre" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `${v.toLocaleString("es-ES")}€`} />
              <Bar dataKey="importe" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resultado final */}
      <Card className={`border-2 shadow-xl ${totals.resultado >= 0 ? "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50" : "border-red-300 bg-gradient-to-r from-red-50 to-orange-50"}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-600 mb-2">Resultado Final Temporada 2025-2026</p>
            <p className={`text-5xl font-black ${totals.resultado >= 0 ? "text-green-700" : "text-red-700"}`}>
              {totals.resultado >= 0 ? "+" : ""}{totals.resultado.toLocaleString("es-ES")}€
            </p>
            <p className={`text-lg mt-2 font-semibold ${totals.resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totals.resultado >= 0 ? "✅ SUPERÁVIT" : "❌ DÉFICIT"}
            </p>
            {totals.resultado > 0 && (
              <div className="mt-6 bg-white rounded-xl p-4 border border-green-200 max-w-lg mx-auto text-left">
                <p className="font-bold text-slate-800 mb-3">💡 Opciones para el superávit de {totals.resultado.toLocaleString("es-ES")}€:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                    <span>🚶</span>
                    <span>Acera de acceso al campo</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                    <span>🛡️</span>
                    <span>Mejora de vallas perimetrales</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                    <span>🏋️</span>
                    <span>Zona de preparación física</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
                    <span>🏦</span>
                    <span>Fondo de reserva para imprevistos</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botón exportar */}
      <div className="flex justify-center pb-8">
        <Button onClick={handleExportPDF} className="bg-slate-900 hover:bg-slate-800 px-8 py-6 text-lg shadow-xl">
          <Download className="w-5 h-5 mr-2" />
          Descargar Presupuesto PDF
        </Button>
      </div>
    </div>
  );
}