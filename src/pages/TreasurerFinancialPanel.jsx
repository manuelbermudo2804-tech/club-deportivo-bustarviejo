import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  CreditCard, ShoppingBag, Users, TrendingUp, TrendingDown, 
  Download, Euro, Clover, Building2, DollarSign, FileText,
  Calendar, CheckCircle2, Clock, AlertCircle, BarChart3, Sparkles, Plus,
  PieChart, Target, Award
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import BudgetManager from "../components/financial/BudgetManager";
import TransactionList from "../components/financial/TransactionList";
import TransactionForm from "../components/financial/TransactionForm";
import AIFinancialForecasting from "../components/financial/AIFinancialForecasting";
import TopDebtorsPanel from "../components/financial/TopDebtorsPanel";
import MonthlyEvolutionChart from "../components/financial/MonthlyEvolutionChart";
import CategoryBreakdown from "../components/financial/CategoryBreakdown";
import FinancialAlerts from "../components/financial/FinancialAlerts";
import IncomeProjection from "../components/financial/IncomeProjection";
import SeasonComparison from "../components/financial/SeasonComparison";
import IncomeDistributionPie from "../components/financial/IncomeDistributionPie";
import EndOfSeasonForecast from "../components/financial/EndOfSeasonForecast";
import FinancialGoalsTracker from "../components/financial/FinancialGoalsTracker";
import FinancialHealthIndicator from "../components/financial/FinancialHealthIndicator";
import AutomaticMorosidadAlert from "../components/financial/AutomaticMorosidadAlert";

