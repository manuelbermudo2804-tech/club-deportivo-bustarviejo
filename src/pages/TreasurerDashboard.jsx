import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, DollarSign, Users, Building2,
  ArrowUpRight, ArrowDownRight, CreditCard, ShoppingBag, Clover, Calendar, Loader2
} from "lucide-react";
import { getCuotasPorCategoriaSync } from "../components/payments/paymentAmounts";

const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

export default function TreasurerDashboard() {
  const [selectedSeason, setSelectedSeason] = useState("all");
  const currentSeason = getCurrentSeason();

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      return allPayments.filter(p => p.is_deleted !== true);
    },
  });

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
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

  const availableSeasons = useMemo(() => {
    const seasonSet = new Set(payments.map(p => p.temporada).filter(Boolean));
    return ["all", ...Array.from(seasonSet)];
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (selectedSeason === "all") return payments;
    return payments.filter(p => p.temporada === selectedSeason);
  }, [payments, selectedSeason]);

  const filteredClothingOrders = useMemo(() => {
    if (selectedSeason === "all") return clothingOrders;
    return clothingOrders.filter(o => o.temporada === selectedSeason);
  }, [clothingOrders, selectedSeason]);

  const filteredClubMembers = useMemo(() => {
    const activeMembers = clubMembers.filter(m => m.activo !== false);
    if (selectedSeason === "all") return activeMembers;
    return activeMembers.filter(m => m.temporada === selectedSeason);
  }, [clubMembers, selectedSeason]);

  const stats = useMemo(() => {
    const activePlayers = players.filter(p => p.activo === true);
    let cuotasPendientesCalculadas = 0;
    
    activePlayers.forEach(player => {
      const playerPayments = filteredPayments.filter(p => p.jugador_id === player.id);
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        (p.estado === "Pagado" || p.estado === "En revisión")
      );
      
      if (!hasPagoUnico) {
        const allMonths = ["Junio", "Septiembre", "Diciembre"];
        const mesesPagados = playerPayments
          .filter(p => p.estado === "Pagado" || p.estado === "En revisión")
          .map(p => p.mes);
        const mesesPendientes = allMonths.filter(mes => !mesesPagados.includes(mes));
        
        mesesPendientes.forEach(mes => {
          const cuotas = getCuotasPorCategoriaSync(player.deporte);
          const cantidad = mes === "Junio" ? cuotas.inscripcion : 
                          mes === "Septiembre" ? cuotas.segunda : cuotas.tercera;
          cuotasPendientesCalculadas += cantidad;
        });
      }
    });
    
    const cuotasPagadas = filteredPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
    const cuotasRevision = filteredPayments.filter(p => p.estado === "En revisión").reduce((sum, p) => sum + (p.cantidad || 0), 0);
    const ropaPagada = filteredClothingOrders.filter(o => o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);
    const ropaPendiente = filteredClothingOrders.filter(o => !o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);
    const loteriaPagada = lotteryOrders.filter(o => o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);
    const loteriaPendiente = lotteryOrders.filter(o => !o.pagado).reduce((sum, o) => sum + (o.precio_total || 0), 0);
    const patrociniosTotal = sponsors.filter(s => s.estado === "Activo").reduce((sum, s) => sum + (s.monto || 0), 0);
    const sociosPagados = filteredClubMembers.filter(m => m.estado_pago === "Pagado").reduce((sum, m) => sum + (m.cuota_socio || 25), 0);
    const sociosPendientes = filteredClubMembers.filter(m => m.estado_pago === "Pendiente" || m.estado_pago === "En revisión").reduce((sum, m) => sum + (m.cuota_socio || 25), 0);

    const totalIngresos = cuotasPagadas + ropaPagada + loteriaPagada + patrociniosTotal + sociosPagados;
    const totalPendiente = cuotasPendientesCalculadas + cuotasRevision + ropaPendiente + loteriaPendiente + sociosPendientes;

    return {
      cuotas: { pagadas: cuotasPagadas, pendientes: cuotasPendientesCalculadas, revision: cuotasRevision },
      ropa: { pagada: ropaPagada, pendiente: ropaPendiente },
      loteria: { pagada: loteriaPagada, pendiente: loteriaPendiente },
      patrocinios: patrociniosTotal,
      socios: { pagados: sociosPagados, pendientes: sociosPendientes },
      totalIngresos,
      totalPendiente
    };
  }, [filteredPayments, filteredClothingOrders, lotteryOrders, sponsors, filteredClubMembers, players]);

  if (loadingPayments || loadingPlayers) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">💰 Panel Financiero</h1>
          <p className="text-slate-600 text-sm">Control completo de ingresos y gastos del club</p>
        </div>
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
            <p className="text-[10px] text-red-600 mt-1">Por cobrar</p>
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
                <span className="font-medium text-green-600">{stats.socios.pagados.toLocaleString()}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Pendiente:</span>
                <span className="font-medium text-red-600">{stats.socios.pendientes.toLocaleString()}€</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-8 text-center">
          <p className="text-slate-600">Panel simplificado - Muestra resumen de cuotas, ropa, lotería, patrocinios y socios</p>
        </CardContent>
      </Card>
    </div>
  );
}