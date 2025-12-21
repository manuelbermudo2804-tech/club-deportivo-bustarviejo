import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, Shield, Zap } from "lucide-react";

export default function FinancialRatios({ totalIngresos, totalPendiente, totalGastos, stats }) {
  // Ratio de liquidez (capacidad de pagar deudas a corto plazo)
  const liquidez = totalGastos > 0 ? (totalIngresos / totalGastos) * 100 : 100;
  
  // Ratio de solvencia (capacidad de cubrir todas las obligaciones)
  const totalActivos = totalIngresos + (totalPendiente * 0.7); // 70% de lo pendiente es recuperable
  const solvencia = totalGastos > 0 ? (totalActivos / totalGastos) * 100 : 100;
  
  // Autonomía financiera (meses que puede operar sin nuevos ingresos)
  const gastoMensual = totalGastos / 9; // Temporada de 9 meses
  const autonomiaMeses = gastoMensual > 0 ? totalIngresos / gastoMensual : 0;
  
  // Eficiencia operativa (cuánto se gasta por cada euro que entra)
  const eficiencia = totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0;

  const getRatioStatus = (value, thresholds) => {
    if (value >= thresholds.excellent) return { color: "green", status: "Excelente", icon: "🟢" };
    if (value >= thresholds.good) return { color: "blue", status: "Bueno", icon: "🔵" };
    if (value >= thresholds.fair) return { color: "yellow", status: "Aceptable", icon: "🟡" };
    return { color: "red", status: "Crítico", icon: "🔴" };
  };

  const liquidezStatus = getRatioStatus(liquidez, { excellent: 150, good: 120, fair: 100 });
  const solvenciaStatus = getRatioStatus(solvencia, { excellent: 200, good: 150, fair: 100 });
  const autonomiaStatus = getRatioStatus(autonomiaMeses, { excellent: 3, good: 2, fair: 1 });
  const eficienciaStatus = getRatioStatus(eficiencia, { excellent: 30, good: 20, fair: 10 });

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Ratios Financieros
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Ratio de Liquidez */}
        <div className="border-2 border-blue-200 rounded-xl p-4 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-slate-900">Ratio de Liquidez</h4>
            </div>
            <Badge className={`bg-${liquidezStatus.color}-600`}>
              {liquidezStatus.icon} {liquidezStatus.status}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-blue-700 mb-2">{liquidez.toFixed(1)}%</p>
          <Progress value={Math.min(liquidez, 200)} className="h-2 mb-2" />
          <p className="text-xs text-slate-600">
            Capacidad de cubrir gastos con ingresos actuales. Óptimo: {'>'} 150%
          </p>
        </div>

        {/* Ratio de Solvencia */}
        <div className="border-2 border-green-200 rounded-xl p-4 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-slate-900">Ratio de Solvencia</h4>
            </div>
            <Badge className={`bg-${solvenciaStatus.color}-600`}>
              {solvenciaStatus.icon} {solvenciaStatus.status}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-green-700 mb-2">{solvencia.toFixed(1)}%</p>
          <Progress value={Math.min(solvencia, 250)} className="h-2 mb-2" />
          <p className="text-xs text-slate-600">
            Capacidad de cubrir obligaciones incluyendo cobros pendientes. Óptimo: {'>'} 200%
          </p>
        </div>

        {/* Autonomía Financiera */}
        <div className="border-2 border-purple-200 rounded-xl p-4 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h4 className="font-bold text-slate-900">Autonomía Financiera</h4>
            </div>
            <Badge className={`bg-${autonomiaStatus.color}-600`}>
              {autonomiaStatus.icon} {autonomiaStatus.status}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-purple-700 mb-2">{autonomiaMeses.toFixed(1)} meses</p>
          <Progress value={Math.min((autonomiaMeses / 6) * 100, 100)} className="h-2 mb-2" />
          <p className="text-xs text-slate-600">
            Meses que puede operar sin nuevos ingresos. Óptimo: {'>'} 3 meses
          </p>
        </div>

        {/* Eficiencia Operativa */}
        <div className="border-2 border-orange-200 rounded-xl p-4 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <h4 className="font-bold text-slate-900">Eficiencia Operativa</h4>
            </div>
            <Badge className={`bg-${eficienciaStatus.color}-600`}>
              {eficienciaStatus.icon} {eficienciaStatus.status}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-orange-700 mb-2">{eficiencia.toFixed(1)}%</p>
          <Progress value={Math.min(eficiencia, 100)} className="h-2 mb-2" />
          <p className="text-xs text-slate-600">
            Margen de beneficio sobre ingresos. Óptimo: {'>'} 30%
          </p>
        </div>

        {/* Resumen ejecutivo */}
        <div className="bg-slate-900 rounded-xl p-4 text-white">
          <p className="font-bold mb-2">📊 Diagnóstico Ejecutivo</p>
          <ul className="space-y-1 text-sm">
            <li>• Liquidez {liquidezStatus.status.toLowerCase()} - {liquidez >= 120 ? 'capacidad sólida de pago' : 'requiere monitoreo'}</li>
            <li>• Solvencia {solvenciaStatus.status.toLowerCase()} - {solvencia >= 150 ? 'salud financiera robusta' : 'necesita mejorar cobros'}</li>
            <li>• Autonomía de {autonomiaMeses.toFixed(1)} meses - {autonomiaMeses >= 2 ? 'colchón adecuado' : 'aumentar reservas'}</li>
            <li>• Eficiencia operativa {eficienciaStatus.status.toLowerCase()} - {eficiencia >= 20 ? 'gestión eficiente' : 'optimizar gastos'}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}