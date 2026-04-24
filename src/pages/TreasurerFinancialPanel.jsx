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
  Calendar, CheckCircle2, Clock, AlertCircle, HelpCircle, BarChart3, Sparkles, Plus,
  PieChart, Target, Award, Heart, Settings, RefreshCw, ExternalLink
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import TopDebtorsPanel from "../components/financial/TopDebtorsPanel.jsx";
import MonthlyEvolutionChart from "../components/financial/MonthlyEvolutionChart.jsx";
import CategoryBreakdown from "../components/financial/CategoryBreakdown.jsx";
import FinancialAlerts from "../components/financial/FinancialAlerts.jsx";
import IncomeProjection from "../components/financial/IncomeProjection.jsx";
import SeasonComparison from "../components/financial/SeasonComparison.jsx";
import IncomeDistributionPie from "../components/financial/IncomeDistributionPie.jsx";
import EndOfSeasonForecast from "../components/financial/EndOfSeasonForecast.jsx";
import FinancialGoalsTracker from "../components/financial/FinancialGoalsTracker.jsx";
import StripePaymentsPanel from "../components/financial/StripePaymentsPanel.jsx";
import FinancialHealthIndicator from "../components/financial/FinancialHealthIndicator.jsx";
import AutomaticMorosidadAlert from "../components/financial/AutomaticMorosidadAlert.jsx";

import BankAccountManager from "../components/financial/BankAccountManager.jsx";
import CategoryProfitability from "../components/financial/CategoryProfitability.jsx";
import RetentionAnalysis from "../components/financial/RetentionAnalysis.jsx";
import CashFlowAnalysis from "../components/financial/CashFlowAnalysis.jsx";
import FinancialRatios from "../components/financial/FinancialRatios.jsx";
import SeasonalityAnalysis from "../components/financial/SeasonalityAnalysis.jsx";
import BankReconciliationWizard from "../components/financial/BankReconciliationWizard.jsx";
import BankStatementReconciliation from "../components/financial/BankStatementReconciliation.jsx";
import { Input } from "@/components/ui/input";

