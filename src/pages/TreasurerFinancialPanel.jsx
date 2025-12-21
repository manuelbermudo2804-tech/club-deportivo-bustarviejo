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
  Calendar, CheckCircle2, Clock, AlertCircle, BarChart3, Sparkles, Plus
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import BudgetManager from "../components/financial/BudgetManager";
import TransactionList from "../components/financial/TransactionList";
import TransactionForm from "../components/financial/TransactionForm";
import AIFinancialForecasting from "../components/financial/AIFinancialForecasting";

export default function TreasurerFinancialPanel() {
  const [user, setUser] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("resumen");
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAIForecasting, setShowAIForecasting] = useState(false);

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
  const totalIngresos = stats.cuotasPagadas;
  const totalPendiente = stats.cuotasPendientes;
  const totalEsperado = totalIngresos + totalPendiente + stats.cuotasEnRevision;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between">
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
                  <p className="text-xs text-green-100">
                    Cuotas: {stats.cuotasPagadas.toFixed(0)}€ • Ropa: {stats.ropaPagada.toFixed(0)}€
                  </p>
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
            <Card>
              <CardContent className="p-12 text-center">
                <Euro className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  No hay presupuesto para la temporada {activeSeason?.temporada}
                </h3>
                <p className="text-slate-600 mb-6">
                  Crea un presupuesto para gestionar partidas de ingresos y gastos con ayuda de IA
                </p>
                <Button 
                  onClick={handleCreateBudget}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Presupuesto
                </Button>
              </CardContent>
            </Card>
          ) : (
            <BudgetManager
              budget={currentBudget}
              onUpdate={handleUpdateBudget}
              onDelete={() => deleteBudgetMutation.mutate(currentBudget.id)}
              historicalTransactions={transactions}
              historicalBudgets={budgets}
            />
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
    </div>
  );
}