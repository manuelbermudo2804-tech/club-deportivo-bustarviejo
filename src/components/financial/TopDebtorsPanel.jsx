import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TopDebtorsPanel({ players, payments, activeSeason, getImportePorMes }) {
  if (!activeSeason) return null;

  const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason.temporada && p.is_deleted !== true);
  const currentSeasonPlayers = players.filter(p => p.activo === true);

  // Calcular deuda de cada familia
  const familyDebts = {};
  
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
    
    let deudaTotal = 0;
    mesesFaltantes.forEach(mes => {
      deudaTotal += getImportePorMes(player.deporte, mes);
    });

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
      familyDebts[key].mesesPendientes += mesesFaltantes.length;
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
      <CardHeader className="bg-gradient-to-r from-red-600 to-orange-600 text-white border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <CardTitle className="text-xl">Top 10 Deudores</CardTitle>
              <p className="text-sm text-red-100 mt-1">Familias con mayor deuda pendiente</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-red-100">Deuda acumulada</p>
            <p className="text-2xl font-bold">{totalDeuda.toFixed(2)}€</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {topDebtors.map((family, index) => (
            <div 
              key={family.email}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                index === 0 ? 'bg-red-50 border-red-300' :
                index === 1 ? 'bg-orange-50 border-orange-300' :
                index === 2 ? 'bg-yellow-50 border-yellow-300' :
                'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Posición */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                index === 0 ? 'bg-red-600 text-white' :
                index === 1 ? 'bg-orange-600 text-white' :
                index === 2 ? 'bg-yellow-600 text-white' :
                'bg-slate-600 text-white'
              }`}>
                {index + 1}
              </div>

              {/* Info Familia */}
              <div className="flex-1">
                <p className="font-bold text-slate-900">{family.jugadores[0]}</p>
                <div className="flex items-center gap-2 mt-1">
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
              <div className="text-right">
                <p className="text-2xl font-bold text-red-700">{family.deuda.toFixed(2)}€</p>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <Link to={createPageUrl("PaymentReminders")}>
                  <Button size="sm" variant="outline" className="gap-1">
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