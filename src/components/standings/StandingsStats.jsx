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
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-orange-500/50 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-orange-400" />
        <h3 className="font-bold text-lg">Estadísticas de Liga</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-green-500/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <Target className="w-3 h-3 text-green-400" />
            <p className="text-[10px] font-semibold text-green-300 uppercase">Mejor Ataque</p>
          </div>
          <p className="text-xs font-bold text-white truncate">{bestAttack.nombre_equipo}</p>
          <p className="text-xl font-bold text-green-400">{bestAttack.goles_favor || 0} <span className="text-[10px] text-green-300">goles</span></p>
        </div>

        <div className="bg-blue-500/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <Shield className="w-3 h-3 text-blue-400" />
            <p className="text-[10px] font-semibold text-blue-300 uppercase">Mejor Defensa</p>
          </div>
          <p className="text-xs font-bold text-white truncate">{bestDefense.nombre_equipo}</p>
          <p className="text-xl font-bold text-blue-400">{bestDefense.goles_contra || 0} <span className="text-[10px] text-blue-300">enc.</span></p>
        </div>

        <div className="bg-purple-500/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <Award className="w-3 h-3 text-purple-400" />
            <p className="text-[10px] font-semibold text-purple-300 uppercase">Más Efectivo</p>
          </div>
          <p className="text-xs font-bold text-white truncate">{mostEffective.nombre_equipo}</p>
          <p className="text-xl font-bold text-purple-400">
            {Math.round(((mostEffective.ganados || 0) / (mostEffective.partidos_jugados || 1)) * 100)}%
          </p>
        </div>

        <div className="bg-white/10 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-slate-400" />
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Promedio</p>
          </div>
          <p className="text-xs font-bold text-white">Goles/Equipo</p>
          <p className="text-xl font-bold text-slate-300">{avgGoles.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}