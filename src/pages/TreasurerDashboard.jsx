import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, CheckCircle2, Clock, 
  Download, FileText, CreditCard, ShoppingBag, Clover, Building2,
  ArrowUpRight, ArrowDownRight, Receipt, Calendar, Wallet, Plus, Loader2, PieChart as PieChartIcon,
  Sparkles, RefreshCw, Activity, Award, FileSpreadsheet, Target, Upload
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { getCuotasPorCategoriaSync } from "../components/payments/paymentAmounts";

import BudgetManager from "../components/financial/BudgetManager";
import TransactionForm from "../components/financial/TransactionForm";
import TransactionList from "../components/financial/TransactionList";
import AICommunicationAssistant from "../components/communication/AICommunicationAssistant";
import AIFinancialForecasting from "../components/financial/AIFinancialForecasting";
import AIReconciliation from "../components/financial/AIReconciliation";
import { usePageTutorial } from "../components/tutorials/useTutorial";

const COLORS = {
  pagado: '#16a34a',
  pendiente: '#dc2626',
  revision: '#f59e0b',
  cuotas: '#3b82f6',
  ropa: '#f97316',
  loteria: '#10b981',
  patrocinios: '#8b5cf6'
};

export default function TreasurerDashboard() {
  usePageTutorial("treasurer_dashboard");
  
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCommunicationAssistant, setShowCommunicationAssistant] = useState(false);
  const [showAIForecasting, setShowAIForecasting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadedBankStatement, setUploadedBankStatement] = useState(null);
  const [newBudgetData, setNewBudgetData] = useState({
    temporada: "",
    nombre: "Presupuesto Principal"
  });
  const queryClient = useQueryClient();

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  const currentSeason = getCurrentSeason();

  // Fetch all financial data
  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      return allPayments.filter(p => p.is_deleted !== true);
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrders'],
    queryFn: () => base44.entities.ClothingOrder.list('-created_date'),
  });

  const { data: lotteryOrders = [] } = useQuery({
    queryKey: ['lotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list('-created_date'),
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => base44.entities.Sponsor.list(),
  });

  const { data: clubMembers = [] } = useQuery({
    queryKey: ['clubMembers'],
    queryFn: () => base44.entities.ClubMember.list(),
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.SeasonConfig.list('-created_date'),
  });

  // Presupuestos y transacciones financieras
  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list('-created_date'),
  });

  const { data: financialTransactions = [], isLoading: loadingFinancialTransactions } = useQuery({
    queryKey: ['financialTransactions'],
    queryFn: () => base44.entities.FinancialTransaction.list('-fecha'),
  });

  const { data: paymentHistory = [] } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: () => base44.entities.PaymentHistory.list('-created_date'),
  });

  // Mutations para presupuestos
  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowNewBudget(false);
      toast.success("Presupuesto creado");
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      const transaction = await base44.entities.FinancialTransaction.create(data);
      
      const currentActiveBudget = budgets.find(b => b.activo && b.temporada === currentSeason) || budgets[0];
      if (data.partida_id && currentActiveBudget) {
        const updatedPartidas = currentActiveBudget.partidas.map(p => {
          if (p.id === data.partida_id) {
            return {
              ...p,
              ejecutado: (p.ejecutado || 0) + data.cantidad
            };
          }
          return p;
        });
        await base44.entities.Budget.update(currentActiveBudget.id, { partidas: updatedPartidas });
      }
      
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowTransactionForm(false);
      toast.success("Movimiento registrado");
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id) => {
      const transaction = financialTransactions.find(t => t.id === id);
      await base44.entities.FinancialTransaction.delete(id);
      
      const currentActiveBudget = budgets.find(b => b.activo && b.temporada === currentSeason) || budgets[0];
      if (transaction?.partida_id && currentActiveBudget) {
        const updatedPartidas = currentActiveBudget.partidas.map(p => {
          if (p.id === transaction.partida_id) {
            return {
              ...p,
              ejecutado: Math.max(0, (p.ejecutado || 0) - transaction.cantidad)
            };
          }
          return p;
        });
        await base44.entities.Budget.update(currentActiveBudget.id, { partidas: updatedPartidas });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success("Movimiento eliminado");
    },
  });

  const handleCreateBudget = () => {
    createBudgetMutation.mutate({
      ...newBudgetData,
      temporada: newBudgetData.temporada || currentSeason,
      partidas: [],
      activo: true
    });
  };

  const handleUpdateBudget = (updates) => {
    const currentActiveBudget = budgets.find(b => b.activo && b.temporada === currentSeason) || budgets[0];
    if (currentActiveBudget) {
      updateBudgetMutation.mutate({
        id: currentActiveBudget.id,
        data: { ...currentActiveBudget, ...updates }
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
      queryClient.invalidateQueries({ queryKey: ['players'] }),
      queryClient.invalidateQueries({ queryKey: ['clothingOrders'] }),
      queryClient.invalidateQueries({ queryKey: ['lotteryOrders'] }),
      queryClient.invalidateQueries({ queryKey: ['sponsors'] }),
      queryClient.invalidateQueries({ queryKey: ['clubMembers'] }),
      queryClient.invalidateQueries({ queryKey: ['seasons'] }),
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
      queryClient.invalidateQueries({ queryKey: ['financialTransactions'] })
    ]);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Datos actualizados");
    }, 500);
  };

  const handleExportFinancialTransactions = () => {
    const csvContent = [
      ["Fecha", "Tipo", "Concepto", "Categoría", "Proveedor/Cliente", "Importe", "Estado", "Nº Factura"].join(","),
      ...financialTransactions.map(t => [
        t.fecha,
        t.tipo,
        `"${t.concepto}"`,
        t.categoria,
        `"${t.proveedor_cliente || ''}"`,
        t.cantidad,
        t.estado,
        t.numero_factura || ''
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_financieros_${currentSeason.replace("/", "-")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exportación completada");
  };

  // Get unique seasons from payments
  const availableSeasons = useMemo(() => {
    const seasonSet = new Set(payments.map(p => p.temporada).filter(Boolean));
    return ["all", ...Array.from(seasonSet)];
  }, [payments]);

  // Filter data by season
  const filteredPayments = useMemo(() => {
    if (selectedSeason === "all") return payments;
    return payments.filter(p => p.temporada === selectedSeason);
  }, [payments, selectedSeason]);

  const filteredClothingOrders = useMemo(() => {
    // Solo mostrar pedidos de la temporada seleccionada (se eliminan en reset)
    if (selectedSeason === "all") return clothingOrders;
    return clothingOrders.filter(o => normalizeTemporada(o.temporada) === normalizeTemporada(selectedSeason));
  }, [clothingOrders, selectedSeason]);

  const filteredClubMembers = useMemo(() => {
    // Solo socios activos de la temporada seleccionada (los antiguos quedan activo=false en reset)
    const activeMembers = clubMembers.filter(m => m.activo === true);
    if (selectedSeason === "all") return activeMembers;
    return activeMembers.filter(m => normalizeTemporada(m.temporada) === normalizeTemporada(selectedSeason));
  }, [clubMembers, selectedSeason]);

  // Normalizar temporada
  const normalizeTemporada = (temporada) => {
    if (!temporada) return "";
    return temporada.replace(/-/g, "/");
  };

  const matchTemporada = (paymentTemp, filterTemp) => {
    if (filterTemp === "all") return true;
    return normalizeTemporada(paymentTemp) === normalizeTemporada(filterTemp);
  };

  // Calculate financial stats
  const stats = useMemo(() => {
    const currentSeason = getCurrentSeason();
    const activePlayers = players.filter(p => p.activo === true);
    
    // CALCULAR CUOTAS PENDIENTES CORRECTAMENTE
    // Para cada jugador activo, calcular cuánto debe pagar en total vs cuánto ya pagó
    let cuotasPendientesCalculadas = 0;
    
    activePlayers.forEach(player => {
      const playerPayments = filteredPayments.filter(p => p.jugador_id === player.id);
      
      // Verificar si tiene pago único pagado o en revisión
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        (p.estado === "Pagado" || p.estado === "En revisión")
      );
      
      if (hasPagoUnico) {
        // Si tiene pago único, no debe nada
        return;
      }
      
      // Si no tiene pago único, contar cuántos meses le faltan
      const allMonths = ["Junio", "Septiembre", "Diciembre"];
      const mesesPagados = playerPayments
        .filter(p => p.estado === "Pagado" || p.estado === "En revisión")
        .map(p => p.mes);
      
      const mesesPendientes = allMonths.filter(mes => !mesesPagados.includes(mes));
      
      // Para cada mes pendiente, sumar la cuota correspondiente
      mesesPendientes.forEach(mes => {
        const cuotas = getCuotasPorCategoriaSync(player.deporte);
        const cantidad = mes === "Junio" ? cuotas.inscripcion : 
                        mes === "Septiembre" ? cuotas.segunda : 
                        cuotas.tercera;
        cuotasPendientesCalculadas += cantidad;
      });
    });
    
    // Cuotas
    const cuotasPagadas = filteredPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
    const cuotasPendientes = cuotasPendientesCalculadas;
    const cuotasRevision = filteredPayments.filter(p => p.estado === "En revisión").reduce((sum, p) => sum + (p.cantidad || 0), 0);

    // Ropa (solo temporada actual)
    const ropaTemporadaActual = filteredClothingOrders.filter(o => 
      selectedSeason === "all" || normalizeTemporada(o.temporada) === normalizeTemporada(selectedSeason)
    );
    const ropaPagada = ropaTemporadaActual.filter(o => o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);
    const ropaPendiente = ropaTemporadaActual.filter(o => !o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);

    // Lotería (solo temporada actual)
    const loteriaTemporadaActual = lotteryOrders.filter(o =>
      selectedSeason === "all" || normalizeTemporada(o.temporada) === normalizeTemporada(selectedSeason)
    );
    const loteriaPagada = loteriaTemporadaActual.filter(o => o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);
    const loteriaPendiente = loteriaTemporadaActual.filter(o => !o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);

    // Patrocinios - SOLO contar activos CON pago confirmado (monto > 0)
    const patrociniosActivos = sponsors.filter(s => s.estado === "Activo" && (s.monto || 0) > 0);
    const patrociniosTotal = patrociniosActivos.reduce((sum, s) => sum + (s.monto || 0), 0);

    // Socios
    const sociosPagados = filteredClubMembers.filter(m => m.estado_pago === "Pagado").reduce((sum, m) => sum + (m.cuota_socio || 25), 0);
    const sociosPendientes = filteredClubMembers.filter(m => m.estado_pago === "Pendiente" || m.estado_pago === "En revisión").reduce((sum, m) => sum + (m.cuota_socio || 25), 0);
    const sociosRevision = filteredClubMembers.filter(m => m.estado_pago === "En revisión").length;
    const sociosCount = filteredClubMembers.length;

    // Totales
    const totalIngresos = cuotasPagadas + ropaPagada + loteriaPagada + patrociniosTotal + sociosPagados;
    const totalPendiente = cuotasPendientes + cuotasRevision + ropaPendiente + loteriaPendiente + sociosPendientes;

    return {
      cuotas: { pagadas: cuotasPagadas, pendientes: cuotasPendientes, revision: cuotasRevision },
      ropa: { pagada: ropaPagada, pendiente: ropaPendiente },
      loteria: { pagada: loteriaPagada, pendiente: loteriaPendiente },
      patrocinios: patrociniosTotal,
      socios: { pagados: sociosPagados, pendientes: sociosPendientes, revision: sociosRevision, total: sociosCount },
      totalIngresos,
      totalPendiente
    };
  }, [filteredPayments, filteredClothingOrders, lotteryOrders, sponsors, filteredClubMembers, players]);

  // Income by concept for pie chart
  const incomeByConceptData = [
    { name: 'Cuotas', value: stats.cuotas.pagadas, color: COLORS.cuotas },
    { name: 'Ropa', value: stats.ropa.pagada, color: COLORS.ropa },
    { name: 'Lotería', value: stats.loteria.pagada, color: COLORS.loteria },
    { name: 'Patrocinios', value: stats.patrocinios, color: COLORS.patrocinios },
    { name: 'Socios', value: stats.socios?.pagados || 0, color: '#ec4899' }
  ].filter(d => d.value > 0);

  // Deudas pendientes (jugadores con pagos atrasados) - LÓGICA CORREGIDA
  const pendingDebts = useMemo(() => {
    const debtMap = {};
    const activePlayers = players.filter(p => p.activo === true);
    
    activePlayers.forEach(player => {
      const playerPayments = filteredPayments.filter(p => p.jugador_id === player.id);
      
      // Verificar si tiene pago único pagado o en revisión
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        (p.estado === "Pagado" || p.estado === "En revisión")
      );
      
      if (hasPagoUnico) {
        // Si tiene pago único, no debe nada
        return;
      }
      
      // Si no tiene pago único, calcular meses pendientes
      const allMonths = ["Junio", "Septiembre", "Diciembre"];
      const pagosPendientes = [];
      let deudaTotal = 0;
      
      allMonths.forEach(mes => {
        // Buscar si hay un pago PAGADO o EN REVISIÓN para este mes
        const pagoPagadoORevision = playerPayments.find(p => 
          p.mes === mes && (p.estado === "Pagado" || p.estado === "En revisión")
        );
        
        // Si ya está pagado o en revisión, NO incluir como pendiente
        if (pagoPagadoORevision) return;
        
        // Calcular cantidad pendiente para este mes
        const cuotas = getCuotasPorCategoriaSync(player.deporte);
        const cantidad = mes === "Junio" ? cuotas.inscripcion : 
                        mes === "Septiembre" ? cuotas.segunda : 
                        cuotas.tercera;
        
        deudaTotal += cantidad;
        pagosPendientes.push({ mes, cantidad });
      });
      
      // Solo agregar al mapa si tiene deudas pendientes
      if (pagosPendientes.length > 0) {
        debtMap[player.id] = {
          jugador_id: player.id,
          jugador_nombre: player.nombre,
          email_padre: player.email_padre,
          deporte: player.deporte,
          deuda_total: deudaTotal,
          pagos_pendientes: pagosPendientes
        };
      }
    });

    return Object.values(debtMap).sort((a, b) => b.deuda_total - a.deuda_total);
  }, [filteredPayments, players]);

  // Monthly income data for chart - DECLARAR ANTES DE SMART ALERTS
  const monthlyIncomeData = useMemo(() => {
    const data = [
      { mes: 'Junio', cuotas: 0, ropa: 0, loteria: 0 },
      { mes: 'Septiembre', cuotas: 0, ropa: 0, loteria: 0 },
      { mes: 'Diciembre', cuotas: 0, ropa: 0, loteria: 0 }
    ];

    filteredPayments.filter(p => p.estado === "Pagado").forEach(p => {
      const monthIndex = data.findIndex(d => d.mes === p.mes);
      if (monthIndex >= 0) {
        data[monthIndex].cuotas += p.cantidad || 0;
      }
    });

    return data;
  }, [filteredPayments]);

  // Comparativa interanual
  const interannualComparison = useMemo(() => {
    const seasonsList = [...new Set([...payments.map(p => p.temporada), ...paymentHistory.map(p => p.temporada)])].filter(Boolean).sort().reverse();
    
    return seasonsList.slice(0, 3).map(season => {
      const seasonPayments = [...payments, ...paymentHistory].filter(p => normalizeTemporada(p.temporada) === normalizeTemporada(season));
      const totalCobrado = seasonPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
      const totalPendiente = seasonPayments.filter(p => p.estado === "Pendiente").reduce((sum, p) => sum + (p.cantidad || 0), 0);
      
      return {
        temporada: season,
        cobrado: totalCobrado,
        pendiente: totalPendiente,
        total: totalCobrado + totalPendiente
      };
    });
  }, [payments, paymentHistory]);

  // Alertas inteligentes
  const smartAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();
    
    // Jugadores sin pagar +30 días
    const playersDelayed30 = pendingDebts.filter(debt => {
      const playerPayments = filteredPayments.filter(p => p.jugador_id === debt.jugador_id);
      const oldestPending = playerPayments.find(p => p.estado === "Pendiente");
      if (oldestPending?.created_date) {
        const daysSince = Math.floor((now - new Date(oldestPending.created_date)) / (1000 * 60 * 60 * 24));
        return daysSince > 30;
      }
      return false;
    });
    
    if (playersDelayed30.length > 0) {
      alerts.push({
        tipo: 'critico',
        icono: '🔴',
        mensaje: `${playersDelayed30.length} jugadores sin pagar desde hace +30 días`,
        accion: 'Ver deudas'
      });
    }
    
    // Mejor mes del año
    if (monthlyIncomeData?.length > 0) {
      const bestMonth = monthlyIncomeData.reduce((max, m) => m.cuotas > max.cuotas ? m : max, monthlyIncomeData[0]);
      if (bestMonth?.cuotas > 0) {
        alerts.push({
          tipo: 'info',
          icono: '🟢',
          mensaje: `Mejor mes: ${bestMonth.mes} (${bestMonth.cuotas.toLocaleString()}€)`,
          accion: null
        });
      }
    }
    
    // Patrocinadores
    const sponsorsActivos = sponsors.filter(s => s.estado === "Activo").length;
    if (sponsorsActivos > 0) {
      alerts.push({
        tipo: 'exito',
        icono: '💼',
        mensaje: `${sponsorsActivos} patrocinadores activos`,
        accion: null
      });
    }
    
    return alerts;
  }, [pendingDebts, monthlyIncomeData, sponsors, filteredPayments]);

  // Top deudores y mejores pagadores
  const topPayersStats = useMemo(() => {
    const familyStats = {};
    
    players.forEach(player => {
      const email = player.email_padre;
      if (!familyStats[email]) {
        familyStats[email] = {
          email,
          nombre: player.nombre_tutor_legal || email,
          totalPagado: 0,
          totalPendiente: 0,
          pagosPuntuales: 0,
          pagosRetrasados: 0,
          jugadores: []
        };
      }
      
      familyStats[email].jugadores.push(player.nombre);
      
      const playerPayments = filteredPayments.filter(p => p.jugador_id === player.id);
      familyStats[email].totalPagado += playerPayments.filter(p => p.estado === "Pagado").reduce((s, p) => s + (p.cantidad || 0), 0);
      familyStats[email].totalPendiente += playerPayments.filter(p => p.estado === "Pendiente").reduce((s, p) => s + (p.cantidad || 0), 0);
    });
    
    const families = Object.values(familyStats);
    const topPayers = families.filter(f => f.totalPagado > 0).sort((a, b) => b.totalPagado - a.totalPagado).slice(0, 5);
    const topDebtors = families.filter(f => f.totalPendiente > 0).sort((a, b) => b.totalPendiente - a.totalPendiente).slice(0, 5);
    
    return { topPayers, topDebtors };
  }, [players, filteredPayments]);

  // Liquidez
  const liquidityStats = useMemo(() => {
    const totalCobrado = stats.totalIngresos;
    const totalGastado = financialTransactions.filter(t => t.tipo === "Gasto" && t.estado === "Completado").reduce((s, t) => s + (t.cantidad || 0), 0);
    const efectivoDisponible = totalCobrado - totalGastado;
    
    // Próximos cobros esperados
    const proximos7dias = filteredPayments.filter(p => p.estado === "En revisión").reduce((s, p) => s + (p.cantidad || 0), 0);
    const proximos30dias = stats.totalPendiente;
    
    return {
      efectivoDisponible,
      totalGastado,
      proximos7dias,
      proximos30dias
    };
  }, [stats, financialTransactions, filteredPayments]);

  // Datos por trimestre
  const quarterlyData = useMemo(() => {
    const quarters = {
      'Q1 (Jun-Ago)': { ingresos: 0, gastos: 0, meses: ['Junio', 'Julio', 'Agosto'] },
      'Q2 (Sep-Nov)': { ingresos: 0, gastos: 0, meses: ['Septiembre', 'Octubre', 'Noviembre'] },
      'Q3 (Dic-Feb)': { ingresos: 0, gastos: 0, meses: ['Diciembre', 'Enero', 'Febrero'] },
      'Q4 (Mar-May)': { ingresos: 0, gastos: 0, meses: ['Marzo', 'Abril', 'Mayo'] }
    };
    
    filteredPayments.filter(p => p.estado === "Pagado").forEach(p => {
      Object.entries(quarters).forEach(([qName, qData]) => {
        if (qData.meses.includes(p.mes)) {
          quarters[qName].ingresos += p.cantidad || 0;
        }
      });
    });
    
    financialTransactions.filter(t => t.tipo === "Gasto" && t.estado === "Completado").forEach(t => {
      const mes = format(new Date(t.fecha), 'MMMM', { locale: es });
      Object.entries(quarters).forEach(([qName, qData]) => {
        if (qData.meses.map(m => m.toLowerCase()).includes(mes.toLowerCase())) {
          quarters[qName].gastos += t.cantidad || 0;
        }
      });
    });
    
    return Object.entries(quarters).map(([name, data]) => ({
      trimestre: name,
      ingresos: data.ingresos,
      gastos: data.gastos,
      balance: data.ingresos - data.gastos
    }));
  }, [filteredPayments, financialTransactions]);

  // Gastos por categoría
  const expensesByCategory = useMemo(() => {
    const categories = {};
    
    financialTransactions.filter(t => t.tipo === "Gasto" && t.estado === "Completado").forEach(t => {
      const cat = t.categoria || "Sin categoría";
      if (!categories[cat]) {
        categories[cat] = 0;
      }
      categories[cat] += t.cantidad || 0;
    });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [financialTransactions]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    const transactions = [];

    // Pagos recientes
    filteredPayments.filter(p => p.estado === "Pagado" && p.fecha_pago).slice(0, 10).forEach(p => {
      transactions.push({
        id: p.id,
        tipo: 'cuota',
        concepto: `Cuota ${p.mes} - ${p.jugador_nombre}`,
        cantidad: p.cantidad,
        fecha: p.fecha_pago,
        estado: 'completado'
      });
    });

    // Pedidos ropa pagados
    filteredClothingOrders.filter(o => o.pagado && o.fecha_pago).slice(0, 5).forEach(o => {
      transactions.push({
        id: o.id,
        tipo: 'ropa',
        concepto: `Equipación - ${o.jugador_nombre}`,
        cantidad: o.precio_total,
        fecha: o.fecha_pago,
        estado: 'completado'
      });
    });

    // Lotería pagada
    lotteryOrders.filter(o => o.pagado).slice(0, 5).forEach(o => {
      transactions.push({
        id: o.id,
        tipo: 'loteria',
        concepto: `Lotería - ${o.jugador_nombre}`,
        cantidad: o.precio_total,
        fecha: o.created_date,
        estado: 'completado'
      });
    });

    // Socios pagados
    filteredClubMembers.filter(m => m.estado_pago === "Pagado" && m.fecha_pago).slice(0, 5).forEach(m => {
      transactions.push({
        id: m.id,
        tipo: 'socio',
        concepto: `Cuota Socio - ${m.nombre_completo}`,
        cantidad: m.cuota_socio || 25,
        fecha: m.fecha_pago,
        estado: 'completado'
      });
    });

    return transactions
      .filter(t => t.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 15);
  }, [filteredPayments, filteredClothingOrders, lotteryOrders, filteredClubMembers]);

  // Export functions
  const exportToCSV = (type) => {
    let csvContent = "";
    let filename = "";

    if (type === "resumen") {
      csvContent = "Concepto,Cobrado,Pendiente,Total\n";
      csvContent += `Cuotas,${stats.cuotas.pagadas},${stats.cuotas.pendientes + stats.cuotas.revision},${stats.cuotas.pagadas + stats.cuotas.pendientes + stats.cuotas.revision}\n`;
      csvContent += `Ropa,${stats.ropa.pagada},${stats.ropa.pendiente},${stats.ropa.pagada + stats.ropa.pendiente}\n`;
      csvContent += `Lotería,${stats.loteria.pagada},${stats.loteria.pendiente},${stats.loteria.pagada + stats.loteria.pendiente}\n`;
      csvContent += `Patrocinios,${stats.patrocinios},0,${stats.patrocinios}\n`;
      csvContent += `Socios,${stats.socios?.pagados || 0},${stats.socios?.pendientes || 0},${(stats.socios?.pagados || 0) + (stats.socios?.pendientes || 0)}\n`;
      csvContent += `TOTAL,${stats.totalIngresos},${stats.totalPendiente},${stats.totalIngresos + stats.totalPendiente}\n`;
      filename = `resumen_financiero_${selectedSeason === "all" ? "todas" : selectedSeason}.csv`;
    } else if (type === "deudas") {
      csvContent = "Jugador,Deporte,Email Padre,Deuda Total,Pagos Pendientes\n";
      pendingDebts.forEach(d => {
        csvContent += `"${d.jugador_nombre}","${d.deporte || ''}","${d.email_padre || ''}",${d.deuda_total},${d.pagos_pendientes.length}\n`;
      });
      filename = `deudas_pendientes_${selectedSeason === "all" ? "todas" : selectedSeason}.csv`;
    } else if (type === "transacciones") {
      csvContent = "Fecha,Tipo,Concepto,Cantidad\n";
      recentTransactions.forEach(t => {
        csvContent += `${t.fecha},"${t.tipo}","${t.concepto}",${t.cantidad}\n`;
      });
      filename = `transacciones_${selectedSeason === "all" ? "todas" : selectedSeason}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (type) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(234, 88, 12); // Orange
    doc.text("CD Bustarviejo", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Temporada: ${selectedSeason === "all" ? "Todas" : selectedSeason}`, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(`Generado: ${format(new Date(), "d MMM yyyy HH:mm", { locale: es })}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    let filename = "";

    if (type === "resumen") {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Resumen Financiero", 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(50);
      
      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y, pageWidth - 40, 8, 'F');
      doc.text("Concepto", 25, y + 5);
      doc.text("Cobrado", 80, y + 5);
      doc.text("Pendiente", 120, y + 5);
      doc.text("Total", 160, y + 5);
      y += 12;

      // Data rows
      const rows = [
        { concepto: "Cuotas", cobrado: stats.cuotas.pagadas, pendiente: stats.cuotas.pendientes + stats.cuotas.revision },
        { concepto: "Ropa", cobrado: stats.ropa.pagada, pendiente: stats.ropa.pendiente },
        { concepto: "Loteria", cobrado: stats.loteria.pagada, pendiente: stats.loteria.pendiente },
        { concepto: "Patrocinios", cobrado: stats.patrocinios, pendiente: 0 },
        { concepto: "Socios", cobrado: stats.socios?.pagados || 0, pendiente: stats.socios?.pendientes || 0 }
      ];

      rows.forEach(row => {
        doc.text(row.concepto, 25, y);
        doc.setTextColor(22, 163, 74); // Green
        doc.text(`${row.cobrado.toLocaleString()} EUR`, 80, y);
        doc.setTextColor(220, 38, 38); // Red
        doc.text(`${row.pendiente.toLocaleString()} EUR`, 120, y);
        doc.setTextColor(50);
        doc.text(`${(row.cobrado + row.pendiente).toLocaleString()} EUR`, 160, y);
        y += 8;
      });

      // Total
      y += 5;
      doc.setDrawColor(200);
      doc.line(20, y, pageWidth - 20, y);
      y += 8;
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("TOTAL", 25, y);
      doc.setTextColor(22, 163, 74);
      doc.text(`${stats.totalIngresos.toLocaleString()} EUR`, 80, y);
      doc.setTextColor(220, 38, 38);
      doc.text(`${stats.totalPendiente.toLocaleString()} EUR`, 120, y);
      doc.setTextColor(0);
      doc.text(`${(stats.totalIngresos + stats.totalPendiente).toLocaleString()} EUR`, 160, y);

      filename = `resumen_financiero_${selectedSeason === "all" ? "todas" : selectedSeason}.pdf`;

    } else if (type === "deudas") {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Listado de Deudas", 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(50);

      if (pendingDebts.length === 0) {
        doc.text("No hay deudas pendientes", 20, y);
      } else {
        // Table header
        doc.setFillColor(254, 226, 226);
        doc.rect(20, y, pageWidth - 40, 8, 'F');
        doc.text("Jugador", 25, y + 5);
        doc.text("Deporte", 90, y + 5);
        doc.text("Deuda", 150, y + 5);
        y += 12;

        pendingDebts.forEach((debt, idx) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(debt.jugador_nombre?.substring(0, 30) || "", 25, y);
          doc.text(debt.deporte?.substring(0, 25) || "", 90, y);
          doc.setTextColor(220, 38, 38);
          doc.text(`${debt.deuda_total.toLocaleString()} EUR`, 150, y);
          doc.setTextColor(50);
          y += 7;
        });

        // Total
        y += 5;
        doc.setDrawColor(200);
        doc.line(20, y, pageWidth - 20, y);
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38);
        const totalDeuda = pendingDebts.reduce((sum, d) => sum + d.deuda_total, 0);
        doc.text(`Total deuda: ${totalDeuda.toLocaleString()} EUR (${pendingDebts.length} jugadores)`, 25, y);
      }

      filename = `deudas_pendientes_${selectedSeason === "all" ? "todas" : selectedSeason}.pdf`;

    } else if (type === "transacciones") {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Historial de Transacciones", 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(50);

      if (recentTransactions.length === 0) {
        doc.text("No hay transacciones recientes", 20, y);
      } else {
        // Table header
        doc.setFillColor(220, 252, 231);
        doc.rect(20, y, pageWidth - 40, 8, 'F');
        doc.text("Fecha", 25, y + 5);
        doc.text("Concepto", 60, y + 5);
        doc.text("Cantidad", 160, y + 5);
        y += 12;

        recentTransactions.forEach((t, idx) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(t.fecha ? format(new Date(t.fecha), "dd/MM/yy") : "-", 25, y);
          doc.text(t.concepto?.substring(0, 45) || "", 60, y);
          doc.setTextColor(22, 163, 74);
          doc.text(`+${t.cantidad?.toLocaleString()} EUR`, 160, y);
          doc.setTextColor(50);
          y += 7;
        });

        // Total
        y += 5;
        doc.setDrawColor(200);
        doc.line(20, y, pageWidth - 20, y);
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(22, 163, 74);
        const totalTrans = recentTransactions.reduce((sum, t) => sum + (t.cantidad || 0), 0);
        doc.text(`Total: ${totalTrans.toLocaleString()} EUR`, 25, y);
      }

      filename = `transacciones_${selectedSeason === "all" ? "todas" : selectedSeason}.pdf`;
    }

    doc.save(filename);
  };

  const tipoIcons = {
    cuota: <CreditCard className="w-4 h-4 text-blue-600" />,
    ropa: <ShoppingBag className="w-4 h-4 text-orange-600" />,
    loteria: <Clover className="w-4 h-4 text-green-600" />,
    patrocinio: <Building2 className="w-4 h-4 text-purple-600" />,
    socio: <Users className="w-4 h-4 text-pink-600" />
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">💰 Panel Financiero</h1>
          <p className="text-slate-600 text-sm">Control completo de ingresos y gastos del club</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Refrescar'}
          </Button>
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.map(s => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "Todas" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Porcentaje de Impagados por Categoría */}
      {useMemo(() => {
        const categoryStats = {};
        const activePlayers = players.filter(p => p.activo === true);
        
        activePlayers.forEach(player => {
          const categoria = player.deporte;
          if (!categoryStats[categoria]) {
            categoryStats[categoria] = {
              total: 0,
              pagados: 0,
              pendientes: 0
            };
          }
          
          categoryStats[categoria].total++;
          
          const playerPayments = filteredPayments.filter(p => p.jugador_id === player.id);
          
          // Verificar si tiene pago único pagado
          const hasPagoUnico = playerPayments.some(p => 
            (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
            p.estado === "Pagado"
          );
          
          if (hasPagoUnico) {
            categoryStats[categoria].pagados++;
          } else {
            // Verificar si tiene todos los pagos mensuales pagados
            const allMonths = ["Junio", "Septiembre", "Diciembre"];
            const mesesPagados = playerPayments
              .filter(p => p.estado === "Pagado")
              .map(p => p.mes);
            
            if (allMonths.every(mes => mesesPagados.includes(mes))) {
              categoryStats[categoria].pagados++;
            } else {
              categoryStats[categoria].pendientes++;
            }
          }
        });
        
        const categoriesWithData = Object.entries(categoryStats)
          .map(([categoria, stats]) => ({
            categoria,
            porcentajeImpagados: stats.total > 0 ? ((stats.pendientes / stats.total) * 100).toFixed(0) : 0,
            jugadoresTotales: stats.total,
            jugadoresImpagados: stats.pendientes,
            jugadoresPagados: stats.pagados
          }))
          .sort((a, b) => b.porcentajeImpagados - a.porcentajeImpagados);
        
        if (categoriesWithData.length === 0) return null;
        
        return (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-600" />
                Porcentaje de Impagados por Categoría
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoriesWithData.map(cat => {
                  const porcentaje = parseInt(cat.porcentajeImpagados);
                  const color = porcentaje > 50 ? 'red' : porcentaje > 25 ? 'orange' : 'green';
                  
                  return (
                    <div key={cat.categoria} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-900">
                          {cat.categoria.replace('Fútbol ', '').replace(' (Mixto)', '')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">
                            {cat.jugadoresImpagados} de {cat.jugadoresTotales}
                          </span>
                          <Badge className={`
                            ${color === 'red' ? 'bg-red-100 text-red-700' : 
                              color === 'orange' ? 'bg-orange-100 text-orange-700' : 
                              'bg-green-100 text-green-700'}
                          `}>
                            {porcentaje}%
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            color === 'red' ? 'bg-red-500' : 
                            color === 'orange' ? 'bg-orange-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      }, [players, filteredPayments])}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-800">Total Cobrado</span>
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-green-700">{stats.totalIngresos.toLocaleString()}€</div>
            <p className="text-[10px] text-green-600 mt-1">Ingresos confirmados</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-red-800">Pendiente</span>
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-red-700">{stats.totalPendiente.toLocaleString()}€</div>
            <p className="text-[10px] text-red-600 mt-1">{pendingDebts.length} jugadores con deuda</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-800">Patrocinios</span>
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-purple-700">{stats.patrocinios.toLocaleString()}€</div>
            <p className="text-[10px] text-purple-600 mt-1">{sponsors.filter(s => s.estado === "Activo").length} activos</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-800">Tasa Cobro</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-blue-700">
              {stats.totalIngresos + stats.totalPendiente > 0 
                ? ((stats.totalIngresos / (stats.totalIngresos + stats.totalPendiente)) * 100).toFixed(0) 
                : 0}%
            </div>
            <p className="text-[10px] text-blue-600 mt-1">del total esperado</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Forecasting Button */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Análisis Financiero con IA</h3>
                <p className="text-sm text-purple-700">Previsiones, flujo de caja, escenarios e insights inteligentes</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAIForecasting(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Abrir Análisis IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertas Inteligentes */}
      {smartAlerts.length > 0 && (
        <div className="space-y-2">
          {smartAlerts.map((alert, idx) => (
            <Card key={idx} className={`border-2 ${
              alert.tipo === 'critico' ? 'border-red-300 bg-red-50' :
              alert.tipo === 'info' ? 'border-blue-300 bg-blue-50' :
              'border-green-300 bg-green-50'
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{alert.icono}</span>
                  <p className="font-semibold">{alert.mensaje}</p>
                </div>
                {alert.accion && (
                  <Button size="sm" variant="outline">
                    {alert.accion}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="ejecutivo" className="w-full">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="ejecutivo" className="flex-1">🎯 Ejecutivo</TabsTrigger>
          <TabsTrigger value="ingresos" className="flex-1">📊 Ingresos</TabsTrigger>
          <TabsTrigger value="liquidez" className="flex-1">💧 Liquidez</TabsTrigger>
          <TabsTrigger value="comparativa" className="flex-1">📈 Comparativa</TabsTrigger>
          <TabsTrigger value="ranking" className="flex-1">🏆 Ranking</TabsTrigger>
          <TabsTrigger value="presupuesto" className="flex-1">💰 Presupuesto</TabsTrigger>
          <TabsTrigger value="movimientos" className="flex-1">📝 Movimientos</TabsTrigger>
          <TabsTrigger value="conciliacion" className="flex-1">🤖 Conciliación</TabsTrigger>
          <TabsTrigger value="deudas" className="flex-1">⚠️ Deudas</TabsTrigger>
          <TabsTrigger value="exportar" className="flex-1">📥 Exportar</TabsTrigger>
        </TabsList>

        {/* TAB: DASHBOARD EJECUTIVO */}
        <TabsContent value="ejecutivo" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* KPI: Tasa de Cobro */}
            <Card className="border-none shadow-2xl bg-gradient-to-br from-green-500 to-green-700">
              <CardContent className="pt-8 pb-8 text-center text-white">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <p className="text-sm font-medium opacity-90 mb-2">Tasa de Cobro</p>
                <p className="text-5xl font-bold mb-1">
                  {stats.totalIngresos + stats.totalPendiente > 0 
                    ? ((stats.totalIngresos / (stats.totalIngresos + stats.totalPendiente)) * 100).toFixed(0) 
                    : 0}%
                </p>
                <p className="text-xs opacity-75">del total esperado</p>
              </CardContent>
            </Card>

            {/* KPI: Liquidez */}
            <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-500 to-blue-700">
              <CardContent className="pt-8 pb-8 text-center text-white">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <p className="text-sm font-medium opacity-90 mb-2">Liquidez Actual</p>
                <p className="text-5xl font-bold mb-1">{liquidityStats.efectivoDisponible.toLocaleString()}€</p>
                <p className="text-xs opacity-75">efectivo disponible</p>
              </CardContent>
            </Card>

            {/* KPI: Crecimiento */}
            <Card className="border-none shadow-2xl bg-gradient-to-br from-purple-500 to-purple-700">
              <CardContent className="pt-8 pb-8 text-center text-white">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <p className="text-sm font-medium opacity-90 mb-2">Crecimiento</p>
                <p className="text-5xl font-bold mb-1">
                  {interannualComparison.length >= 2 
                    ? (((interannualComparison[0].cobrado - interannualComparison[1].cobrado) / interannualComparison[1].cobrado) * 100).toFixed(0)
                    : 0}%
                </p>
                <p className="text-xs opacity-75">vs temporada anterior</p>
              </CardContent>
            </Card>
          </div>

          {/* Resumen Visual */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg">
              <CardContent className="pt-4 text-center">
                <ArrowUpRight className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Total Cobrado</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalIngresos.toLocaleString()}€</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg">
              <CardContent className="pt-4 text-center">
                <ArrowDownRight className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Pendiente</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalPendiente.toLocaleString()}€</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg">
              <CardContent className="pt-4 text-center">
                <Wallet className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Gastado</p>
                <p className="text-2xl font-bold text-blue-600">{liquidityStats.totalGastado.toLocaleString()}€</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg">
              <CardContent className="pt-4 text-center">
                <Building2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Patrocinios</p>
                <p className="text-2xl font-bold text-purple-600">{stats.patrocinios.toLocaleString()}€</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Ingresos vs Gastos */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>💰 Ingresos vs Gastos por Trimestre</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="trimestre" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()}€`} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#16a34a" name="Ingresos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="#dc2626" name="Gastos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: LIQUIDEZ */}
        <TabsContent value="liquidez" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Wallet className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-blue-800 font-medium mb-1">Efectivo Disponible</p>
                  <p className="text-3xl font-bold text-blue-700">{liquidityStats.efectivoDisponible.toLocaleString()}€</p>
                  <p className="text-xs text-blue-600 mt-1">Cobrado - Gastado</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="w-10 h-10 text-green-600 mx-auto mb-3" />
                  <p className="text-sm text-green-800 font-medium mb-1">Esperado 7 días</p>
                  <p className="text-3xl font-bold text-green-700">{liquidityStats.proximos7dias.toLocaleString()}€</p>
                  <p className="text-xs text-green-600 mt-1">En revisión</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="w-10 h-10 text-orange-600 mx-auto mb-3" />
                  <p className="text-sm text-orange-800 font-medium mb-1">Esperado 30 días</p>
                  <p className="text-3xl font-bold text-orange-700">{liquidityStats.proximos30dias.toLocaleString()}€</p>
                  <p className="text-xs text-orange-600 mt-1">Pendientes totales</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingDown className="w-10 h-10 text-red-600 mx-auto mb-3" />
                  <p className="text-sm text-red-800 font-medium mb-1">Total Gastado</p>
                  <p className="text-3xl font-bold text-red-700">{liquidityStats.totalGastado.toLocaleString()}€</p>
                  <p className="text-xs text-red-600 mt-1">Gastos confirmados</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Flujo de Caja */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>💧 Análisis de Flujo de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="font-semibold">Efectivo Actual:</span>
                  <span className="text-2xl font-bold text-blue-700">{liquidityStats.efectivoDisponible.toLocaleString()}€</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <span className="font-semibold">+ Cobros Esperados (30 días):</span>
                  <span className="text-2xl font-bold text-green-700">+{liquidityStats.proximos30dias.toLocaleString()}€</span>
                </div>
                <div className="h-px bg-slate-300"></div>
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <span className="font-semibold text-lg">Proyección Liquidez:</span>
                  <span className="text-3xl font-bold text-purple-700">{(liquidityStats.efectivoDisponible + liquidityStats.proximos30dias).toLocaleString()}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gastos por Categoría */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>📊 Desglose de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {expensesByCategory.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className="text-lg font-bold text-red-600">{cat.value.toLocaleString()}€</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">TOTAL GASTADO:</span>
                      <span className="text-2xl font-bold text-red-700">{liquidityStats.totalGastado.toLocaleString()}€</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No hay gastos registrados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: COMPARATIVA INTERANUAL */}
        <TabsContent value="comparativa" className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>📈 Comparativa de Temporadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={interannualComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="temporada" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()}€`} />
                  <Legend />
                  <Bar dataKey="cobrado" fill="#16a34a" name="Cobrado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendiente" fill="#dc2626" name="Pendiente" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {interannualComparison.map((season, idx) => {
              const isCurrentSeason = season.temporada === currentSeason;
              const prevSeason = interannualComparison[idx + 1];
              const crecimiento = prevSeason ? (((season.cobrado - prevSeason.cobrado) / prevSeason.cobrado) * 100).toFixed(1) : null;
              
              return (
                <Card key={season.temporada} className={`border-2 ${isCurrentSeason ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-slate-900">{season.temporada}</p>
                      {isCurrentSeason && <Badge className="bg-green-600">Actual</Badge>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Cobrado:</span>
                        <span className="font-bold text-green-600">{season.cobrado.toLocaleString()}€</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Pendiente:</span>
                        <span className="font-bold text-red-600">{season.pendiente.toLocaleString()}€</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="font-bold">Total:</span>
                        <span className="font-bold">{season.total.toLocaleString()}€</span>
                      </div>
                      {crecimiento !== null && (
                        <div className={`text-center text-sm font-bold ${parseFloat(crecimiento) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(crecimiento) >= 0 ? '↑' : '↓'} {Math.abs(crecimiento)}% vs anterior
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB: RANKING */}
        <TabsContent value="ranking" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Pagadores */}
            <Card className="border-2 border-green-300">
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Award className="w-6 h-6" />
                  🏆 Mejores Pagadores
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {topPayersStats.topPayers.length > 0 ? (
                  <div className="space-y-3">
                    {topPayersStats.topPayers.map((family, idx) => (
                      <div key={family.email} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-600' : 'bg-green-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{family.nombre}</p>
                          <p className="text-xs text-slate-600">{family.jugadores.length} jugador(es)</p>
                        </div>
                        <p className="text-lg font-bold text-green-700">{family.totalPagado.toLocaleString()}€</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No hay datos</p>
                )}
              </CardContent>
            </Card>

            {/* Top Deudores */}
            <Card className="border-2 border-red-300">
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertCircle className="w-6 h-6" />
                  ⚠️ Mayores Deudas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {topPayersStats.topDebtors.length > 0 ? (
                  <div className="space-y-3">
                    {topPayersStats.topDebtors.map((family, idx) => (
                      <div key={family.email} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{family.nombre}</p>
                          <p className="text-xs text-slate-600">{family.jugadores.length} jugador(es)</p>
                        </div>
                        <p className="text-lg font-bold text-red-700">{family.totalPendiente.toLocaleString()}€</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-semibold">¡No hay deudas!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ingresos Tab */}
        <TabsContent value="ingresos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart - Income by Concept */}
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Ingresos por Concepto</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeByConceptData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={incomeByConceptData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toLocaleString()}€`}
                        outerRadius={90}
                        dataKey="value"
                      >
                        {incomeByConceptData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toLocaleString()}€`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    No hay datos de ingresos
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Monthly Income */}
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Cuotas por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyIncomeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString()}€`} />
                    <Bar dataKey="cuotas" fill={COLORS.cuotas} name="Cuotas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Concept Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-slate-900">Cuotas</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cobrado:</span>
                    <span className="font-medium text-green-600">{stats.cuotas.pagadas.toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendiente:</span>
                    <span className="font-medium text-red-600">{(stats.cuotas.pendientes + stats.cuotas.revision).toLocaleString()}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-slate-900">Ropa</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cobrado:</span>
                    <span className="font-medium text-green-600">{stats.ropa.pagada.toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendiente:</span>
                    <span className="font-medium text-red-600">{stats.ropa.pendiente.toLocaleString()}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clover className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-slate-900">Lotería</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cobrado:</span>
                    <span className="font-medium text-green-600">{stats.loteria.pagada.toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendiente:</span>
                    <span className="font-medium text-red-600">{stats.loteria.pendiente.toLocaleString()}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-slate-900">Patrocinios</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total:</span>
                    <span className="font-medium text-purple-600">{stats.patrocinios.toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Activos:</span>
                    <span className="font-medium">{sponsors.filter(s => s.estado === "Activo").length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-pink-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-pink-600" />
                  <span className="font-semibold text-slate-900">Socios</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cobrado:</span>
                    <span className="font-medium text-green-600">{(stats.socios?.pagados || 0).toLocaleString()}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendiente:</span>
                    <span className="font-medium text-red-600">{(stats.socios?.pendientes || 0).toLocaleString()}€</span>
                  </div>
                  {stats.socios?.revision > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">En revisión:</span>
                      <span className="font-medium text-yellow-600">{stats.socios.revision}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total socios:</span>
                    <span className="font-medium">{stats.socios?.total || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Presupuesto Tab */}
        <TabsContent value="presupuesto" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                Gestión de Presupuestos - Temporada {currentSeason}
              </h2>
            </div>
            {!activeBudget && (
              <Button 
                onClick={() => {
                  setNewBudgetData({ temporada: currentSeason, nombre: "Presupuesto Principal" });
                  setShowNewBudget(true);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Presupuesto
              </Button>
            )}
          </div>

          {activeBudget ? (
            <BudgetManager
              budget={activeBudget}
              onUpdate={handleUpdateBudget}
              historicalTransactions={financialTransactions}
              historicalBudgets={budgets}
            />
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <Wallet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  No hay presupuesto para esta temporada
                </h3>
                <p className="text-slate-600 mb-4">
                  Crea un presupuesto para gestionar ingresos y gastos del club
                </p>
                <Button 
                  onClick={() => {
                    setNewBudgetData({ temporada: currentSeason, nombre: "Presupuesto Principal" });
                    setShowNewBudget(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Presupuesto
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Movimientos Financieros Tab */}
        <TabsContent value="movimientos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Movimientos Financieros - {currentSeason}
            </h2>
            <Button 
              onClick={() => setShowTransactionForm(!showTransactionForm)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </div>

          {showTransactionForm ? (
            <TransactionForm
              partidas={activeBudget?.partidas || []}
              temporada={currentSeason}
              onSubmit={(data) => createTransactionMutation.mutate(data)}
              onCancel={() => setShowTransactionForm(false)}
              isSubmitting={createTransactionMutation.isPending}
            />
          ) : (
            <TransactionList
              transactions={financialTransactions.filter(t => t.temporada === currentSeason)}
              onDelete={(id) => deleteTransactionMutation.mutate(id)}
              onExport={handleExportFinancialTransactions}
            />
          )}

          {/* Documentos adjuntos */}
          {financialTransactions.filter(t => t.documento_url && t.temporada === currentSeason).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  Documentos y Facturas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {financialTransactions
                    .filter(t => t.documento_url && t.temporada === currentSeason)
                    .slice(0, 8)
                    .map(t => (
                      <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => window.open(t.documento_url, '_blank')}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate">{t.documento_nombre || "Documento"}</p>
                              <p className="text-[10px] text-slate-500 truncate">{t.concepto}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Conciliación IA Tab */}
        <TabsContent value="conciliacion" className="space-y-4">
          <Card className="border-2 border-purple-300 bg-purple-50 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Upload className="w-8 h-8 text-purple-600" />
                <div className="flex-1">
                  <h3 className="font-bold text-purple-900">Importar Extracto Bancario</h3>
                  <p className="text-sm text-purple-700">Sube tu extracto en formato CSV para conciliar automáticamente</p>
                </div>
                <Button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setUploadedBankStatement(file);
                        toast.success("Archivo cargado - funcionalidad próximamente");
                      }
                    };
                    input.click();
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir CSV
                </Button>
              </div>
              {uploadedBankStatement && (
                <div className="bg-white rounded-lg p-3 border-2 border-purple-300">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium">{uploadedBankStatement.name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <AIReconciliation
            payments={payments}
            players={players}
            financialTransactions={financialTransactions}
            onReconcile={() => {
              queryClient.invalidateQueries({ queryKey: ['payments'] });
              queryClient.invalidateQueries({ queryKey: ['financialTransactions'] });
            }}
          />
        </TabsContent>

        {/* Deudas Tab */}
        <TabsContent value="deudas" className="space-y-4">
          <Card className="border-none shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Jugadores con Pagos Pendientes ({pendingDebts.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCommunicationAssistant(true)}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enviar Recordatorios IA
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToCSV("deudas")}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingDebts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>¡No hay deudas pendientes!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {pendingDebts.map((debt) => (
                    <div key={debt.jugador_id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{debt.jugador_nombre}</p>
                          <p className="text-xs text-slate-600">{debt.deporte}</p>
                          {debt.email_padre && (
                            <p className="text-xs text-slate-500 mt-1">📧 {debt.email_padre}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-red-600">{debt.deuda_total.toLocaleString()}€</p>
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            {debt.pagos_pendientes.length} pago(s)
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {debt.pagos_pendientes.map((p, idx) => (
                          <Badge key={idx} className="bg-red-100 text-red-700 text-xs">
                            {p.mes}: {p.cantidad}€
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exportar Tab */}
        <TabsContent value="exportar" className="space-y-4">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Generar Informes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-dashed border-blue-300 hover:border-blue-500 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Resumen Financiero</h3>
                    <p className="text-xs text-slate-600 mb-3">Ingresos y pendientes por concepto</p>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm" onClick={() => exportToCSV("resumen")}>
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                      <Button className="flex-1 bg-blue-800 hover:bg-blue-900" size="sm" onClick={() => exportToPDF("resumen")}>
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed border-red-300 hover:border-red-500 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Listado de Deudas</h3>
                    <p className="text-xs text-slate-600 mb-3">Jugadores con pagos pendientes</p>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-red-600 hover:bg-red-700" size="sm" onClick={() => exportToCSV("deudas")}>
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                      <Button className="flex-1 bg-red-800 hover:bg-red-900" size="sm" onClick={() => exportToPDF("deudas")}>
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed border-green-300 hover:border-green-500 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Receipt className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Transacciones</h3>
                    <p className="text-xs text-slate-600 mb-3">Historial de cobros recientes</p>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" size="sm" onClick={() => exportToCSV("transacciones")}>
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                      <Button className="flex-1 bg-green-800 hover:bg-green-900" size="sm" onClick={() => exportToPDF("transacciones")}>
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900 mb-2">💡 Consejo:</p>
                <p>Los informes se generan con los datos de la temporada seleccionada ({selectedSeason === "all" ? "todas las temporadas" : selectedSeason}). Puedes cambiar el filtro en la parte superior de la página.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog nuevo presupuesto */}
      <Dialog open={showNewBudget} onOpenChange={setShowNewBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Temporada</Label>
              <Input
                value={newBudgetData.temporada}
                onChange={(e) => setNewBudgetData({...newBudgetData, temporada: e.target.value})}
                placeholder={currentSeason}
              />
            </div>
            <div>
              <Label>Nombre del Presupuesto</Label>
              <Input
                value={newBudgetData.nombre}
                onChange={(e) => setNewBudgetData({...newBudgetData, nombre: e.target.value})}
                placeholder="Presupuesto Principal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBudget(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateBudget}
              disabled={createBudgetMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {createBudgetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Presupuesto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asistente de Comunicación IA */}
      <AICommunicationAssistant
        open={showCommunicationAssistant}
        onClose={() => setShowCommunicationAssistant(false)}
      />

      {/* Análisis Financiero IA */}
      <AIFinancialForecasting
        open={showAIForecasting}
        onClose={() => setShowAIForecasting(false)}
      />
    </div>
  );
}