import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Shield, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StandingsStats({ data }) {
  const sortedData = [...data.data].sort((a, b) => a.posicion - b.posicion);
  
  // Calcular estadísticas
  const totalTeams = sortedData.length;
  const bustarviejo = sortedData.find(t => 
    t.nombre_equipo.toLowerCase().includes('bustarviejo') ||
    t.nombre_equipo.toLowerCase().includes('bustar')
  );
  
  // Mejor ataque (más goles a favor)
  const bestAttack = sortedData.reduce((max, team) => 
    (team.goles_favor || 0) > (max.goles_favor || 0) ? team : max
  , sortedData[0]);
  
  // Mejor defensa (menos goles en contra)
  const bestDefense = sortedData.reduce((min, team) => 
    (team.goles_contra || 0) < (min.goles_contra || 0) ? team : min
  , sortedData[0]);
  
  // Más efectivo (mejor % victorias)
  const mostEffective = sortedData
    .filter(t => t.partidos_jugados > 0)
    .reduce((max, team) => {
      const maxWinRate = (max.ganados || 0) / (max.partidos_jugados || 1);
      const teamWinRate = (team.ganados || 0) / (team.partidos_jugados || 1);
      return teamWinRate > maxWinRate ? team : max;
    }, sortedData[0]);
  
  // Promedio goles
  const totalGoles = sortedData.reduce((sum, t) => sum + (t.goles_favor || 0), 0);
  const avgGoles = totalGoles / totalTeams;
  
  // Calcular diferencia de goles para cada equipo
  const withDiff = sortedData.map(team => ({
    ...team,
    diff: (team.goles_favor || 0) - (team.goles_contra || 0)
  }));

  return (
    <div className="space-y-3 mb-4">
      {/* Estadísticas de Liga - Muy Compactas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="border border-green-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-green-600" />
              <p className="text-[10px] font-semibold text-green-700">Ataque</p>
            </div>
            <p className="text-xs font-bold text-green-900 truncate">{bestAttack.nombre_equipo}</p>
            <p className="text-lg font-bold text-green-600">{bestAttack.goles_favor || 0}</p>
          </CardContent>
        </Card>

        <Card className="border border-blue-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1 mb-1">
              <Shield className="w-3 h-3 text-blue-600" />
              <p className="text-[10px] font-semibold text-blue-700">Defensa</p>
            </div>
            <p className="text-xs font-bold text-blue-900 truncate">{bestDefense.nombre_equipo}</p>
            <p className="text-lg font-bold text-blue-600">{bestDefense.goles_contra || 0}</p>
          </CardContent>
        </Card>

        <Card className="border border-purple-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1 mb-1">
              <Award className="w-3 h-3 text-purple-600" />
              <p className="text-[10px] font-semibold text-purple-700">Efectivo</p>
            </div>
            <p className="text-xs font-bold text-purple-900 truncate">{mostEffective.nombre_equipo}</p>
            <p className="text-lg font-bold text-purple-600">
              {Math.round(((mostEffective.ganados || 0) / (mostEffective.partidos_jugados || 1)) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-slate-600" />
              <p className="text-[10px] font-semibold text-slate-700">Promedio</p>
            </div>
            <p className="text-xs font-bold text-slate-900">Goles/Equipo</p>
            <p className="text-lg font-bold text-slate-600">{avgGoles.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}