export default function TreasurerFinancialPanel() {
  const [user, setUser] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("resumen");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, []);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState("rentabilidad");
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAIForecasting, setShowAIForecasting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [showSeasonComparison, setShowSeasonComparison] = useState(false);
  const [showBankReconciliation, setShowBankReconciliation] = useState(false);
  const [isDownloadingBudgetExcel, setIsDownloadingBudgetExcel] = useState(false);
  const [isImportingBudgetExcel, setIsImportingBudgetExcel] = useState(false);

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
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const active = seasonConfigs.find(s => s.activa === true);
    setActiveSeason(active);
  }, [seasonConfigs]);

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    staleTime: 60000, // 1 minuto
    refetchOnWindowFocus: false,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const clothingOrders = [];

  const { data: lotteryOrders = [] } = useQuery({
    queryKey: ['lotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list(),
    staleTime: 120000, // 2 minutos
    refetchOnWindowFocus: false,
  });

  const { data: clubMembers = [] } = useQuery({
    queryKey: ['clubMembers'],
    queryFn: () => base44.entities.ClubMember.list(),
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => base44.entities.Sponsor.list(),
    staleTime: 600000, // 10 minutos
    refetchOnWindowFocus: false,
  });

  const { data: customPlans = [] } = useQuery({
    queryKey: ['customPaymentPlans'],
    queryFn: () => base44.entities.CustomPaymentPlan.list(),
    staleTime: 120000, // 2 minutos
    refetchOnWindowFocus: false,
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

  // Función para obtener importe por mes según temporada activa
  const getImportePorMes = (_deporte, mes) => {
    // 1) Preferir cuota fraccionada definida en temporada
    if (activeSeason && Number(activeSeason.cuota_tres_meses) > 0) {
      return Number(activeSeason.cuota_tres_meses);
    }

    // 2) Inferir desde pagos reales de la temporada (modo/valor más frecuente)
    const normalizeSeasonKey = (s) => (s ? String(s).replace(/[^\d]/g, "") : "");
    const seasonMatches = (a, b) => {
      if (!a || !b) return false;
      return normalizeSeasonKey(a) === normalizeSeasonKey(b);
    };
    const monthPayments = (payments || []).filter(p => 
      seasonMatches(p.temporada, activeSeason?.temporada) &&
      p.mes === mes &&
      !(p.tipo_pago === 'Único' || p.tipo_pago === 'único')
    );
    const cantidades = monthPayments.map(p => Number(p.cantidad || 0)).filter(v => v > 0);
    if (cantidades.length > 0) {
      const freq = {};
      let bestVal = 0, best = 0;
      cantidades.forEach(v => {
        const k = Math.round(v);
        freq[k] = (freq[k] || 0) + 1;
        if (freq[k] > best) { best = freq[k]; bestVal = k; }
      });
      return bestVal;
    }

    // 3) Derivar de cuota única si existe (dividir entre 3)
    if (activeSeason && Number(activeSeason.cuota_unica) > 0) {
      return Number(activeSeason.cuota_unica) / 3;
    }

    // 4) Último recurso: 0
    return 0;
  };

  // Normaliza temporadas ("2024-2025" vs "2024/2025") y utilidades de temporada
  const normalizeSeasonKey = (s) => (s ? String(s).replace(/[^\d]/g, "") : "");
  const seasonMatches = (a, b) => {
    if (!a || !b) return false;
    return normalizeSeasonKey(a) === normalizeSeasonKey(b);
  };
  const isInSeason = (dateStr, season) => {
    if (!dateStr || !season) return false;
    const d = new Date(dateStr);
    const start = season?.fecha_inicio ? new Date(season.fecha_inicio) : null;
    const end = season?.fecha_fin ? new Date(season.fecha_fin) : null;
    if (start && end) return d >= start && d <= end;
    return true; // si no hay fechas configuradas, no filtramos
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
    // Partidas base por defecto (ingresos y gastos)
    const defaultPartidas = [
      // INGRESOS
      { id: `p_${Date.now()}_1`, nombre: 'Inscripciones Jugadores', categoria: 'Ingresos', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_2`, nombre: 'Cuotas Socios', categoria: 'Ingresos', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_3`, nombre: 'Patrocinios', categoria: 'Ingresos', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_4`, nombre: 'Lotería Navidad', categoria: 'Ingresos', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_5`, nombre: 'Venta Equipación', categoria: 'Ingresos', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_6`, nombre: 'Subvenciones', categoria: 'Ingresos', presupuestado: 0, ejecutado: 0 },
      // GASTOS
      { id: `p_${Date.now()}_7`, nombre: 'Arbitrajes', categoria: 'Gastos Variables', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_8`, nombre: 'Instalaciones', categoria: 'Gastos Fijos', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_9`, nombre: 'Material Deportivo', categoria: 'Gastos Variables', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_10`, nombre: 'Viajes', categoria: 'Gastos Variables', presupuestado: 0, ejecutado: 0 },
      { id: `p_${Date.now()}_11`, nombre: 'Publicidad y Redes', categoria: 'Gastos Variables', presupuestado: 0, ejecutado: 0 },
    ];

    createBudgetMutation.mutate({
      temporada: activeSeason.temporada,
      nombre: `Presupuesto ${activeSeason.temporada}`,
      partidas: defaultPartidas
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

    const currentSeasonPayments = payments.filter(p => seasonMatches(p.temporada, activeSeason.temporada) && p.is_deleted !== true);
    const currentSeasonPlayers = players.filter(p => p.activo === true);
    const currentSeasonClothing = clothingOrders.filter(o => seasonMatches(o.temporada, activeSeason.temporada) || (!o.temporada && isInSeason(o.created_date, activeSeason)));
    const currentSeasonLottery = lotteryOrders.filter(o => seasonMatches(o.temporada, activeSeason.temporada) || (!o.temporada && isInSeason(o.created_date, activeSeason)));
    const currentSeasonMembers = clubMembers.filter(m => seasonMatches(m.temporada, activeSeason.temporada));
    const currentSeasonPlans = customPlans.filter(p => seasonMatches(p.temporada, activeSeason.temporada));

    // CÁLCULO DE PENDIENTES
    let totalPendiente = 0;
    currentSeasonPlayers.forEach(player => {
      const playerPayments = currentSeasonPayments.filter(p => p.jugador_id === player.id);
      
      // Verificar si tiene plan especial activo - MÁXIMA PRIORIDAD
      const playerActivePlan = currentSeasonPlans.find(p => 
        p.jugador_id === player.id && 
        p.estado === "Activo"
      );

      if (playerActivePlan && playerActivePlan.cuotas) {
        // PLAN ESPECIAL: Priorizar pagos registrados de plan especial; si no hay, usar cuotas del plan
        const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
        if (planPayments.length > 0) {
          // Deduplicar por cuota/mes: si existe Pagado o En revisión de la misma cuota, NO contar el Pendiente
          const rank = (s) => (s === "Pagado" ? 3 : s === "En revisión" ? 2 : s === "Pendiente" ? 1 : 0);
          const byMes = {};
          planPayments.forEach(pp => {
            const key = pp.mes || String(pp.id);
            if (!byMes[key] || rank(pp.estado) > rank(byMes[key].estado)) {
              byMes[key] = pp;
            }
          });
          const pendientePlan = Object.values(byMes)
            .filter(p => p.estado === "Pendiente")
            .reduce((sum, p) => sum + (p.cantidad || 0), 0);
          totalPendiente += pendientePlan;
        } else {
          const cuotasPendientes = playerActivePlan.cuotas.filter(c => c.pagada !== true);
          cuotasPendientes.forEach(cuota => {
            totalPendiente += cuota.cantidad || 0;
          });
        }
      } else {
      // Backup: si existen pagos registrados como "Plan Especial", usar esos importes
      const planEspecialPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
      if (planEspecialPayments.length > 0) {
        const pendiente = planEspecialPayments
          .filter(p => p.estado === "Pendiente")
          .reduce((sum, p) => sum + (p.cantidad || 0), 0);
        totalPendiente += pendiente;
      } else {
        // Plan Mensual: 1 pago inicial + N mensualidades automáticas por Stripe
        const hasPlanMensual = playerPayments.some(p => p.tipo_pago === "Plan Mensual");
        if (hasPlanMensual) {
          const pmInitial = playerPayments.find(p => p.tipo_pago === "Plan Mensual" && p.mes === "Junio");
          const numMeses = pmInitial?.plan_mensual_meses || (() => {
            const m = pmInitial?.notas?.match(/(\d+)x [\d.]+€\/mes/);
            return m ? Number(m[1]) : 0;
          })();
          const mensualidad = pmInitial?.plan_mensual_mensualidad || (() => {
            const m = pmInitial?.notas?.match(/(\d+)x ([\d.]+)€\/mes/);
            return m ? Number(m[2]) : 0;
          })();
          const totalEsperadasPM = 1 + numMeses;
          const pagadasPM = playerPayments.filter(p => p.tipo_pago === "Plan Mensual" && p.estado === "Pagado").length;
          const pendientesPM = Math.max(0, totalEsperadasPM - pagadasPM);
          // Pago inicial pendiente
          if (pmInitial && pmInitial.estado === "Pendiente") {
            totalPendiente += pmInitial.cantidad || 0;
          }
          // Mensualidades no cobradas aún (esperadas - cobradas - pago inicial si pagado)
          const mensualidadesPagadas = playerPayments.filter(p => p.tipo_pago === "Plan Mensual" && p.mes !== "Junio" && p.estado === "Pagado").length;
          const mensualidadesPendientes = Math.max(0, numMeses - mensualidadesPagadas);
          totalPendiente += mensualidadesPendientes * mensualidad;
        } else {
          // NO tiene plan especial ni mensual - usar lógica estándar (pago único o fraccionado)
          const hasPagoUnico = playerPayments.some(p => 
            p.tipo_pago === "Único" || p.tipo_pago === "único"
          );

          if (hasPagoUnico) {
            const pagoUnico = playerPayments.find(p => 
              p.tipo_pago === "Único" || p.tipo_pago === "único"
            );
            if (pagoUnico && pagoUnico.estado === "Pendiente") {
              totalPendiente += pagoUnico.cantidad || 0;
            }
          } else {
            // Para pago fraccionado, calcular meses faltantes
            const mesesPagadosORevision = playerPayments
              .filter(p => (p.estado === "Pagado" || p.estado === "En revisión"))
              .map(p => p.mes);

            const allMonths = ["Junio", "Septiembre", "Diciembre"];
            const mesesFaltantes = allMonths.filter(mes => !mesesPagadosORevision.includes(mes));

            mesesFaltantes.forEach(mes => {
              totalPendiente += getImportePorMes(player.deporte, mes);
            });
          }
        }
      }
      }
    });

    return {
      cuotasPagadas: currentSeasonPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0),
      cuotasPendientes: totalPendiente,
      cuotasEnRevision: currentSeasonPayments.filter(p => p.estado === "En revisión").reduce((sum, p) => sum + (p.cantidad || 0), 0),
      
      ropaTotal: 0,
      ropaPagada: 0,
      ropaPendiente: 0,
      
      loteriaTotal: currentSeasonLottery.reduce((sum, o) => sum + (o.total || 0), 0),
      loteriaPagada: currentSeasonLottery.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.total || 0), 0),
      loteriaPendiente: currentSeasonLottery.filter(o => o.pagado === false).reduce((sum, o) => sum + (o.total || 0), 0),
      
      sociosTotal: currentSeasonMembers.filter(m => m.activo !== false).reduce((sum, m) => sum + (m.cuota_socio || m.cuota_pagada || 0), 0),
      sociosPagados: currentSeasonMembers.filter(m => m.estado_pago === "Pagado").reduce((sum, m) => sum + ((m.cuota_pagada || m.cuota_socio || 0)), 0),
      sociosPendientes: currentSeasonMembers.filter(m => m.estado_pago !== "Pagado").reduce((sum, m) => sum + (m.cuota_socio || 0), 0),
      
      patrociniosTotal: sponsors
        .filter(s => s.activo === true && isInSeason(s.fecha_inicio, activeSeason))
        .reduce((sum, s) => sum + (Number(s.precio_anual) || 0), 0),
    };
  }, [activeSeason, payments, players, clothingOrders, lotteryOrders, clubMembers, sponsors, customPlans]);

  // TOTALES CORREGIDOS
  const totalIngresos = stats.cuotasPagadas + stats.loteriaPagada + stats.sociosPagados + stats.patrociniosTotal;
  const totalPendiente = stats.cuotasPendientes + stats.loteriaPendiente + stats.sociosPendientes;
  const totalEsperado = totalIngresos + totalPendiente + stats.cuotasEnRevision;

  // Datos para gráficos
  const chartData = useMemo(() => {
    return [
      { name: 'Cuotas', Cobrado: stats.cuotasPagadas, Pendiente: stats.cuotasPendientes, EnRevision: stats.cuotasEnRevision },
      { name: 'Lotería', Cobrado: stats.loteriaPagada, Pendiente: stats.loteriaPendiente, EnRevision: 0 },
      { name: 'Socios', Cobrado: stats.sociosPagados, Pendiente: stats.sociosPendientes, EnRevision: 0 },
      { name: 'Patrocinios', Cobrado: stats.patrociniosTotal, Pendiente: 0, EnRevision: 0 },
    ];
  }, [stats]);

  const pieData = useMemo(() => [
    { name: 'Cuotas', value: stats.cuotasPagadas, color: '#3b82f6' },
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

  const handleDownloadBudgetExcel = async () => {
    setIsDownloadingBudgetExcel(true);
    try {
      const { data } = await base44.functions.invoke('downloadBudgetExcel', {
        budgetId: currentBudget?.id
      });
      
      if (data?.file_url) {
        const link = document.createElement('a');
        link.href = data.file_url;
        link.download = `Presupuesto_${currentBudget.nombre}_${currentBudget.temporada}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('✅ Presupuesto descargado como Excel');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al descargar el presupuesto');
    } finally {
      setIsDownloadingBudgetExcel(false);
    }
  };

  const handleImportBudgetExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentBudget) return;

    setIsImportingBudgetExcel(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            partidas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string" },
                  categoria: { type: "string" },
                  presupuestado: { type: "number" },
                  ejecutado: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status === "success" && result.output?.partidas?.length > 0) {
        const importedPartidas = result.output.partidas.map((p, idx) => ({
          id: `partida_import_${Date.now()}_${idx}`,
          nombre: p.nombre,
          categoria: p.categoria,
          presupuestado: p.presupuestado || 0,
          ejecutado: p.ejecutado || 0
        }));
        
        await base44.entities.Budget.update(currentBudget.id, { partidas: importedPartidas });
        await queryClient.invalidateQueries({ queryKey: ['budgets'] });
        toast.success(`✅ ${importedPartidas.length} partidas importadas`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al importar Excel');
    } finally {
      setIsImportingBudgetExcel(false);
      e.target.value = '';
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
    <div className="min-h-screen overflow-y-auto p-6 space-y-6 pb-28">
      {/* Alerta automática de morosidad */}
      <AutomaticMorosidadAlert 
        totalIngresos={totalIngresos}
        totalPendiente={totalPendiente}
        totalEsperado={totalEsperado}
      />

      <div className="bg-gradient-to-r from-white to-slate-50 rounded-2xl p-6 shadow-xl border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">💰 Panel Financiero</h1>
            <p className="text-slate-600 mt-1">Control total de ingresos, gastos y presupuestos</p>
            <div className="flex gap-2 mt-3">
              {activeSeason && (
                <Badge className="bg-green-100 text-green-700 border border-green-200">
                  📅 {activeSeason.temporada}
                </Badge>
              )}
              <Badge className="bg-orange-100 text-orange-700 border border-orange-200">
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
        <TabsList className="grid w-full grid-cols-4 bg-white border border-slate-200 rounded-xl">
          <TabsTrigger value="resumen" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="analisis" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden md:inline">Análisis</span>
          </TabsTrigger>
          <TabsTrigger value="bancario" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <Building2 className="w-4 h-4" />
            <span className="hidden md:inline">Bancario</span>
          </TabsTrigger>
          <TabsTrigger value="presupuestos" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <Euro className="w-4 h-4" />
            <span className="hidden md:inline">Presupuestos</span>
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
                <p className="text-sm text-orange-100 mb-1 flex items-center gap-2">Pendiente de Cobro
                  <HelpCircle
                    className="w-4 h-4 text-white/80"
                    title="Cómo se calcula: Plan Especial (cuotas no pagadas, deduplicando pagos por cuota si ya hay uno Pagado/En revisión) > Pago Único pendiente > Meses faltantes en Tres Meses. Solo temporada activa. ‘En revisión’ no suma."
                  />
                </p>
                <p className="text-4xl font-bold">{totalPendiente.toFixed(2)}€</p>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-orange-100">
                    {(() => {
                      if (!activeSeason) return '0 cuotas';
                      const currentSeasonPayments = payments.filter(p => seasonMatches(p.temporada, activeSeason.temporada) && p.is_deleted !== true);
                      const currentSeasonPlayers = players.filter(p => p.activo === true);
                      const currentSeasonPlans = customPlans.filter(p => seasonMatches(p.temporada, activeSeason.temporada));
                      let cuotasPendientes = 0;
                      currentSeasonPlayers.forEach(player => {
                        const playerPayments = currentSeasonPayments.filter(p => p.jugador_id === player.id);
                        
                        // Verificar si tiene plan especial activo - PRIORIDAD MÁXIMA
                        const playerActivePlan = currentSeasonPlans.find(p => 
                          p.jugador_id === player.id && 
                          p.estado === "Activo"
                        );

                        if (playerActivePlan && playerActivePlan.cuotas) {
                          // PLAN ESPECIAL: Priorizar número de pagos pendientes registrados; si no hay, contar cuotas del plan no pagadas
                          const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
                          if (planPayments.length > 0) {
                            const rank = (s) => (s === "Pagado" ? 3 : s === "En revisión" ? 2 : s === "Pendiente" ? 1 : 0);
                              const byMes = {};
                              planPayments.forEach(pp => {
                                const key = pp.mes || String(pp.id);
                                if (!byMes[key] || rank(pp.estado) > rank(byMes[key].estado)) {
                                  byMes[key] = pp;
                                }
                              });
                              const countPend = Object.values(byMes).filter(p => p.estado === "Pendiente").length;
                            cuotasPendientes += countPend;
                          } else {
                            const cuotasPendientesPlan = playerActivePlan.cuotas.filter(c => c.pagada !== true).length;
                            cuotasPendientes += cuotasPendientesPlan;
                          }
                        } else {
                          // NO tiene plan especial - lógica estándar o pagos Plan Especial sin plan activo
                          const planEspecialPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
                          if (planEspecialPayments.length > 0) {
                            const rank = (s) => (s === "Pagado" ? 3 : s === "En revisión" ? 2 : s === "Pendiente" ? 1 : 0);
                            const byMes = {};
                            planEspecialPayments.forEach(pp => {
                              const key = pp.mes || String(pp.id);
                              if (!byMes[key] || rank(pp.estado) > rank(byMes[key].estado)) {
                                byMes[key] = pp;
                              }
                            });
                            const countPend = Object.values(byMes).filter(p => p.estado === "Pendiente").length;
                            cuotasPendientes += countPend;
                          } else {
                            // Plan Mensual
                            const hasPlanMensual = playerPayments.some(p => p.tipo_pago === "Plan Mensual");
                            if (hasPlanMensual) {
                              const pmInit = playerPayments.find(p => p.tipo_pago === "Plan Mensual" && p.mes === "Junio");
                              const nMeses = pmInit?.plan_mensual_meses || (() => { const m = pmInit?.notas?.match(/(\d+)x [\d.]+€\/mes/); return m ? Number(m[1]) : 0; })();
                              const totalExp = 1 + nMeses;
                              const totalPaid = playerPayments.filter(p => p.tipo_pago === "Plan Mensual" && p.estado === "Pagado").length;
                              cuotasPendientes += Math.max(0, totalExp - totalPaid);
                            } else {
                              const hasPagoUnico = playerPayments.some(p => 
                                p.tipo_pago === "Único" || p.tipo_pago === "único"
                              );
                              
                              if (hasPagoUnico) {
                                const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
                                if (pagoUnico && pagoUnico.estado === "Pendiente") cuotasPendientes += 1;
                              } else {
                                const mesesPagadosORevision = playerPayments
                                  .filter(p => (p.estado === "Pagado" || p.estado === "En revisión"))
                                  .map(p => p.mes);
                                const allMonths = ["Junio", "Septiembre", "Diciembre"];
                                const mesesFaltantes = allMonths.filter(mes => !mesesPagadosORevision.includes(mes));
                                cuotasPendientes += mesesFaltantes.length;
                              }
                            }
                          }
                        }
                      });
                      
                      return `${cuotasPendientes} cuota${cuotasPendientes === 1 ? '' : 's'} sin pagar`;
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
                      const currentSeasonPayments = payments.filter(p => seasonMatches(p.temporada, activeSeason?.temporada) && p.is_deleted !== true);
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

            {/* Pedidos Ropa - Eliminado por externalización */}
            {/*
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
                    <span className="text-lg font-bold text-purple-700">{sponsors.filter(s => s.activo === true).length}</span>
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
                      const currentSeasonPayments = payments.filter(p => seasonMatches(p.temporada, activeSeason?.temporada) && p.is_deleted !== true);
                      return currentSeasonPayments.filter(p => p.estado === "Pagado").length;
                    })()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Pagos Confirmados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-700">
                    {(() => {
                      const currentSeasonPayments = payments.filter(p => seasonMatches(p.temporada, activeSeason?.temporada) && p.is_deleted !== true);
                      return currentSeasonPayments.filter(p => p.estado === "En revisión").length;
                    })()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">En Revisión</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {(() => {
                      if (!activeSeason) return 0;
                      const currentSeasonPayments = payments.filter(p => seasonMatches(p.temporada, activeSeason.temporada) && p.is_deleted !== true);
                      const currentSeasonPlayers = players.filter(p => p.activo === true);
                      const currentSeasonPlans = customPlans.filter(p => seasonMatches(p.temporada, activeSeason.temporada));
                      let cuotasPendientes = 0;
                      
                      currentSeasonPlayers.forEach(player => {
                        const playerPayments = currentSeasonPayments.filter(p => p.jugador_id === player.id);
                        
                        // Verificar si tiene plan especial activo - PRIORIDAD MÁXIMA
                        const playerActivePlan = currentSeasonPlans.find(p => 
                          p.jugador_id === player.id && 
                          p.estado === "Activo"
                        );

                        if (playerActivePlan && playerActivePlan.cuotas) {
                          // PLAN ESPECIAL: Priorizar pagos registrados; si no hay, contar cuotas del plan no pagadas
                          const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
                          if (planPayments.length > 0) {
                            const rank = (s) => (s === "Pagado" ? 3 : s === "En revisión" ? 2 : s === "Pendiente" ? 1 : 0);
                              const byMes = {};
                              planPayments.forEach(pp => {
                                const key = pp.mes || String(pp.id);
                                if (!byMes[key] || rank(pp.estado) > rank(byMes[key].estado)) {
                                  byMes[key] = pp;
                                }
                              });
                              const countPend = Object.values(byMes).filter(p => p.estado === "Pendiente").length;
                            cuotasPendientes += countPend;
                          } else {
                            const cuotasPendientesPlan = playerActivePlan.cuotas.filter(c => c.pagada !== true).length;
                            cuotasPendientes += cuotasPendientesPlan;
                          }
                        } else {
                          // NO tiene plan especial - lógica estándar o pagos Plan Especial sin plan activo
                          const planEspecialPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
                          if (planEspecialPayments.length > 0) {
                            const rank = (s) => (s === "Pagado" ? 3 : s === "En revisión" ? 2 : s === "Pendiente" ? 1 : 0);
                            const byMes = {};
                            planEspecialPayments.forEach(pp => {
                              const key = pp.mes || String(pp.id);
                              if (!byMes[key] || rank(pp.estado) > rank(byMes[key].estado)) {
                                byMes[key] = pp;
                              }
                            });
                            const countPend = Object.values(byMes).filter(p => p.estado === "Pendiente").length;
                            cuotasPendientes += countPend;
                          } else {
                            // Plan Mensual
                            const hasPlanMensual2 = playerPayments.some(p => p.tipo_pago === "Plan Mensual");
                            if (hasPlanMensual2) {
                              const pmInit2 = playerPayments.find(p => p.tipo_pago === "Plan Mensual" && p.mes === "Junio");
                              const nMeses2 = pmInit2?.plan_mensual_meses || (() => { const m = pmInit2?.notas?.match(/(\d+)x [\d.]+€\/mes/); return m ? Number(m[1]) : 0; })();
                              const totalExp2 = 1 + nMeses2;
                              const totalPaid2 = playerPayments.filter(p => p.tipo_pago === "Plan Mensual" && p.estado === "Pagado").length;
                              cuotasPendientes += Math.max(0, totalExp2 - totalPaid2);
                            } else {
                              const hasPagoUnico = playerPayments.some(p => 
                                p.tipo_pago === "Único" || p.tipo_pago === "único"
                              );
                              if (hasPagoUnico) {
                                const pagoUnicoPendiente = playerPayments.find(p => 
                                  (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
                                  p.estado === "Pendiente"
                                );
                                if (pagoUnicoPendiente) cuotasPendientes += 1;
                              } else {
                                const mesesPagadosORevision = playerPayments
                                  .filter(p => (p.estado === "Pagado" || p.estado === "En revisión"))
                                  .map(p => p.mes);

                                const allMonths = ["Junio", "Septiembre", "Diciembre"];
                                const mesesFaltantes = allMonths.filter(mes => !mesesPagadosORevision.includes(mes));
                                cuotasPendientes += mesesFaltantes.length;
                              }
                            }
                          }
                        }
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
            
            {activeSeason?.tienda_ropa_url ? (
              <a href={activeSeason.tienda_ropa_url} target="_blank" rel="noopener noreferrer">
                <div className="group bg-gradient-to-br from-orange-600 to-amber-700 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
                  <div className="flex flex-col items-center text-white text-center">
                    <ShoppingBag className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-sm">Tienda Equipación</p>
                    <p className="text-xs text-orange-100 mt-1">Externa</p>
                  </div>
                </div>
              </a>
            ) : null}

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
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <RePieChart>
                      <Pie
                        data={pieData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€`}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  
                  {/* Leyenda personalizada compacta */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full mt-4">
                    {pieData.filter(d => d.value > 0).map((item, index) => {
                      const total = pieData.reduce((sum, d) => sum + d.value, 0);
                      const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{item.name}</p>
                            <p className="text-xs text-slate-500">{percent}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
            customPlans={customPlans}
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

          {/* Registro Stripe */}
          <StripePaymentsPanel />

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

        {/* TAB ANÁLISIS AVANZADOS */}
        <TabsContent value="analisis" className="space-y-6 mt-6">
          <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab}>
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full gap-1">
              <TabsTrigger value="rentabilidad" className="text-xs md:text-sm">
                <span className="hidden md:inline">💰 Rentabilidad</span>
                <span className="md:hidden">💰</span>
              </TabsTrigger>
              <TabsTrigger value="retencion" className="text-xs md:text-sm">
                <span className="hidden md:inline">🔄 Retención</span>
                <span className="md:hidden">🔄</span>
              </TabsTrigger>
              <TabsTrigger value="flujo" className="text-xs md:text-sm">
                <span className="hidden md:inline">📊 Flujo Caja</span>
                <span className="md:hidden">📊</span>
              </TabsTrigger>
              <TabsTrigger value="ratios" className="text-xs md:text-sm">
                <span className="hidden md:inline">📈 Ratios</span>
                <span className="md:hidden">📈</span>
              </TabsTrigger>
              <TabsTrigger value="estacionalidad" className="text-xs md:text-sm">
                <span className="hidden md:inline">📅 Estacionalidad</span>
                <span className="md:hidden">📅</span>
              </TabsTrigger>
            </TabsList>

            {activeAnalysisTab === "rentabilidad" && (
              <div className="mt-6">
                <CategoryProfitability 
                  payments={payments}
                  transactions={transactions}
                  players={players}
                  activeSeason={activeSeason}
                />
              </div>
            )}

            {activeAnalysisTab === "retencion" && (
              <div className="mt-6">
                <RetentionAnalysis 
                  allSeasons={allSeasons}
                  allPlayers={players}
                />
              </div>
            )}

            {activeAnalysisTab === "flujo" && (
              <div className="mt-6">
                <CashFlowAnalysis 
                  payments={payments}
                  transactions={transactions}
                  clothingOrders={clothingOrders}
                  lotteryOrders={lotteryOrders}
                  clubMembers={clubMembers}
                  sponsors={sponsors}
                  activeSeason={activeSeason}
                />
              </div>
            )}

            {activeAnalysisTab === "ratios" && (
              <div className="mt-6">
                <FinancialRatios 
                  totalIngresos={totalIngresos}
                  totalPendiente={totalPendiente}
                  totalGastos={transactions.filter(t => t.tipo === "Gasto").reduce((sum, t) => sum + (t.cantidad || 0), 0)}
                  stats={stats}
                />
              </div>
            )}

            {activeAnalysisTab === "estacionalidad" && (
              <div className="mt-6">
                <SeasonalityAnalysis 
                  payments={payments}
                  activeSeason={activeSeason}
                />
              </div>
            )}
          </Tabs>
        </TabsContent>

        {/* TAB BANCARIO */}
        <TabsContent value="bancario" className="space-y-6 mt-6">
          <BankStatementReconciliation activeSeason={activeSeason} />
          <BankAccountManager activeSeason={activeSeason} />
        </TabsContent>

        {/* TAB PRESUPUESTOS */}
        <TabsContent value="presupuestos" className="space-y-6 mt-6">

          {/* Planificador próxima temporada */}
          <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg">
            <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">📋 Presupuesto 2026-2027</h3>
                  <p className="text-sm text-slate-600">Simulador interactivo con gráficos — editable y exportable a PDF</p>
                </div>
              </div>
              <Link to="/BudgetPlanner">
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg px-6">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Abrir Planificador
                </Button>
              </Link>
            </CardContent>
          </Card>

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

      {/* Dialog: Conciliación Bancaria */}
      <BankReconciliationWizard
        open={showBankReconciliation}
        onClose={() => setShowBankReconciliation(false)}
        temporada={activeSeason?.temporada}
      />
    </div>
  );
}