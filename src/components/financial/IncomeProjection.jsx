import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, DollarSign, Target } from "lucide-react";

export default function IncomeProjection({ totalIngresos, totalPendiente, totalEsperado, stats }) {
  // Proyección optimista (80% de pendientes se cobrarán)
  const proyeccionOptimista = totalIngresos + (totalPendiente * 0.8) + (stats.cuotasEnRevision * 0.9);
  
  // Proyección pesimista (50% de pendientes)
  const proyeccionPesimista = totalIngresos + (totalPendiente * 0.5) + (stats.cuotasEnRevision * 0.7);
  
  // Proyección realista (65% de pendientes)
  const proyeccionRealista = totalIngresos + (totalPendiente * 0.65) + (stats.cuotasEnRevision * 0.8);

  const tasaCobroActual = totalEsperado > 0 ? ((totalIngresos / totalEsperado) * 100) : 0;

  return (
    <Card className="border-none shadow-xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
      <CardHeader className="border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Proyección de Ingresos</CardTitle>
              <p className="text-sm text-indigo-100 mt-1">Estimación de recaudación final de temporada</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Escenarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Optimista */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <p className="text-sm text-green-200 font-medium">Escenario Optimista</p>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{proyeccionOptimista.toFixed(2)}€</p>
            <p className="text-xs text-indigo-200">80% cobro de pendientes</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs text-indigo-100">
                +{(proyeccionOptimista - totalIngresos).toFixed(2)}€ adicionales
              </p>
            </div>
          </div>

          {/* Realista */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border-2 border-white/40 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <p className="text-sm text-blue-100 font-bold">Escenario Realista</p>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{proyeccionRealista.toFixed(2)}€</p>
            <p className="text-xs text-indigo-200">65% cobro de pendientes</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs text-indigo-100">
                +{(proyeccionRealista - totalIngresos).toFixed(2)}€ adicionales
              </p>
            </div>
          </div>

          {/* Pesimista */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <p className="text-sm text-orange-200 font-medium">Escenario Pesimista</p>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{proyeccionPesimista.toFixed(2)}€</p>
            <p className="text-xs text-indigo-200">50% cobro de pendientes</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs text-indigo-100">
                +{(proyeccionPesimista - totalIngresos).toFixed(2)}€ adicionales
              </p>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-indigo-200 mb-1">Cobrado Actual</p>
              <p className="text-xl font-bold">{totalIngresos.toFixed(2)}€</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-indigo-200 mb-1">Pendiente</p>
              <p className="text-xl font-bold text-red-300">{totalPendiente.toFixed(2)}€</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-indigo-200 mb-1">En Revisión</p>
              <p className="text-xl font-bold text-yellow-300">{stats.cuotasEnRevision.toFixed(2)}€</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-indigo-200 mb-1">Total Esperado</p>
              <p className="text-xl font-bold text-blue-300">{totalEsperado.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-4 bg-purple-900/30 rounded-lg p-3 text-xs text-purple-100">
          <p className="font-medium mb-1">📊 Metodología de Proyección:</p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Optimista:</strong> Asume 80% cobro de pendientes + 90% de pagos en revisión</li>
            <li>• <strong>Realista:</strong> Asume 65% cobro de pendientes + 80% de pagos en revisión</li>
            <li>• <strong>Pesimista:</strong> Asume 50% cobro de pendientes + 70% de pagos en revisión</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}