import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, CheckCircle2, Clock } from "lucide-react";

export default function RenewalStatsPanel({ allPlayers, seasonConfig }) {
  const stats = useMemo(() => {
    const activePlayers = allPlayers.filter(p => p.activo === true);
    const inactivePlayers = allPlayers.filter(p => p.activo === false);
    
    const byCategory = {};
    
    // Agrupar por categoría
    allPlayers.forEach(p => {
      if (!byCategory[p.deporte]) {
        byCategory[p.deporte] = { total: 0, activos: 0, inactivos: 0 };
      }
      byCategory[p.deporte].total++;
      if (p.activo) {
        byCategory[p.deporte].activos++;
      } else {
        byCategory[p.deporte].inactivos++;
      }
    });

    const totalRenewalRate = allPlayers.length > 0 
      ? Math.round((activePlayers.length / allPlayers.length) * 100) 
      : 0;

    return {
      total: allPlayers.length,
      activos: activePlayers.length,
      inactivos: inactivePlayers.length,
      renewalRate: totalRenewalRate,
      byCategory
    };
  }, [allPlayers]);

  const categoryColors = {
    "Fútbol Pre-Benjamín (Mixto)": "bg-blue-500",
    "Fútbol Benjamín (Mixto)": "bg-green-500",
    "Fútbol Alevín (Mixto)": "bg-yellow-500",
    "Fútbol Infantil (Mixto)": "bg-orange-500",
    "Fútbol Cadete": "bg-red-500",
    "Fútbol Juvenil": "bg-purple-500",
    "Fútbol Aficionado": "bg-slate-500",
    "Fútbol Femenino": "bg-pink-500",
    "Baloncesto (Mixto)": "bg-cyan-500"
  };

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader className="border-b bg-gradient-to-r from-green-600 to-emerald-600">
        <CardTitle className="text-white flex items-center gap-2">
          <RefreshCw className="w-6 h-6" />
          Panel de Renovaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        
        {/* Estadística principal */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600 font-medium">Tasa de Renovación Global</p>
              <p className="text-4xl font-bold text-green-600">{stats.renewalRate}%</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-2xl font-bold">{stats.activos}</span>
              </div>
              <p className="text-xs text-slate-500">de {stats.total} jugadores</p>
            </div>
          </div>
          <Progress value={stats.renewalRate} className="h-3" />
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-green-700 font-medium">✅ {stats.activos} renovados</span>
            <span className="text-red-600 font-medium">❌ {stats.inactivos} pendientes</span>
          </div>
        </div>

        {/* Por categoría */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">📊 Renovaciones por Categoría</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(stats.byCategory)
              .sort((a, b) => (b[1].activos / b[1].total) - (a[1].activos / a[1].total))
              .map(([categoria, data]) => {
                const rate = Math.round((data.activos / data.total) * 100);
                return (
                  <div key={categoria} className="bg-white rounded-xl p-4 border-2 border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900 truncate flex-1">
                        {categoria.replace('Fútbol ', '').replace(' (Mixto)', '')}
                      </p>
                      <Badge className={`${categoryColors[categoria] || 'bg-slate-500'} text-white text-xs`}>
                        {rate}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Progress value={rate} className="h-2" />
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>✅ {data.activos}</span>
                        <span>❌ {data.inactivos}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Fecha límite si existe */}
        {seasonConfig?.fecha_limite_renovaciones && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-bold text-orange-900 text-sm">Fecha Límite de Renovaciones</p>
                <p className="text-orange-700 text-xs">
                  {new Date(seasonConfig.fecha_limite_renovaciones).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}