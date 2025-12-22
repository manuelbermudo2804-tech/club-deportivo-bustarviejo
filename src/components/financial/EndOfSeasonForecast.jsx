import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar as CalendarIcon, Target } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default function EndOfSeasonForecast({ 
  totalIngresos, 
  totalPendiente, 
  totalEsperado, 
  stats, 
  activeSeason,
  payments 
}) {
  const forecast = useMemo(() => {
    if (!activeSeason) return null;

    const now = new Date();
    
    // Calcular fecha fin: usar fecha_fin si existe, sino usar fin de temporada (junio del segundo año)
    let seasonEnd;
    if (activeSeason.fecha_fin) {
      seasonEnd = new Date(activeSeason.fecha_fin);
    } else {
      // La temporada es "2024/2025", el fin es junio 2025 (segundo año)
      const secondYear = activeSeason.temporada.split('/')[1];
      seasonEnd = new Date(`${secondYear}-06-30`);
    }
    
    const daysRemaining = differenceInDays(seasonEnd, now);
    const monthsRemaining = Math.max(0, daysRemaining / 30);

    // Calcular tendencia actual basada en pagos recientes
    const recentPayments = payments.filter(p => {
      if (!p.fecha_pago || p.estado !== "Pagado") return false;
      const paymentDate = new Date(p.fecha_pago);
      const daysSince = differenceInDays(now, paymentDate);
      return daysSince <= 30; // Últimos 30 días
    });

    const recentIncome = recentPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);
    const monthlyAverage = recentIncome; // Promedio del último mes

    // Proyecciones
    const optimistic = totalIngresos + (totalPendiente * 0.9) + stats.cuotasEnRevision; // 90% cobro
    const realistic = totalIngresos + (totalPendiente * 0.65) + (stats.cuotasEnRevision * 0.9); // 65% cobro
    const pessimistic = totalIngresos + (totalPendiente * 0.4) + (stats.cuotasEnRevision * 0.7); // 40% cobro

    const trendBased = totalIngresos + (monthlyAverage * monthsRemaining);

    return {
      daysRemaining,
      monthsRemaining,
      monthlyAverage,
      optimistic,
      realistic,
      pessimistic,
      trendBased,
      recentIncome
    };
  }, [activeSeason, totalIngresos, totalPendiente, stats, payments]);

  if (!forecast) return null;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Predicción Fin de Temporada
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Tiempo restante */}
        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
          <Calendar className="w-8 h-8 text-orange-600" />
          <div>
            <p className="text-sm text-slate-600">Días hasta fin de temporada</p>
            <p className="text-3xl font-bold text-slate-900">{forecast.daysRemaining} días</p>
            <p className="text-xs text-slate-500">≈ {forecast.monthsRemaining.toFixed(1)} meses</p>
          </div>
        </div>

        {/* Tendencia actual */}
        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
          <p className="text-sm text-blue-600 font-semibold mb-2">📈 Tendencia Actual</p>
          <p className="text-slate-700 text-sm mb-3">
            En los últimos 30 días se cobraron <strong className="text-blue-700">{forecast.recentIncome.toFixed(2)}€</strong>
          </p>
          <p className="text-slate-700 text-sm">
            Si este ritmo continúa, se proyecta un total de:{" "}
            <strong className="text-blue-700">{forecast.trendBased.toFixed(2)}€</strong>
          </p>
        </div>

        {/* Escenarios de proyección */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Escenarios Proyectados
          </h4>

          {/* Optimista */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🟢</span>
                <p className="font-bold text-green-900">Optimista</p>
              </div>
              <Badge className="bg-green-600">90% de cobro</Badge>
            </div>
            <p className="text-3xl font-bold text-green-700">{forecast.optimistic.toFixed(2)}€</p>
            <p className="text-xs text-slate-600 mt-1">
              Esperado: {totalEsperado.toFixed(2)}€ → Desviación: {((forecast.optimistic / totalEsperado) * 100 - 100).toFixed(1)}%
            </p>
          </div>

          {/* Realista */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔵</span>
                <p className="font-bold text-blue-900">Realista</p>
              </div>
              <Badge className="bg-blue-600">65% de cobro</Badge>
            </div>
            <p className="text-3xl font-bold text-blue-700">{forecast.realistic.toFixed(2)}€</p>
            <p className="text-xs text-slate-600 mt-1">
              Esperado: {totalEsperado.toFixed(2)}€ → Desviación: {((forecast.realistic / totalEsperado) * 100 - 100).toFixed(1)}%
            </p>
          </div>

          {/* Pesimista */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔴</span>
                <p className="font-bold text-red-900">Pesimista</p>
              </div>
              <Badge className="bg-red-600">40% de cobro</Badge>
            </div>
            <p className="text-3xl font-bold text-red-700">{forecast.pessimistic.toFixed(2)}€</p>
            <p className="text-xs text-slate-600 mt-1">
              Esperado: {totalEsperado.toFixed(2)}€ → Desviación: {((forecast.pessimistic / totalEsperado) * 100 - 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}