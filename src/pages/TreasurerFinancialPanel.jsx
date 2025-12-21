import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, ShoppingBag, Users, TrendingUp, TrendingDown, 
  Download, Euro, Clover, Building2, DollarSign, FileText,
  Calendar, CheckCircle2, Clock, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TreasurerFinancialPanel() {
  const [user, setUser] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);

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
  });

  useEffect(() => {
    const active = seasonConfigs.find(s => s.activa === true);
    setActiveSeason(active);
  }, [seasonConfigs]);

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrders'],
    queryFn: () => base44.entities.ClothingOrder.list(),
  });

  const { data: lotteryOrders = [] } = useQuery({
    queryKey: ['lotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list(),
  });

  const { data: clubMembers = [] } = useQuery({
    queryKey: ['clubMembers'],
    queryFn: () => base44.entities.ClubMember.list(),
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => base44.entities.Sponsor.list(),
  });

  // Cálculos financieros
  const stats = {
    // Cuotas de jugadores
    cuotasPagadas: payments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0),
    cuotasPendientes: payments.filter(p => p.estado === "Pendiente").reduce((sum, p) => sum + (p.cantidad || 0), 0),
    cuotasEnRevision: payments.filter(p => p.estado === "En revisión").reduce((sum, p) => sum + (p.cantidad || 0), 0),
    
    // Pedidos ropa
    ropaTotal: clothingOrders.reduce((sum, o) => sum + (o.precio_final || 0), 0),
    ropaPagada: clothingOrders.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.precio_final || 0), 0),
    ropaPendiente: clothingOrders.filter(o => o.pagado === false).reduce((sum, o) => sum + (o.precio_final || 0), 0),
    
    // Lotería
    loteriaTotal: lotteryOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    loteriaPagada: lotteryOrders.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.total || 0), 0),
    loteriaPendiente: lotteryOrders.filter(o => o.pagado === false).reduce((sum, o) => sum + (o.total || 0), 0),
    
    // Socios
    sociosTotal: clubMembers.filter(m => m.activo !== false).reduce((sum, m) => sum + (m.cuota_pagada || 0), 0),
    sociosPagados: clubMembers.filter(m => m.estado_pago === "Pagado").reduce((sum, m) => sum + (m.cuota_pagada || 0), 0),
    sociosPendientes: clubMembers.filter(m => m.estado_pago === "Pendiente").reduce((sum, m) => sum + (m.cuota_pagada || 0), 0),
    
    // Patrocinios
    patrociniosTotal: sponsors.filter(s => s.estado === "Activo").reduce((sum, s) => sum + (s.monto || 0), 0),
  };

  const totalIngresos = stats.cuotasPagadas + stats.ropaPagada + stats.loteriaPagada + stats.sociosPagados + stats.patrociniosTotal;
  const totalPendiente = stats.cuotasPendientes + stats.cuotasEnRevision + stats.ropaPendiente + stats.loteriaPendiente + stats.sociosPendientes;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">💰 Panel Financiero</h1>
          <p className="text-slate-600 mt-1">Vista operativa de ingresos y gestión de pagos</p>
          {activeSeason && (
            <Badge className="mt-2 bg-green-600">
              Temporada {activeSeason.temporada}
            </Badge>
          )}
        </div>
      </div>

      {/* Resumen Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Total Ingresos Cobrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-900">{totalIngresos.toFixed(2)}€</p>
            <p className="text-xs text-green-600 mt-1">Ingresos confirmados esta temporada</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Total Pendiente de Cobro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-900">{totalPendiente.toFixed(2)}€</p>
            <p className="text-xs text-orange-600 mt-1">Pendientes + En revisión</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Esperado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-900">{(totalIngresos + totalPendiente).toFixed(2)}€</p>
            <p className="text-xs text-blue-600 mt-1">Ingresos totales proyectados</p>
          </CardContent>
        </Card>
      </div>

      {/* Desglose por Conceptos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-orange-600" />
            Desglose de Ingresos por Concepto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cuotas Jugadores */}
          <div className="border-l-4 border-blue-500 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-blue-900">Cuotas de Jugadores</h3>
              </div>
              <Link to={createPageUrl("Payments")}>
                <Button size="sm" variant="outline">
                  Ver detalle
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mt-3">
              <div>
                <p className="text-xs text-slate-600">Cobradas</p>
                <p className="text-lg font-bold text-green-700">{stats.cuotasPagadas.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">En Revisión</p>
                <p className="text-lg font-bold text-orange-700">{stats.cuotasEnRevision.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Pendientes</p>
                <p className="text-lg font-bold text-red-700">{stats.cuotasPendientes.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          {/* Pedidos Ropa */}
          <div className="border-l-4 border-orange-500 bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-orange-900">Pedidos de Equipación</h3>
              </div>
              <Link to={createPageUrl("ClothingOrders")}>
                <Button size="sm" variant="outline">
                  Ver detalle
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mt-3">
              <div>
                <p className="text-xs text-slate-600">Total Pedidos</p>
                <p className="text-lg font-bold text-slate-700">{stats.ropaTotal.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Cobrados</p>
                <p className="text-lg font-bold text-green-700">{stats.ropaPagada.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Pendientes</p>
                <p className="text-lg font-bold text-red-700">{stats.ropaPendiente.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          {/* Lotería */}
          {activeSeason?.loteria_navidad_abierta && (
            <div className="border-l-4 border-green-500 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clover className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-green-900">Lotería de Navidad</h3>
                </div>
                <Link to={createPageUrl("LotteryManagement")}>
                  <Button size="sm" variant="outline">
                    Ver detalle
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                <div>
                  <p className="text-xs text-slate-600">Total Décimos</p>
                  <p className="text-lg font-bold text-slate-700">{stats.loteriaTotal.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Cobrados</p>
                  <p className="text-lg font-bold text-green-700">{stats.loteriaPagada.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Pendientes</p>
                  <p className="text-lg font-bold text-red-700">{stats.loteriaPendiente.toFixed(2)}€</p>
                </div>
              </div>
            </div>
          )}

          {/* Socios */}
          <div className="border-l-4 border-indigo-500 bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-indigo-900">Cuotas de Socios</h3>
              </div>
              <Link to={createPageUrl("ClubMembersManagement")}>
                <Button size="sm" variant="outline">
                  Ver detalle
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mt-3">
              <div>
                <p className="text-xs text-slate-600">Total Cuotas</p>
                <p className="text-lg font-bold text-slate-700">{stats.sociosTotal.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Cobradas</p>
                <p className="text-lg font-bold text-green-700">{stats.sociosPagados.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Pendientes</p>
                <p className="text-lg font-bold text-red-700">{stats.sociosPendientes.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          {/* Patrocinios */}
          <div className="border-l-4 border-purple-500 bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">Patrocinios</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
              <div>
                <p className="text-xs text-slate-600">Patrocinadores Activos</p>
                <p className="text-lg font-bold text-slate-700">{sponsors.filter(s => s.estado === "Activo").length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Total Patrocinios</p>
                <p className="text-lg font-bold text-purple-700">{stats.patrociniosTotal.toFixed(2)}€</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-2xl font-bold text-green-700">{payments.filter(p => p.estado === "Pagado").length}</p>
              <p className="text-xs text-slate-600 mt-1">Pagos Confirmados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-700">{payments.filter(p => p.estado === "En revisión").length}</p>
              <p className="text-xs text-slate-600 mt-1">En Revisión</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-700">{payments.filter(p => p.estado === "Pendiente").length}</p>
              <p className="text-xs text-slate-600 mt-1">Pendientes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accesos Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            Accesos Rápidos de Gestión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link to={createPageUrl("Payments")}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-start">
                <CreditCard className="w-5 h-5 mr-2" />
                Gestionar Pagos Cuotas
              </Button>
            </Link>
            
            <Link to={createPageUrl("ClothingOrders")}>
              <Button className="w-full bg-orange-600 hover:bg-orange-700 justify-start">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Pedidos de Ropa
              </Button>
            </Link>

            {activeSeason?.loteria_navidad_abierta && (
              <Link to={createPageUrl("LotteryManagement")}>
                <Button className="w-full bg-green-600 hover:bg-green-700 justify-start">
                  <Clover className="w-5 h-5 mr-2" />
                  Lotería de Navidad
                </Button>
              </Link>
            )}

            <Link to={createPageUrl("ClubMembersManagement")}>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 justify-start">
                <Users className="w-5 h-5 mr-2" />
                Gestión de Socios
              </Button>
            </Link>

            <Link to={createPageUrl("PaymentHistory")}>
              <Button className="w-full bg-slate-600 hover:bg-slate-700 justify-start">
                <Calendar className="w-5 h-5 mr-2" />
                Histórico de Pagos
              </Button>
            </Link>

            <Link to={createPageUrl("PaymentReminders")}>
              <Button className="w-full bg-yellow-600 hover:bg-yellow-700 justify-start">
                <AlertCircle className="w-5 h-5 mr-2" />
                Recordatorios de Pago
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}