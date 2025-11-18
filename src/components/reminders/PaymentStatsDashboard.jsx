import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Users, Euro, TrendingUp } from "lucide-react";

export default function PaymentStatsDashboard({ payments, players, currentSeason }) {
  // Filtrar por temporada actual
  const seasonPayments = payments.filter(p => p.temporada === currentSeason);
  
  // Estadísticas generales
  const totalPlayers = players.filter(p => p.activo).length;
  const playersWithPayments = new Set(seasonPayments.map(p => p.jugador_id)).size;
  const playersWithoutPayments = totalPlayers - playersWithPayments;
  
  // Por estado
  const pendingPayments = seasonPayments.filter(p => p.estado === "Pendiente");
  const reviewPayments = seasonPayments.filter(p => p.estado === "En revisión");
  const paidPayments = seasonPayments.filter(p => p.estado === "Pagado");
  
  // Jugadores únicos por estado
  const playersWithPending = new Set(pendingPayments.map(p => p.jugador_id)).size;
  const playersWithReview = new Set(reviewPayments.map(p => p.jugador_id)).size;
  const playersFullyPaid = new Set(paidPayments.map(p => p.jugador_id)).size;
  
  // Dinero
  const totalExpected = totalPlayers * 260; // Aproximado
  const totalReceived = paidPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const totalInReview = reviewPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  
  // Pagos vencidos
  const today = new Date();
  const overduePayments = pendingPayments.filter(p => {
    const vencimientos = {
      "Junio": new Date(today.getFullYear(), 5, 30),
      "Septiembre": new Date(today.getFullYear(), 8, 15),
      "Diciembre": new Date(today.getFullYear(), 11, 15)
    };
    const vencimiento = vencimientos[p.mes];
    return vencimiento && today > vencimiento;
  });
  const playersOverdue = new Set(overduePayments.map(p => p.jugador_id)).size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Jugadores */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-900 mb-1 font-semibold">Total Jugadores</p>
              <p className="text-3xl font-bold text-blue-700">{totalPlayers}</p>
              <p className="text-xs text-blue-600 mt-1">{playersWithoutPayments} sin pagos</p>
            </div>
            <Users className="w-12 h-12 text-blue-600 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Pagos Pendientes */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-900 mb-1 font-semibold">Pendientes</p>
              <p className="text-3xl font-bold text-red-700">{playersWithPending}</p>
              <p className="text-xs text-red-600 mt-1">{pendingPayments.length} cuotas • {totalPending.toFixed(0)}€</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-600 opacity-50" />
          </div>
          {playersOverdue > 0 && (
            <Badge className="mt-2 bg-red-600 text-white">
              ⚠️ {playersOverdue} vencidos
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* En Revisión */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-900 mb-1 font-semibold">En Revisión</p>
              <p className="text-3xl font-bold text-orange-700">{playersWithReview}</p>
              <p className="text-xs text-orange-600 mt-1">{reviewPayments.length} cuotas • {totalInReview.toFixed(0)}€</p>
            </div>
            <Clock className="w-12 h-12 text-orange-600 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Pagados */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-900 mb-1 font-semibold">Pagados</p>
              <p className="text-3xl font-bold text-green-700">{playersFullyPaid}</p>
              <p className="text-xs text-green-600 mt-1">{paidPayments.length} cuotas • {totalReceived.toFixed(0)}€</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-600 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Recaudación */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-900">
            <Euro className="w-5 h-5" />
            Recaudación Temporada {currentSeason}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-purple-700 mb-1">Recaudado</p>
              <p className="text-2xl font-bold text-purple-800">{totalReceived.toFixed(0)}€</p>
            </div>
            <div>
              <p className="text-xs text-purple-700 mb-1">Pendiente</p>
              <p className="text-2xl font-bold text-purple-800">{(totalPending + totalInReview).toFixed(0)}€</p>
            </div>
            <div>
              <p className="text-xs text-purple-700 mb-1">% Recaudado</p>
              <p className="text-2xl font-bold text-purple-800">
                {totalExpected > 0 ? ((totalReceived / totalExpected) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
          <div className="mt-3 bg-purple-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-purple-600 h-full transition-all"
              style={{ width: `${totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Progreso por Mes */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
            <TrendingUp className="w-5 h-5" />
            Progreso por Periodo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {["Junio", "Septiembre", "Diciembre"].map(mes => {
              const mesPagos = seasonPayments.filter(p => p.mes === mes);
              const mesPaid = mesPagos.filter(p => p.estado === "Pagado").length;
              const mesTotal = mesPagos.length;
              const percentage = mesTotal > 0 ? (mesPaid / mesTotal) * 100 : 0;
              
              return (
                <div key={mes}>
                  <p className="text-xs text-slate-700 mb-2">{mes}</p>
                  <p className="text-lg font-bold text-slate-900">{mesPaid}/{mesTotal}</p>
                  <div className="mt-2 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-green-600 h-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}