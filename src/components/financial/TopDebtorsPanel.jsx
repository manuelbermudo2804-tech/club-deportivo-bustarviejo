import React from "react";
import { sameSeason } from "@/lib/sameSeason";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TopDebtorsPanel({ players, payments, activeSeason, getImportePorMes, customPlans = [] }) {
  if (!activeSeason) return null;

  const currentSeasonPayments = payments.filter(p => sameSeason(p.temporada, activeSeason.temporada) && p.is_deleted !== true);
  const currentSeasonPlayers = players.filter(p => p.activo === true);
  const currentSeasonPlans = customPlans.filter(p => p.temporada === activeSeason.temporada);

  // Calcular deuda de cada familia
  const familyDebts = {};
  
  currentSeasonPlayers.forEach(player => {
    const playerPayments = currentSeasonPayments.filter(p => p.jugador_id === player.id);
    
    // Verificar si tiene plan especial activo
    const playerActivePlan = currentSeasonPlans.find(p => 
      p.jugador_id === player.id && 
      p.estado === "Activo"
    );

    let deudaTotal = 0;
    let cuotasPendientes = 0;

    if (playerActivePlan && playerActivePlan.cuotas) {
      // PLAN ESPECIAL: Usar cuotas del plan
      const cuotasPendientesPlan = playerActivePlan.cuotas.filter(c => c.pagada !== true);
      cuotasPendientes = cuotasPendientesPlan.length;
      cuotasPendientesPlan.forEach(cuota => {
        deudaTotal += cuota.cantidad || 0;
      });
    } else {
      // Lógica estándar
      const hasPagoUnico = playerPayments.some(p => 
        p.tipo_pago === "Único" || p.tipo_pago === "único"
      );
      
      if (hasPagoUnico) {
        const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
        if (pagoUnico && pagoUnico.estado === "Pendiente") {
          deudaTotal = pagoUnico.cantidad || 0;
          cuotasPendientes = 1;
        }
      } else {
        const mesesPagadosORevision = playerPayments
          .filter(p => (p.estado === "Pagado" || p.estado === "En revisión"))
          .map(p => p.mes);
        
        const allMonths = ["Junio", "Septiembre", "Diciembre"];
        const mesesFaltantes = allMonths.filter(mes => !mesesPagadosORevision.includes(mes));
        
        cuotasPendientes = mesesFaltantes.length;
        mesesFaltantes.forEach(mes => {
          deudaTotal += getImportePorMes(player.deporte, mes);
        });
      }
    }

    if (deudaTotal > 0) {
      const key = player.email_padre;
      if (!familyDebts[key]) {
        familyDebts[key] = {
          email: player.email_padre,
          nombre: player.nombre,
          jugadores: [],
          deuda: 0,
          mesesPendientes: 0
        };
      }
      familyDebts[key].jugadores.push(player.nombre);
      familyDebts[key].deuda += deudaTotal;
      familyDebts[key].mesesPendientes += cuotasPendientes;
    }
  });

  // Top 10 deudores
  const topDebtors = Object.values(familyDebts)
    .sort((a, b) => b.deuda - a.deuda)
    .slice(0, 10);

  if (topDebtors.length === 0) {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-2">¡Sin deudas pendientes!</h3>
          <p className="text-green-700">Todas las familias están al día con los pagos</p>
        </CardContent>
      </Card>
    );
  }

  const totalDeuda = topDebtors.reduce((sum, f) => sum + f.deuda, 0);

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-red-600 to-orange-600 p-4 text-white sm:p-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <div>
              <CardTitle className="break-words text-lg sm:text-xl">Top 10 Deudores</CardTitle>
              <p className="text-sm text-red-100 mt-1">Familias con mayor deuda pendiente</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-red-100">Deuda acumulada (top 10)</p>
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">{totalDeuda.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="space-y-3">
          {topDebtors.map((family, index) => (
            <div 
              key={family.email}
              className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border-2 p-3 transition-all hover:shadow-md sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-4 sm:p-4 ${
                index === 0 ? 'bg-red-50 border-red-300' :
                index === 1 ? 'bg-orange-50 border-orange-300' :
                index === 2 ? 'bg-yellow-50 border-yellow-300' :
                'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Posición */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                index === 0 ? 'bg-red-600 text-white' :
                index === 1 ? 'bg-orange-600 text-white' :
                index === 2 ? 'bg-yellow-600 text-white' :
                'bg-slate-600 text-white'
              }`}>
                {index + 1}
              </div>

              {/* Info Familia */}
              <div className="min-w-0">
                <p className="break-words text-base font-bold leading-snug text-slate-900 sm:text-lg">{family.jugadores[0]}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    {family.jugadores.length} jugador{family.jugadores.length > 1 ? 'es' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {family.mesesPendientes} cuota{family.mesesPendientes > 1 ? 's' : ''} pendiente{family.mesesPendientes > 1 ? 's' : ''}
                  </Badge>
                </div>
                {family.jugadores.length > 1 && (
                  <p className="text-xs text-slate-500 mt-1">
                    + {family.jugadores.slice(1).join(', ')}
                  </p>
                )}
              </div>

              {/* Deuda */}
              <div className="col-start-2 row-start-2 text-left sm:col-auto sm:row-auto sm:text-right">
                <p className="text-xl font-bold leading-none tabular-nums text-red-700 sm:text-2xl">{family.deuda.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
              </div>

              {/* Acciones */}
              <div className="col-span-2 flex min-w-0 justify-stretch gap-2 sm:col-auto sm:justify-end">
                <Link to={createPageUrl("PaymentReminders")} className="w-full sm:w-auto">
                  <Button size="sm" variant="outline" className="w-full gap-2 whitespace-nowrap sm:w-auto">
                    <Mail className="w-3 h-3" />
                    Recordar
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {Object.keys(familyDebts).length > 10 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              Mostrando top 10 de {Object.keys(familyDebts).length} familias con deuda
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}