export default function TreasurerFinancialPanel() {
  const [user, setUser] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("resumen");
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAIForecasting, setShowAIForecasting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [showSeasonComparison, setShowSeasonComparison] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.SeasonConfig.list(),
    staleTime: 600000, // 10 minutos
  });

  useEffect(() => {
    const active = seasonConfigs.find(s => s.activa === true);
    setActiveSeason(active);
  }, [seasonConfigs]);

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    staleTime: 60000, // 1 minuto
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 300000, // 5 minutos
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrders'],
    queryFn: () => base44.entities.ClothingOrder.list(),
    staleTime: 120000, // 2 minutos
  });

  const { data: lotteryOrders = [] } = useQuery({
    queryKey: ['lotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list(),
    staleTime: 120000, // 2 minutos
  });

  const { data: clubMembers = [] } = useQuery({
    queryKey: ['clubMembers'],
    queryFn: () => base44.entities.ClubMember.list(),
    staleTime: 300000, // 5 minutos
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => base44.entities.Sponsor.list(),
    staleTime: 600000, // 10 minutos
  });

  const { data: allSeasons = [] } = useQuery({
    queryKey: ['allSeasons'],
    queryFn: () => base44.entities.SeasonConfig.list(),
  });

  // Cargar presupuestos y transacciones solo si se activa su pestaña
  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list('-created_date'),
    staleTime: 300000, // 5 minutos
    enabled: activeTab === "presupuestos",
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.FinancialTransaction.list('-fecha'),
    staleTime: 120000, // 2 minutos
    enabled: activeTab === "transacciones" || activeTab === "presupuestos",
  });

  const currentBudget = useMemo(() => {
    if (!activeSeason || budgets.length === 0) return null;
    return budgets.find(b => b.temporada === activeSeason.temporada) || null;
  }, [activeSeason, budgets]);

  // Función para obtener importe por mes y categoría (igual que en Payments)
  const getImportePorMes = (deporte, mes) => {
    // Valores predeterminados si no hay configuración
    const defaultValues = {
      "Junio": 110,
      "Septiembre": 70,
      "Diciembre": 70
    };
    return defaultValues[mes] || 70;
  };

  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success("Presupuesto creado");
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success("Presupuesto actualizado");
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (id) => base44.entities.Budget.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success("Presupuesto eliminado");
    },
  });

  const handleCreateBudget = () => {
    if (!activeSeason) {
      toast.error("No hay temporada activa");
      return;
    }
    createBudgetMutation.mutate({
      temporada: activeSeason.temporada,
      nombre: `Presupuesto ${activeSeason.temporada}`,
      partidas: []
    });
  };

  const handleUpdateBudget = (data) => {
    if (!currentBudget) return;
    updateBudgetMutation.mutate({
      id: currentBudget.id,
      data
    });
  };

  // Cálculos financieros - Memoizados para mejor rendimiento
  const stats = useMemo(() => {
    if (!activeSeason) return {
      cuotasPagadas: 0, cuotasPendientes: 0, cuotasEnRevision: 0,
      ropaTotal: 0, ropaPagada: 0, ropaPendiente: 0,
      loteriaTotal: 0, loteriaPagada: 0, loteriaPendiente: 0,
      sociosTotal: 0, sociosPagados: 0, sociosPendientes: 0,
      patrociniosTotal: 0
    };

    const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason.temporada && p.is_deleted !== true);
    const currentSeasonPlayers = players.filter(p => p.activo === true);
    const currentSeasonClothing = clothingOrders.filter(o => o.temporada === activeSeason.temporada);
    const currentSeasonLottery = lotteryOrders.filter(o => o.temporada === activeSeason.temporada);
    const currentSeasonMembers = clubMembers.filter(m => m.temporada === activeSeason.temporada);

    // CÁLCULO DE PENDIENTES
    let totalPendiente = 0;
    currentSeasonPlayers.forEach(player => {
      const playerPayments = currentSeasonPayments.filter(p => p.jugador_id === player.id);
      
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        (p.estado === "Pagado" || p.estado === "En revisión")
      );
      
      if (hasPagoUnico) return;
      
      const mesesPagadosORevision = playerPayments
        .filter(p => (p.estado === "Pagado" || p.estado === "En revisión"))
        .map(p => p.mes);
      
      const allMonths = ["Junio", "Septiembre", "Diciembre"];
      const mesesFaltantes = allMonths.filter(mes => !mesesPagadosORevision.includes(mes));
      
      mesesFaltantes.forEach(mes => {
        totalPendiente += getImportePorMes(player.deporte, mes);
      });
    });

    return {
      cuotasPagadas: currentSeasonPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0),
      cuotasPendientes: totalPendiente,
      cuotasEnRevision: currentSeasonPayments.filter(p => p.estado === "En revisión").reduce((sum, p) => sum + (p.cantidad || 0), 0),
      
      ropaTotal: currentSeasonClothing.reduce((sum, o) => sum + (o.precio_final || 0), 0),
      ropaPagada: currentSeasonClothing.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.precio_final || 0), 0),
      ropaPendiente: currentSeasonClothing.filter(o => o.pagado === false).reduce((sum, o) => sum + (o.precio_final || 0), 0),
      
      loteriaTotal: currentSeasonLottery.reduce((sum, o) => sum + (o.total || 0), 0),
      loteriaPagada: currentSeasonLottery.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.total || 0), 0),
      loteriaPendiente: currentSeasonLottery.filter(o => o.pagado === false).reduce((sum, o) => sum + (o.total || 0), 0),
      
      sociosTotal: currentSeasonMembers.filter(m => m.activo !== false).reduce((sum, m) => sum + (m.cuota_pagada || 0), 0),
      sociosPagados: currentSeasonMembers.filter(m => m.estado_pago === "Pagado").reduce((sum, m) => sum + (m.cuota_pagada || 0), 0),
      sociosPendientes: currentSeasonMembers.filter(m => m.estado_pago === "Pendiente").reduce((sum, m) => sum + (m.cuota_pagada || 0), 0),
      
      patrociniosTotal: sponsors.filter(s => s.estado === "Activo" && s.temporada === activeSeason.temporada).reduce((sum, s) => sum + (s.monto || 0), 0),
    };
  }, [activeSeason, payments, players, clothingOrders, lotteryOrders, clubMembers, sponsors]);

  // TOTALES CORREGIDOS
  const totalIngresos = stats.cuotasPagadas + stats.ropaPagada + stats.loteriaPagada + stats.sociosPagados + stats.patrociniosTotal;
  const totalPendiente = stats.cuotasPendientes + stats.ropaPendiente + stats.loteriaPendiente + stats.sociosPendientes;
  const totalEsperado = totalIngresos + totalPendiente + stats.cuotasEnRevision;

  // Datos para gráficos
  const chartData = useMemo(() => {
    return [
      { name: 'Cuotas', Cobrado: stats.cuotasPagadas, Pendiente: stats.cuotasPendientes, EnRevision: stats.cuotasEnRevision },
      { name: 'Ropa', Cobrado: stats.ropaPagada, Pendiente: stats.ropaPendiente, EnRevision: 0 },
      { name: 'Lotería', Cobrado: stats.loteriaPagada, Pendiente: stats.loteriaPendiente, EnRevision: 0 },
      { name: 'Socios', Cobrado: stats.sociosPagados, Pendiente: stats.sociosPendientes, EnRevision: 0 },
      { name: 'Patrocinios', Cobrado: stats.patrociniosTotal, Pendiente: 0, EnRevision: 0 },
    ];
  }, [stats]);

  const pieData = useMemo(() => [
    { name: 'Cuotas', value: stats.cuotasPagadas, color: '#3b82f6' },
    { name: 'Ropa', value: stats.ropaPagada, color: '#f97316' },
    { name: 'Lotería', value: stats.loteriaPagada, color: '#22c55e' },
    { name: 'Socios', value: stats.sociosPagados, color: '#6366f1' },
    { name: 'Patrocinios', value: stats.patrociniosTotal, color: '#a855f7' },
  ], [stats]);

  const handleExportPDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Informe Financiero - CD Bustarviejo', 20, 20);
      doc.setFontSize(12);
      doc.text(`Temporada: ${activeSeason?.temporada || 'N/A'}`, 20, 30);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 37);
      
      // Resumen Global
      doc.setFontSize(14);
      doc.text('Resumen Global', 20, 50);
      doc.setFontSize(10);
      let y = 60;
      doc.text(`Total Ingresos Cobrados: ${totalIngresos.toFixed(2)}€`, 25, y);
      y += 7;
      doc.text(`Total Pendiente de Cobro: ${totalPendiente.toFixed(2)}€`, 25, y);
      y += 7;
      doc.text(`Total Esperado: ${totalEsperado.toFixed(2)}€`, 25, y);
      y += 15;
      
      // Desglose
      doc.setFontSize(14);
      doc.text('Desglose por Conceptos', 20, y);
      y += 10;
      doc.setFontSize(10);
      doc.text(`Cuotas: Cobradas ${stats.cuotasPagadas.toFixed(2)}€ | Pendientes ${stats.cuotasPendientes.toFixed(2)}€`, 25, y);
      y += 7;
      doc.text(`Ropa: Cobrada ${stats.ropaPagada.toFixed(2)}€ | Pendiente ${stats.ropaPendiente.toFixed(2)}€`, 25, y);
      y += 7;
      doc.text(`Lotería: Cobrada ${stats.loteriaPagada.toFixed(2)}€ | Pendiente ${stats.loteriaPendiente.toFixed(2)}€`, 25, y);
      y += 7;
      doc.text(`Socios: Cobrados ${stats.sociosPagados.toFixed(2)}€ | Pendientes ${stats.sociosPendientes.toFixed(2)}€`, 25, y);
      y += 7;
      doc.text(`Patrocinios: ${stats.patrociniosTotal.toFixed(2)}€`, 25, y);
      
      doc.save(`informe_financiero_${activeSeason?.temporada || 'actual'}.pdf`);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      toast.error("Error al generar PDF");
      console.error(error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    setGeneratingExcel(true);
    try {
      // Crear CSV con todos los datos
      let csv = "Concepto,Categoria,Jugadores,Esperado,Cobrado,Pendiente,En Revision,Tasa Cobro\n";
      
      // Resumen general
      csv += `RESUMEN GENERAL,Todas,${players.filter(p => p.activo).length},${totalEsperado.toFixed(2)},${totalIngresos.toFixed(2)},${totalPendiente.toFixed(2)},${stats.cuotasEnRevision.toFixed(2)},${(totalEsperado > 0 ? ((totalIngresos / totalEsperado) * 100) : 0).toFixed(1)}%\n`;
      csv += "\n";
      
      // Por concepto
      csv += `Cuotas,Jugadores,-,${(stats.cuotasPagadas + stats.cuotasPendientes + stats.cuotasEnRevision).toFixed(2)},${stats.cuotasPagadas.toFixed(2)},${stats.cuotasPendientes.toFixed(2)},${stats.cuotasEnRevision.toFixed(2)},-\n`;
      csv += `Ropa,Equipación,-,${stats.ropaTotal.toFixed(2)},${stats.ropaPagada.toFixed(2)},${stats.ropaPendiente.toFixed(2)},0,-\n`;
      csv += `Lotería,Navidad,-,${stats.loteriaTotal.toFixed(2)},${stats.loteriaPagada.toFixed(2)},${stats.loteriaPendiente.toFixed(2)},0,-\n`;
      csv += `Socios,Membresía,-,${stats.sociosTotal.toFixed(2)},${stats.sociosPagados.toFixed(2)},${stats.sociosPendientes.toFixed(2)},0,-\n`;
      csv += `Patrocinios,Comercial,-,${stats.patrociniosTotal.toFixed(2)},${stats.patrociniosTotal.toFixed(2)},0,0,-\n`;

      // Descargar
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `informe_financiero_${activeSeason?.temporada || 'actual'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success("Excel descargado correctamente");
    } catch (error) {
      toast.error("Error al generar Excel");
      console.error(error);
    } finally {
      setGeneratingExcel(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Alerta automática de morosidad */}
      <AutomaticMorosidadAlert 
        totalIngresos={totalIngresos}
        totalPendiente={totalPendiente}
        totalEsperado={totalEsperado}
      />

      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">💰 Panel Financiero</h1>
            <p className="text-slate-300 mt-1">Control total de ingresos, gastos y presupuestos</p>
            <div className="flex gap-2 mt-3">
              {activeSeason && (
                <Badge className="bg-green-600 text-white">
                  📅 {activeSeason.temporada}
                </Badge>
              )}
              <Badge className="bg-orange-600 text-white">
                {players.filter(p => p.activo).length} jugadores activos
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda la temporada</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="60">Últimos 60 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
                <SelectItem value="fiscal">Año fiscal</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => setShowSeasonComparison(true)}
              variant="outline"
              className="shadow-lg"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Comparar Temporadas
            </Button>
            <Button 
              onClick={handleExportPDF}
              disabled={generatingPDF}
              className="bg-red-600 hover:bg-red-700 shadow-lg"
            >
              <Download className="w-4 h-4 mr-2" />
              {generatingPDF ? 'Generando...' : 'PDF'}
            </Button>
            <Button 
              onClick={handleExportExcel}
              disabled={generatingExcel}
              className="bg-green-600 hover:bg-green-700 shadow-lg"
            >
              <FileText className="w-4 h-4 mr-2" />
              {generatingExcel ? 'Generando...' : 'Excel'}
            </Button>
            {activeTab === "presupuestos" && (
              <Button 
                onClick={() => setShowAIForecasting(true)}
                className="bg-purple-600 hover:bg-purple-700 shadow-lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Análisis IA
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
          <TabsTrigger value="resumen" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="presupuestos" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <Euro className="w-4 h-4" />
            <span className="hidden md:inline">Presupuestos</span>
          </TabsTrigger>
          <TabsTrigger value="transacciones" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden md:inline">Transacciones</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB RESUMEN */}
        <TabsContent value="resumen" className="space-y-6 mt-6">
          {/* Indicador de Salud Financiera */}
          <FinancialHealthIndicator 
            totalIngresos={totalIngresos}
            totalPendiente={totalPendiente}
            totalEsperado={totalEsperado}
            stats={stats}
          />

          {/* Alertas Financieras */}
          <FinancialAlerts 
            totalIngresos={totalIngresos}
            totalPendiente={totalPendiente}
            totalEsperado={totalEsperado}
            stats={stats}
          />

          {/* Resumen Global - Rediseñado */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Ingresos */}
            <Card className="border-none shadow-xl bg-gradient-to-br from-green-600 to-emerald-700 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle2 className="w-8 h-8 text-white/80" />
                  <TrendingUp className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-sm text-green-100 mb-1">Ingresos Cobrados</p>
                <p className="text-4xl font-bold">{totalIngresos.toFixed(2)}€</p>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <div className="flex items-center justify-between text-xs text-green-100">
                    <span>Tasa de cobro:</span>
                    <span className="font-bold">{totalEsperado > 0 ? ((totalIngresos / totalEsperado) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pendientes de Cobro */}
            <Card className="border-none shadow-xl bg-gradient-to-br from-orange-600 to-red-600 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="w-8 h-8 text-white/80" />
                  <AlertCircle className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-sm text-orange-100 mb-1">Pendiente de Cobro</p>
                <p className="text-4xl font-bold">{totalPendiente.toFixed(2)}€</p>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-orange-100">
                    {(() => {
                      if (!activeSeason) return '0 cuotas';
                      const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason.temporada && p.is_deleted !== true);
                      const currentSeasonPlayers = players.filter(p => p.activo === true);
                      let cuotasPendientes = 0;
                      currentSeasonPlayers.forEach(player => {
                        const playerPayments = currentSeasonPayments.filter(p => p.jugador_id === player.id);
                        const hasPagoUnico = playerPayments.some(p => 
                          (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
                          (p.estado === "Pagado" || p.estado === "En revisión")
                        );
                        if (hasPagoUnico) return;
                        const mesesPagadosORevision = playerPayments
                          .filter(p => (p.estado === "Pagado" || p.estado === "En revisión"))
                          .map(p => p.mes);
                        const allMonths = ["Junio", "Septiembre", "Diciembre"];
                        cuotasPendientes += allMonths.filter(mes => !mesesPagadosORevision.includes(mes)).length;
                      });
                      return `${cuotasPendientes} cuotas sin pagar`;
                    })()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* En Revisión */}
            <Card className="border-none shadow-xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="w-8 h-8 text-white/80" />
                  <TrendingUp className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-sm text-yellow-100 mb-1">En Revisión</p>
                <p className="text-4xl font-bold">{stats.cuotasEnRevision.toFixed(2)}€</p>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-yellow-100">
                    {(() => {
                      const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason?.temporada && p.is_deleted !== true);
                      return currentSeasonPayments.filter(p => p.estado === "En revisión").length;
                    })()} pagos esperando validación
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total Esperado */}
            <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-8 h-8 text-white/80" />
                  <BarChart3 className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-sm text-blue-100 mb-1">Total Esperado</p>
                <p className="text-4xl font-bold">{totalEsperado.toFixed(2)}€</p>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-blue-100">
                    100% del objetivo de temporada
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desglose por Conceptos - Mejorado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cuotas Jugadores */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Cuotas de Jugadores</CardTitle>
                      <p className="text-xs text-slate-500">Pagos de inscripción temporada</p>
                    </div>
                  </div>
                  <Link to={createPageUrl("Payments")}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Ver detalle →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-slate-700">✅ Cobradas</span>
                    <span className="text-lg font-bold text-green-700">{stats.cuotasPagadas.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm text-slate-700">⏳ En Revisión</span>
                    <span className="text-lg font-bold text-orange-700">{stats.cuotasEnRevision.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-slate-700">❌ Pendientes</span>
                    <span className="text-lg font-bold text-red-700">{stats.cuotasPendientes.toFixed(2)}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pedidos Ropa */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Equipación</CardTitle>
                      <p className="text-xs text-slate-500">Pedidos de ropa del club</p>
                    </div>
                  </div>
                  <Link to={createPageUrl("ClothingOrders")}>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                      Ver detalle →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">📦 Total Pedidos</span>
                    <span className="text-lg font-bold text-slate-700">{stats.ropaTotal.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-slate-700">✅ Cobrados</span>
                    <span className="text-lg font-bold text-green-700">{stats.ropaPagada.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-slate-700">❌ Pendientes</span>
                    <span className="text-lg font-bold text-red-700">{stats.ropaPendiente.toFixed(2)}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Socios */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Cuotas de Socios</CardTitle>
                      <p className="text-xs text-slate-500">Membresía anual del club</p>
                    </div>
                  </div>
                  <Link to={createPageUrl("ClubMembersManagement")}>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                      Ver detalle →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">📊 Total</span>
                    <span className="text-lg font-bold text-slate-700">{stats.sociosTotal.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-slate-700">✅ Cobradas</span>
                    <span className="text-lg font-bold text-green-700">{stats.sociosPagados.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-slate-700">❌ Pendientes</span>
                    <span className="text-lg font-bold text-red-700">{stats.sociosPendientes.toFixed(2)}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patrocinios */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Patrocinios</CardTitle>
                      <p className="text-xs text-slate-500">Colaboraciones comerciales</p>
                    </div>
                  </div>
                  <Link to={createPageUrl("Sponsorships")}>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      Ver detalle →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-slate-700">🏢 Activos</span>
                    <span className="text-lg font-bold text-purple-700">{sponsors.filter(s => s.estado === "Activo").length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-100 rounded-lg">
                    <span className="text-sm text-slate-700">💰 Total</span>
                    <span className="text-2xl font-bold text-purple-900">{stats.patrociniosTotal.toFixed(2)}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lotería (si está activa) */}
          {activeSeason?.loteria_navidad_abierta && (
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                      <Clover className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Lotería de Navidad</CardTitle>
                      <p className="text-xs text-slate-500">Número 28720</p>
                    </div>
                  </div>
                  <Link to={createPageUrl("LotteryManagement")}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Ver detalle →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-600 mb-1">Total</span>
                    <span className="text-xl font-bold text-slate-700">{stats.loteriaTotal.toFixed(0)}€</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-xs text-slate-600 mb-1">Cobrados</span>
                    <span className="text-xl font-bold text-green-700">{stats.loteriaPagada.toFixed(0)}€</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-xs text-slate-600 mb-1">Pendientes</span>
                    <span className="text-xl font-bold text-red-700">{stats.loteriaPendiente.toFixed(0)}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estadísticas de Jugadores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Estado de Jugadores y Cuotas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-700">{players.filter(p => p.activo).length}</p>
                  <p className="text-xs text-slate-600 mt-1">Jugadores Activos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {(() => {
                      const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason?.temporada && p.is_deleted !== true);
                      return currentSeasonPayments.filter(p => p.estado === "Pagado").length;
                    })()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Pagos Confirmados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-700">
                    {(() => {
                      const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason?.temporada && p.is_deleted !== true);
                      return currentSeasonPayments.filter(p => p.estado === "En revisión").length;
                    })()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">En Revisión</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {(() => {
                      if (!activeSeason) return 0;
                      const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason.temporada && p.is_deleted !== true);
                      const currentSeasonPlayers = players.filter(p => p.activo === true);
                      let cuotasPendientes = 0;
                      
                      currentSeasonPlayers.forEach(player => {
                        const playerPayments = currentSeasonPayments.filter(p => p.jugador_id === player.id);
                        const hasPagoUnico = playerPayments.some(p => 
                          (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
                          (p.estado === "Pagado" || p.estado === "En revisión")
                        );
                        if (hasPagoUnico) return;
                        
                        const mesesPagadosORevision = playerPayments
                          .filter(p => (p.estado === "Pagado" || p.estado === "En revisión"))
                          .map(p => p.mes);
                        
                        const allMonths = ["Junio", "Septiembre", "Diciembre"];
                        const mesesFaltantes = allMonths.filter(mes => !mesesPagadosORevision.includes(mes));
                        cuotasPendientes += mesesFaltantes.length;
                      });
                      
                      return cuotasPendientes;
                    })()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Cuotas Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accesos Rápidos - Rediseñado */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link to={createPageUrl("Payments")}>
              <div className="group bg-gradient-to-br from-blue-600 to-cyan-700 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
                <div className="flex flex-col items-center text-white text-center">
                  <CreditCard className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm">Gestionar Pagos</p>
                  <p className="text-xs text-blue-100 mt-1">Cuotas de inscripción</p>
                </div>
              </div>
            </Link>
            
            <Link to={createPageUrl("ClothingOrders")}>
              <div className="group bg-gradient-to-br from-orange-600 to-amber-700 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
                <div className="flex flex-col items-center text-white text-center">
                  <ShoppingBag className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm">Pedidos Ropa</p>
                  <p className="text-xs text-orange-100 mt-1">Equipación club</p>
                </div>
              </div>
            </Link>

            <Link to={createPageUrl("ClubMembersManagement")}>
              <div className="group bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
                <div className="flex flex-col items-center text-white text-center">
                  <Users className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm">Socios</p>
                  <p className="text-xs text-indigo-100 mt-1">Gestión membresía</p>
                </div>
              </div>
            </Link>

            {activeSeason?.loteria_navidad_abierta && (
              <Link to={createPageUrl("LotteryManagement")}>
                <div className="group bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
                  <div className="flex flex-col items-center text-white text-center">
                    <Clover className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-sm">Lotería</p>
                    <p className="text-xs text-green-100 mt-1">Número 28720</p>
                  </div>
                </div>
              </Link>
            )}

            <Link to={createPageUrl("PaymentHistory")}>
              <div className="group bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
                <div className="flex flex-col items-center text-white text-center">
                  <Calendar className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm">Histórico</p>
                  <p className="text-xs text-slate-200 mt-1">Pagos anteriores</p>
                </div>
              </div>
            </Link>

            <Link to={createPageUrl("PaymentReminders")}>
              <div className="group bg-gradient-to-br from-yellow-600 to-amber-700 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
                <div className="flex flex-col items-center text-white text-center">
                  <AlertCircle className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm">Recordatorios</p>
                  <p className="text-xs text-yellow-100 mt-1">Avisos de pago</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Gráficos de Análisis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico de Barras */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  Análisis por Concepto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                    <Legend />
                    <Bar dataKey="Cobrado" fill="#22c55e" />
                    <Bar dataKey="EnRevision" fill="#f59e0b" />
                    <Bar dataKey="Pendiente" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico Circular */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-600" />
                  Distribución de Ingresos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Avanzadas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Tasa de Cobro</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {totalEsperado > 0 ? ((totalIngresos / totalEsperado) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all"
                    style={{ width: `${totalEsperado > 0 ? ((totalIngresos / totalEsperado) * 100) : 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Ingreso Medio/Jugador</p>
                    <p className="text-2xl font-bold text-green-900">
                      {players.filter(p => p.activo).length > 0 
                        ? (totalIngresos / players.filter(p => p.activo).length).toFixed(2) 
                        : 0}€
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Total: {players.filter(p => p.activo).length} jugadores
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Morosidad</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {totalEsperado > 0 ? ((totalPendiente / totalEsperado) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {totalPendiente.toFixed(2)}€ sin cobrar
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Proyección de Ingresos */}
          <IncomeProjection 
            totalIngresos={totalIngresos}
            totalPendiente={totalPendiente}
            totalEsperado={totalEsperado}
            stats={stats}
          />

          {/* Evolución Mensual */}
          <MonthlyEvolutionChart 
            payments={payments}
            clothingOrders={clothingOrders}
            lotteryOrders={lotteryOrders}
            clubMembers={clubMembers}
            sponsors={sponsors}
            activeSeason={activeSeason}
          />

          {/* Top Deudores */}
          <TopDebtorsPanel 
            players={players}
            payments={payments}
            activeSeason={activeSeason}
            getImportePorMes={getImportePorMes}
          />

          {/* Desglose por Categorías */}
          <CategoryBreakdown 
            players={players}
            payments={payments}
            activeSeason={activeSeason}
            getImportePorMes={getImportePorMes}
          />

          {/* Distribución de Ingresos (Gráfico Pastel) */}
          <IncomeDistributionPie stats={stats} />

          {/* Predicción Fin de Temporada */}
          <EndOfSeasonForecast 
            totalIngresos={totalIngresos}
            totalPendiente={totalPendiente}
            totalEsperado={totalEsperado}
            stats={stats}
            activeSeason={activeSeason}
            payments={payments}
          />

          {/* Sistema de Metas/Objetivos */}
          <FinancialGoalsTracker 
            totalIngresos={totalIngresos}
            totalPendiente={totalPendiente}
            totalEsperado={totalEsperado}
            activeSeason={activeSeason}
          />

          {/* Información de Cuotas (Solo lectura) */}
          {activeSeason && (
            <Card className="border-2 border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-slate-600" />
                  Cuotas Configuradas (Solo Lectura)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Cuota Única</p>
                      <p className="text-2xl font-bold text-slate-900">{activeSeason.cuota_unica}€</p>
                      <p className="text-xs text-slate-500 mt-1">Pago único en Junio</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Cuota Fraccionada</p>
                      <p className="text-2xl font-bold text-slate-900">{activeSeason.cuota_tres_meses}€ <span className="text-sm text-slate-600">x 3</span></p>
                      <p className="text-xs text-slate-500 mt-1">Jun + Sep + Dic = {activeSeason.cuota_tres_meses * 3}€</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                      <strong>ℹ️ Nota:</strong> Para modificar las cuotas o configuración de temporadas, contacta al administrador del club.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB PRESUPUESTOS */}
        <TabsContent value="presupuestos" className="space-y-6 mt-6">
          {!currentBudget ? (
            <Card className="border-none shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Euro className="w-10 h-10 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  No hay presupuesto para {activeSeason?.temporada}
                </h3>
                <p className="text-slate-600 mb-6">
                  Crea un presupuesto para gestionar partidas de ingresos y gastos con ayuda de IA
                </p>
                <div className="max-w-md mx-auto mb-8">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="font-bold text-green-700">📊 Partidas</p>
                      <p className="text-xs text-slate-600 mt-1">Organiza ingresos y gastos</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="font-bold text-blue-700">🤖 IA</p>
                      <p className="text-xs text-slate-600 mt-1">Asistente inteligente</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="font-bold text-purple-700">📈 Análisis</p>
                      <p className="text-xs text-slate-600 mt-1">Seguimiento real</p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleCreateBudget}
                  className="bg-orange-600 hover:bg-orange-700 px-8 py-6 text-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Crear Presupuesto Ahora
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Resumen del Presupuesto */}
              <Card className="border-none shadow-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-slate-300 mb-1">Presupuesto Total</p>
                      <p className="text-3xl font-bold">
                        {currentBudget.partidas?.reduce((sum, p) => sum + (p.monto_presupuestado || 0), 0).toFixed(2)}€
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-green-300 mb-1">Ejecutado</p>
                      <p className="text-3xl font-bold text-green-400">
                        {currentBudget.partidas?.reduce((sum, p) => sum + (p.monto_ejecutado || 0), 0).toFixed(2)}€
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-orange-300 mb-1">Desviación</p>
                      <p className="text-3xl font-bold text-orange-400">
                        {(() => {
                          const presupuestado = currentBudget.partidas?.reduce((sum, p) => sum + (p.monto_presupuestado || 0), 0) || 0;
                          const ejecutado = currentBudget.partidas?.reduce((sum, p) => sum + (p.monto_ejecutado || 0), 0) || 0;
                          return (ejecutado - presupuestado).toFixed(2);
                        })()}€
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-blue-300 mb-1">% Ejecución</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {(() => {
                          const presupuestado = currentBudget.partidas?.reduce((sum, p) => sum + (p.monto_presupuestado || 0), 0) || 0;
                          const ejecutado = currentBudget.partidas?.reduce((sum, p) => sum + (p.monto_ejecutado || 0), 0) || 0;
                          return presupuestado > 0 ? ((ejecutado / presupuestado) * 100).toFixed(1) : 0;
                        })()}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <BudgetManager
                budget={currentBudget}
                onUpdate={handleUpdateBudget}
                onDelete={() => deleteBudgetMutation.mutate(currentBudget.id)}
                historicalTransactions={transactions}
                historicalBudgets={budgets}
              />
            </>
          )}
        </TabsContent>

        {/* TAB TRANSACCIONES */}
        <TabsContent value="transacciones" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>📊 Registro de Transacciones</CardTitle>
                <Button 
                  onClick={() => setShowAddTransaction(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Transacción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionList 
                transactions={transactions}
                budget={currentBudget}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Nueva Transacción */}
      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Transacción</DialogTitle>
          </DialogHeader>
          <TransactionForm
            budget={currentBudget}
            onSuccess={() => {
              setShowAddTransaction(false);
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Análisis IA Avanzado */}
      <AIFinancialForecasting
        open={showAIForecasting}
        onClose={() => setShowAIForecasting(false)}
      />

      {/* Dialog: Comparación Temporadas */}
      {showSeasonComparison && (
        <SeasonComparison 
          open={showSeasonComparison}
          onClose={() => setShowSeasonComparison(false)}
          currentSeason={activeSeason}
          allSeasons={allSeasons}
        />
      )}
    </div>
  );
}