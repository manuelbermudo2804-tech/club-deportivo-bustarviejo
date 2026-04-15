import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, TrendingUp, TrendingDown, Euro, Users, PieChart, BarChart3, Target, Wallet, Pencil, Check, X, Download, ArrowLeftRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import { toast } from "sonner";

// ── DATOS INICIALES ──

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

// Partidas equilibradas: el club intermedia pero solo gana el margen
const INITIAL_PASSTHROUGH = [
  { nombre: "Lotería Navidad", ingreso: 13178, gasto: 12000 },
  { nombre: "Equipaciones (venta)", ingreso: 6800, gasto: 6800 },
  { nombre: "Equipaciones competición", ingreso: 450, gasto: 700 },
  { nombre: "Fiesta fin temporada", ingreso: 1000, gasto: 1200 },
];

// Ingresos NETOS del club (no tienen contrapartida directa)
const INITIAL_NET_INCOME = [
  { nombre: "Subvenciones (Ayto + CAM)", importe: 6800 },
  { nombre: "Publicidad / Patrocinios", importe: 2550 },
  { nombre: "Cuota socio (25€/familia)", importe: 2500 },
  { nombre: "Torneos", importe: 800 },
  { nombre: "Federación (devoluciones)", importe: 358 },
];

// Gastos NETOS del club (no tienen contrapartida directa de ingreso)
const INITIAL_NET_EXPENSES = [
  { nombre: "Federación + seguro accidente", importe: 12281 },
  { nombre: "Sueldos y salarios", importe: 11358 },
  { nombre: "Entrenadores", importe: 10535 },
  { nombre: "Seguros sociales", importe: 4730 },
  { nombre: "Provisión fondos", importe: 4000 },
  { nombre: "Gestoría", importe: 1400 },
  { nombre: "Gestión redes", importe: 1100 },
  { nombre: "Material deportivo", importe: 1000 },
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
const fmt = (n) => n.toLocaleString("es-ES");

export default function BudgetPlanner() {
  const [categories, setCategories] = useState(INITIAL_PLAYERS);
  const [passthrough, setPassthrough] = useState(INITIAL_PASSTHROUGH);
  const [netIncome, setNetIncome] = useState(INITIAL_NET_INCOME);
  const [netExpenses, setNetExpenses] = useState(INITIAL_NET_EXPENSES);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (section, key, field, currentValue) => {
    setEditing({ section, key, field });
    setEditValue(String(currentValue));
  };
  const saveEdit = () => {
    if (!editing) return;
    const val = Number(editValue) || 0;
    const { section, key, field } = editing;
    if (section === "categories") setCategories(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
    else if (section === "passthrough") setPassthrough(prev => prev.map((item, i) => i === key ? { ...item, [field]: val } : item));
    else if (section === "netIncome") setNetIncome(prev => prev.map((item, i) => i === key ? { ...item, importe: val } : item));
    else if (section === "netExpenses") setNetExpenses(prev => prev.map((item, i) => i === key ? { ...item, importe: val } : item));
    setEditing(null);
  };
  const cancelEdit = () => setEditing(null);

  // ── CÁLCULOS ──
  const totals = useMemo(() => {
    const cuotasTotal = Object.values(categories).reduce((sum, c) => sum + c.jugadores * c.cuota, 0);
    const totalJugadores = Object.values(categories).reduce((sum, c) => sum + c.jugadores, 0);

    const passthroughBenefit = passthrough.reduce((sum, p) => sum + (p.ingreso - p.gasto), 0);
    const passthroughIngreso = passthrough.reduce((sum, p) => sum + p.ingreso, 0);
    const passthroughGasto = passthrough.reduce((sum, p) => sum + p.gasto, 0);

    const netIncomeTotal = netIncome.reduce((sum, i) => sum + i.importe, 0);
    const netExpensesTotal = netExpenses.reduce((sum, e) => sum + e.importe, 0);

    // Dinero real disponible = cuotas + ingresos netos + beneficio de intermediación
    const dineroDisponible = cuotasTotal + netIncomeTotal + passthroughBenefit;
    // Gastos reales del club
    const gastoReal = netExpensesTotal;
    const resultado = dineroDisponible - gastoReal;

    return {
      cuotasTotal, totalJugadores,
      passthroughBenefit, passthroughIngreso, passthroughGasto,
      netIncomeTotal, netExpensesTotal,
      dineroDisponible, gastoReal, resultado,
    };
  }, [categories, passthrough, netIncome, netExpenses]);

  const cuotasPieData = useMemo(() =>
    Object.entries(categories).map(([name, data], i) => ({
      name, value: data.jugadores * data.cuota, color: COLORS[i % COLORS.length]
    }))
  , [categories]);

  const ingresosNetosBarData = useMemo(() => [
    { name: "Cuotas", importe: totals.cuotasTotal },
    ...netIncome.map(i => ({ name: i.nombre.length > 15 ? i.nombre.substring(0, 15) + "…" : i.nombre, importe: i.importe })),
    { name: "Beneficio intermediación", importe: totals.passthroughBenefit },
  ].filter(d => d.importe !== 0), [totals, netIncome]);

  const gastosTop = useMemo(() =>
    [...netExpenses].sort((a, b) => b.importe - a.importe).slice(0, 8)
  , [netExpenses]);

  // ── PDF ──
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Presupuesto Temporada 2026-2027", 20, 20);
    doc.setFontSize(10);
    doc.text(`CD Bustarviejo - Generado: ${new Date().toLocaleDateString("es-ES")}`, 20, 28);

    let y = 42;
    doc.setFontSize(13); doc.text("CUOTAS POR CATEGORIA", 20, y); y += 8;
    doc.setFontSize(9);
    Object.entries(categories).forEach(([name, data]) => {
      doc.text(`${name}: ${data.jugadores} jug. x ${data.cuota}EUR = ${fmt(data.jugadores * data.cuota)}EUR`, 25, y); y += 6;
    });
    doc.setFontSize(10); y += 2;
    doc.text(`Total cuotas: ${fmt(totals.cuotasTotal)}EUR`, 25, y); y += 12;

    doc.setFontSize(13); doc.text("PARTIDAS EQUILIBRADAS (intermediacion)", 20, y); y += 8;
    doc.setFontSize(9);
    passthrough.forEach(p => {
      const ben = p.ingreso - p.gasto;
      doc.text(`${p.nombre}: Ingresa ${fmt(p.ingreso)}EUR - Gasta ${fmt(p.gasto)}EUR = Beneficio ${ben >= 0 ? "+" : ""}${fmt(ben)}EUR`, 25, y); y += 6;
    });
    doc.setFontSize(10); y += 2;
    doc.text(`Beneficio neto intermediacion: ${totals.passthroughBenefit >= 0 ? "+" : ""}${fmt(totals.passthroughBenefit)}EUR`, 25, y); y += 12;

    doc.setFontSize(13); doc.text("INGRESOS NETOS DEL CLUB", 20, y); y += 8;
    doc.setFontSize(9);
    netIncome.forEach(i => { doc.text(`${i.nombre}: ${fmt(i.importe)}EUR`, 25, y); y += 6; });
    doc.setFontSize(10); y += 2;
    doc.text(`Total ingresos netos: ${fmt(totals.netIncomeTotal)}EUR`, 25, y); y += 12;

    doc.setFontSize(13); doc.text("GASTOS REALES DEL CLUB", 20, y); y += 8;
    doc.setFontSize(9);
    netExpenses.forEach(e => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${e.nombre}: ${fmt(e.importe)}EUR`, 25, y); y += 6;
    });
    doc.setFontSize(10); y += 2;
    doc.text(`Total gastos reales: ${fmt(totals.gastoReal)}EUR`, 25, y); y += 14;

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.text("RESUMEN FINAL", 20, y); y += 8;
    doc.setFontSize(10);
    doc.text(`Dinero disponible (cuotas + ingresos + intermediacion): ${fmt(totals.dineroDisponible)}EUR`, 25, y); y += 7;
    doc.text(`Gastos reales del club: ${fmt(totals.gastoReal)}EUR`, 25, y); y += 10;
    doc.setFontSize(14);
    const res = totals.resultado;
    doc.text(`RESULTADO: ${res >= 0 ? "+" : ""}${fmt(res)}EUR ${res >= 0 ? "(SUPERAVIT)" : "(DEFICIT)"}`, 20, y);

    doc.save("presupuesto_2026-2027.pdf");
    toast.success("PDF descargado");
  };

  // ── COMPONENTE EDITABLE ──
  const EditableCell = ({ section, keyId, field, value, suffix = "€" }) => {
    const isEditing = editing?.section === section && editing?.key === keyId && editing?.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
            className="w-20 h-7 text-sm p-1" autoFocus
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }} />
          <button onClick={saveEdit} className="text-green-600"><Check className="w-4 h-4" /></button>
          <button onClick={cancelEdit} className="text-red-600"><X className="w-4 h-4" /></button>
        </div>
      );
    }
    return (
      <span className="cursor-pointer hover:bg-slate-100 px-1 rounded group inline-flex items-center gap-1"
        onClick={() => startEdit(section, keyId, field, value)}>
        {fmt(value)}{suffix}
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
        <h1 className="text-2xl md:text-3xl font-bold">📋 Presupuesto Temporada 2026-2027</h1>
        <p className="text-slate-300 mt-1 text-sm">Simulador interactivo — haz clic en cualquier número para editarlo</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">{totals.totalJugadores} jugadores</Badge>
          <Badge className={`${totals.resultado >= 0 ? "bg-green-500/20 text-green-200 border-green-400/30" : "bg-red-500/20 text-red-200 border-red-400/30"}`}>
            {totals.resultado >= 0 ? "Superávit" : "Déficit"}: {totals.resultado >= 0 ? "+" : ""}{fmt(totals.resultado)}€
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="p-4">
            <Euro className="w-6 h-6 mb-2 opacity-70" />
            <p className="text-xs text-blue-200">Cuotas</p>
            <p className="text-2xl font-bold">{fmt(totals.cuotasTotal)}€</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardContent className="p-4">
            <Wallet className="w-6 h-6 mb-2 opacity-70" />
            <p className="text-xs text-green-200">Dinero Disponible</p>
            <p className="text-2xl font-bold">{fmt(totals.dineroDisponible)}€</p>
            <p className="text-[10px] text-green-300 mt-1">Cuotas + ingresos + intermediación</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-gradient-to-br from-red-600 to-red-700 text-white">
          <CardContent className="p-4">
            <TrendingDown className="w-6 h-6 mb-2 opacity-70" />
            <p className="text-xs text-red-200">Gastos Reales</p>
            <p className="text-2xl font-bold">{fmt(totals.gastoReal)}€</p>
            <p className="text-[10px] text-red-300 mt-1">Sin contar intermediación</p>
          </CardContent>
        </Card>
        <Card className={`border-none shadow-lg text-white ${totals.resultado >= 0 ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-orange-600 to-red-700"}`}>
          <CardContent className="p-4">
            <Target className="w-6 h-6 mb-2 opacity-70" />
            <p className="text-xs opacity-80">Resultado</p>
            <p className="text-2xl font-bold">{totals.resultado >= 0 ? "+" : ""}{fmt(totals.resultado)}€</p>
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
                  <tr key={name} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{name}</td>
                    <td className="p-2 text-center">
                      <EditableCell section="categories" keyId={name} field="jugadores" value={data.jugadores} suffix="" />
                    </td>
                    <td className="p-2 text-center">
                      <EditableCell section="categories" keyId={name} field="cuota" value={data.cuota} />
                    </td>
                    <td className="p-2 text-right font-bold text-blue-700">{fmt(data.jugadores * data.cuota)}€</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-bold">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">{totals.totalJugadores}</td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right text-blue-800">{fmt(totals.cuotasTotal)}€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                <Pie data={cuotasPieData.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {cuotasPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={v => `${fmt(v)}€`} />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Dinero Disponible vs Gastos Reales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[{ name: "Disponible", value: totals.dineroDisponible }, { name: "Gastos", value: totals.gastoReal }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={v => `${fmt(v)}€`} />
                <Bar dataKey="value">
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ══ PARTIDAS EQUILIBRADAS ══ */}
      <Card className="border-2 border-amber-200 shadow-lg">
        <CardHeader className="bg-amber-50">
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-600" />
            Partidas Equilibradas (Intermediación)
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Dinero que entra y sale — solo cuenta el beneficio/pérdida neta
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-amber-50/50">
                  <th className="text-left p-2 font-semibold">Concepto</th>
                  <th className="text-center p-2 font-semibold text-green-700">Ingresa</th>
                  <th className="text-center p-2 font-semibold text-red-700">Gasta</th>
                  <th className="text-right p-2 font-semibold">Beneficio Neto</th>
                </tr>
              </thead>
              <tbody>
                {passthrough.map((p, i) => {
                  const ben = p.ingreso - p.gasto;
                  return (
                    <tr key={i} className="border-b hover:bg-amber-50/30">
                      <td className="p-2 font-medium">{p.nombre}</td>
                      <td className="p-2 text-center text-green-700">
                        <EditableCell section="passthrough" keyId={i} field="ingreso" value={p.ingreso} />
                      </td>
                      <td className="p-2 text-center text-red-700">
                        <EditableCell section="passthrough" keyId={i} field="gasto" value={p.gasto} />
                      </td>
                      <td className={`p-2 text-right font-bold ${ben >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {ben >= 0 ? "+" : ""}{fmt(ben)}€
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-amber-100 font-bold">
                  <td className="p-2">BENEFICIO NETO TOTAL</td>
                  <td className="p-2 text-center text-green-700">{fmt(totals.passthroughIngreso)}€</td>
                  <td className="p-2 text-center text-red-700">{fmt(totals.passthroughGasto)}€</td>
                  <td className={`p-2 text-right ${totals.passthroughBenefit >= 0 ? "text-green-800" : "text-red-800"}`}>
                    {totals.passthroughBenefit >= 0 ? "+" : ""}{fmt(totals.passthroughBenefit)}€
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ══ INGRESOS NETOS ══ */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Ingresos Netos del Club
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">Dinero que entra sin contrapartida directa de gasto</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {netIncome.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100">
                <span className="text-sm font-medium text-slate-700">{item.nombre}</span>
                <span className="font-bold text-green-700">
                  <EditableCell section="netIncome" keyId={i} field="importe" value={item.importe} />
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-green-200 rounded-lg font-bold">
              <span>TOTAL INGRESOS NETOS</span>
              <span className="text-green-800">{fmt(totals.netIncomeTotal)}€</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ GASTOS REALES ══ */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Gastos Reales del Club
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">Gastos propios — sin contar lo que se autofinancia (lotería, equipaciones...)</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {netExpenses.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100">
                <span className="text-sm font-medium text-slate-700">{item.nombre}</span>
                <span className="font-bold text-red-700">
                  <EditableCell section="netExpenses" keyId={i} field="importe" value={item.importe} />
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-red-200 rounded-lg font-bold">
              <span>TOTAL GASTOS REALES</span>
              <span className="text-red-800">{fmt(totals.gastoReal)}€</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top gastos gráfico */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-red-600" />
            Top 8 Gastos Reales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gastosTop} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `${fmt(v)}€`} />
              <Bar dataKey="importe" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ══ RESUMEN DESGLOSADO ══ */}
      <Card className="border-2 border-slate-300 shadow-xl">
        <CardHeader className="bg-slate-50">
          <CardTitle>🧮 Cómo se calcula el resultado</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3 text-sm max-w-xl mx-auto">
            <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">Cuotas de jugadores</span>
              <span className="font-bold text-blue-700">{fmt(totals.cuotasTotal)}€</span>
            </div>
            <div className="flex justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium">+ Ingresos netos</span>
              <span className="font-bold text-green-700">+{fmt(totals.netIncomeTotal)}€</span>
            </div>
            <div className={`flex justify-between p-3 rounded-lg ${totals.passthroughBenefit >= 0 ? "bg-emerald-50" : "bg-orange-50"}`}>
              <span className="font-medium">{totals.passthroughBenefit >= 0 ? "+" : ""} Beneficio intermediación</span>
              <span className={`font-bold ${totals.passthroughBenefit >= 0 ? "text-emerald-700" : "text-orange-700"}`}>
                {totals.passthroughBenefit >= 0 ? "+" : ""}{fmt(totals.passthroughBenefit)}€
              </span>
            </div>
            <div className="border-t border-slate-300 pt-2 flex justify-between p-3 bg-slate-100 rounded-lg font-bold">
              <span>= Dinero disponible</span>
              <span className="text-slate-800">{fmt(totals.dineroDisponible)}€</span>
            </div>
            <div className="flex justify-between p-3 bg-red-50 rounded-lg">
              <span className="font-medium">− Gastos reales del club</span>
              <span className="font-bold text-red-700">−{fmt(totals.gastoReal)}€</span>
            </div>
            <div className={`border-t-2 pt-3 flex justify-between p-4 rounded-xl font-bold text-lg ${totals.resultado >= 0 ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400"}`}>
              <span>= RESULTADO</span>
              <span className={totals.resultado >= 0 ? "text-green-800" : "text-red-800"}>
                {totals.resultado >= 0 ? "+" : ""}{fmt(totals.resultado)}€
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado final */}
      <Card className={`border-2 shadow-xl ${totals.resultado >= 0 ? "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50" : "border-red-300 bg-gradient-to-r from-red-50 to-orange-50"}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-600 mb-2">Resultado Final Temporada 2026-2027</p>
            <p className={`text-5xl font-black ${totals.resultado >= 0 ? "text-green-700" : "text-red-700"}`}>
              {totals.resultado >= 0 ? "+" : ""}{fmt(totals.resultado)}€
            </p>
            <p className={`text-lg mt-2 font-semibold ${totals.resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totals.resultado >= 0 ? "✅ SUPERÁVIT" : "❌ DÉFICIT"}
            </p>
            {totals.resultado > 0 && (
              <div className="mt-6 bg-white rounded-xl p-4 border border-green-200 max-w-lg mx-auto text-left">
                <p className="font-bold text-slate-800 mb-3">💡 Opciones para el superávit de {fmt(totals.resultado)}€:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg"><span>🚶</span><span>Acera de acceso al campo</span></div>
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg"><span>🛡️</span><span>Mejora de vallas perimetrales</span></div>
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg"><span>🏋️</span><span>Zona de preparación física</span></div>
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg"><span>🏦</span><span>Fondo de reserva para imprevistos</span></div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botón exportar */}
      <div className="flex justify-center gap-4 pb-8">
        <Button onClick={handleExportPDF} className="bg-slate-900 hover:bg-slate-800 px-8 py-6 text-lg shadow-xl">
          <Download className="w-5 h-5 mr-2" />
          Descargar PDF
        </Button>
      </div>
    </div>
  );
}