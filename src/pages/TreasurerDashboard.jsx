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
  TrendingUp, DollarSign, Users, AlertCircle, CheckCircle2, Clock, 
  Download, FileText, CreditCard, ShoppingBag, Clover, Building2,
  ArrowUpRight, ArrowDownRight, Receipt, Calendar, Wallet, Plus, Loader2, PieChart as PieChartIcon
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import BudgetManager from "../components/financial/BudgetManager";
import TransactionForm from "../components/financial/TransactionForm";
import TransactionList from "../components/financial/TransactionList";

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
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
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
    queryFn: () => base44.entities.Payment.list('-created_date'),
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

  const activeBudget = budgets.find(b => b.activo && b.temporada === currentSeason) || budgets[0];

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
      
      if (data.partida_id && activeBudget) {
        const updatedPartidas = activeBudget.partidas.map(p => {
          if (p.id === data.partida_id) {
            return {
              ...p,
              ejecutado: (p.ejecutado || 0) + data.cantidad
            };
          }
          return p;
        });
        await base44.entities.Budget.update(activeBudget.id, { partidas: updatedPartidas });
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
      
      if (transaction?.partida_id && activeBudget) {
        const updatedPartidas = activeBudget.partidas.map(p => {
          if (p.id === transaction.partida_id) {
            return {
              ...p,
              ejecutado: Math.max(0, (p.ejecutado || 0) - transaction.cantidad)
            };
          }
          return p;
        });
        await base44.entities.Budget.update(activeBudget.id, { partidas: updatedPartidas });
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
    if (activeBudget) {
      updateBudgetMutation.mutate({
        id: activeBudget.id,
        data: { ...activeBudget, ...updates }
      });
    }
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
    if (selectedSeason === "all") return clothingOrders;
    return clothingOrders.filter(o => o.temporada === selectedSeason);
  }, [clothingOrders, selectedSeason]);

  const filteredClubMembers = useMemo(() => {
    if (selectedSeason === "all") return clubMembers;
    return clubMembers.filter(m => m.temporada === selectedSeason);
  }, [clubMembers, selectedSeason]);

  // Calculate financial stats
  const stats = useMemo(() => {
    // Cuotas
    const cuotasPagadas = filteredPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
    const cuotasPendientes = filteredPayments.filter(p => p.estado === "Pendiente").reduce((sum, p) => sum + (p.cantidad || 0), 0);
    const cuotasRevision = filteredPayments.filter(p => p.estado === "En revisión").reduce((sum, p) => sum + (p.cantidad || 0), 0);

    // Ropa
    const ropaPagada = filteredClothingOrders.filter(o => o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);
    const ropaPendiente = filteredClothingOrders.filter(o => !o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);

    // Lotería
    const loteriaPagada = lotteryOrders.filter(o => o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);
    const loteriaPendiente = lotteryOrders.filter(o => !o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);

    // Patrocinios
    const patrociniosActivos = sponsors.filter(s => s.estado === "Activo");
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
  }, [filteredPayments, filteredClothingOrders, lotteryOrders, sponsors, filteredClubMembers]);

  // Income by concept for pie chart
  const incomeByConceptData = [
    { name: 'Cuotas', value: stats.cuotas.pagadas, color: COLORS.cuotas },
    { name: 'Ropa', value: stats.ropa.pagada, color: COLORS.ropa },
    { name: 'Lotería', value: stats.loteria.pagada, color: COLORS.loteria },
    { name: 'Patrocinios', value: stats.patrocinios, color: COLORS.patrocinios },
    { name: 'Socios', value: stats.socios?.pagados || 0, color: '#ec4899' }
  ].filter(d => d.value > 0);

  // Deudas pendientes (jugadores con pagos atrasados)
  const pendingDebts = useMemo(() => {
    const debtMap = {};
    
    filteredPayments.filter(p => p.estado === "Pendiente").forEach(p => {
      if (!debtMap[p.jugador_id]) {
        const player = players.find(pl => pl.id === p.jugador_id);
        debtMap[p.jugador_id] = {
          jugador_id: p.jugador_id,
          jugador_nombre: p.jugador_nombre,
          email_padre: player?.email_padre,
          deporte: player?.deporte,
          deuda_total: 0,
          pagos_pendientes: []
        };
      }
      debtMap[p.jugador_id].deuda_total += p.cantidad || 0;
      debtMap[p.jugador_id].pagos_pendientes.push(p);
    });

    return Object.values(debtMap).sort((a, b) => b.deuda_total - a.deuda_total);
  }, [filteredPayments, players]);

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

  // Monthly income data for chart
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="ingresos" className="w-full">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="ingresos" className="flex-1">📊 Ingresos</TabsTrigger>
          <TabsTrigger value="presupuesto" className="flex-1">💰 Presupuesto</TabsTrigger>
          <TabsTrigger value="movimientos" className="flex-1">📝 Movimientos</TabsTrigger>
          <TabsTrigger value="deudas" className="flex-1">⚠️ Deudas</TabsTrigger>
          <TabsTrigger value="exportar" className="flex-1">📥 Exportar</TabsTrigger>
        </TabsList>

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

        {/* Deudas Tab */}
        <TabsContent value="deudas" className="space-y-4">
          <Card className="border-none shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Jugadores con Pagos Pendientes ({pendingDebts.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportToCSV("deudas")}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
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
    </div>
  );
}