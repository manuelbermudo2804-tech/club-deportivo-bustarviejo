import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, AlertTriangle } from "lucide-react";

export default function FinancialHealthIndicator({ totalIngresos, totalPendiente, totalEsperado, stats }) {
  const collectionRate = totalEsperado > 0 ? (totalIngresos / totalEsperado) * 100 : 0;
  const delinquencyRate = totalEsperado > 0 ? (totalPendiente / totalEsperado) * 100 : 0;
  
  // Determinar salud financiera
  let healthStatus, healthColor, healthBg, healthIcon, healthMessage;
  
  if (collectionRate >= 80 && delinquencyRate < 20) {
    healthStatus = "Excelente";
    healthColor = "text-green-700";
    healthBg = "from-green-50 to-emerald-50 border-green-300";
    healthIcon = "🟢";
    healthMessage = "La salud financiera del club es excelente. Mantén este ritmo.";
  } else if (collectionRate >= 60 && delinquencyRate < 40) {
    healthStatus = "Buena";
    healthColor = "text-blue-700";
    healthBg = "from-blue-50 to-cyan-50 border-blue-300";
    healthIcon = "🔵";
    healthMessage = "La situación financiera es estable. Sigue gestionando los cobros pendientes.";
  } else if (collectionRate >= 40 && delinquencyRate < 60) {
    healthStatus = "Regular";
    healthColor = "text-yellow-700";
    healthBg = "from-yellow-50 to-amber-50 border-yellow-300";
    healthIcon = "🟡";
    healthMessage = "Se recomienda intensificar los esfuerzos de cobro para mejorar la situación.";
  } else {
    healthStatus = "Crítica";
    healthColor = "text-red-700";
    healthBg = "from-red-50 to-orange-50 border-red-300";
    healthIcon = "🔴";
    healthMessage = "Se requiere atención inmediata. Implementa plan de recuperación de deudas urgente.";
  }

  return (
    <Card className={`border-2 shadow-2xl bg-gradient-to-br ${healthBg}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-6xl">{healthIcon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Activity className={`w-6 h-6 ${healthColor}`} />
              <h3 className="text-2xl font-bold text-slate-900">
                Salud Financiera: <span className={healthColor}>{healthStatus}</span>
              </h3>
            </div>
            <p className="text-sm text-slate-600">{healthMessage}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-xs text-slate-600 mb-1">Tasa de Cobro</p>
            <p className={`text-3xl font-bold ${healthColor}`}>{collectionRate.toFixed(1)}%</p>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  collectionRate >= 80 ? 'bg-green-600' :
                  collectionRate >= 60 ? 'bg-blue-600' :
                  collectionRate >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${collectionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-xs text-slate-600 mb-1">Índice de Morosidad</p>
            <p className={`text-3xl font-bold ${
              delinquencyRate < 20 ? 'text-green-700' :
              delinquencyRate < 40 ? 'text-yellow-700' : 'text-red-700'
            }`}>{delinquencyRate.toFixed(1)}%</p>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  delinquencyRate < 20 ? 'bg-green-600' :
                  delinquencyRate < 40 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${delinquencyRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-xs text-slate-600 mb-1">Eficiencia Operativa</p>
            <p className={`text-3xl font-bold ${healthColor}`}>
              {(() => {
                const efficiency = (collectionRate * 0.6) + ((100 - delinquencyRate) * 0.4);
                return efficiency.toFixed(0);
              })()}
            </p>
            <p className="text-xs text-slate-500 mt-1">Score combinado</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}