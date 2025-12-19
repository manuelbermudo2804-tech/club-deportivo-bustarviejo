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
    <div className="space-y-4 mb-6">
      {/* Posición CD Bustarviejo */}
      {bustarviejo && (
        <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Trophy className="w-5 h-5" />
              CD Bustarviejo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{bustarviejo.posicion}°</p>
                <p className="text-sm text-slate-600">Posición</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{bustarviejo.puntos}</p>
                <p className="text-sm text-slate-600">Puntos</p>
              </div>
              {bustarviejo.goles_favor !== undefined && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {bustarviejo.goles_favor}-{bustarviejo.goles_contra}
                  </p>
                  <p className="text-sm text-slate-600">Goles (F-C)</p>
                </div>
              )}
              {bustarviejo.partidos_jugados && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {Math.round(((bustarviejo.ganados || 0) / bustarviejo.partidos_jugados) * 100)}%
                  </p>
                  <p className="text-sm text-slate-600">% Victorias</p>
                </div>
              )}
            </div>
            
            {bustarviejo.posicion <= 3 && (
              <div className="mt-3 text-center">
                <Badge className="bg-yellow-500 text-white">
                  🏆 Zona de Clasificación
                </Badge>
              </div>
            )}
            {bustarviejo.posicion > totalTeams - 3 && (
              <div className="mt-3 text-center">
                <Badge className="bg-red-500 text-white">
                  ⚠️ Zona de Descenso
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estadísticas de Liga */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Mejor Ataque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-lg">{bestAttack.nombre_equipo}</p>
            <p className="text-2xl font-bold text-blue-600">{bestAttack.goles_favor || 0}</p>
            <p className="text-xs text-slate-500">goles a favor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              Mejor Defensa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-lg">{bestDefense.nombre_equipo}</p>
            <p className="text-2xl font-bold text-green-600">{bestDefense.goles_contra || 0}</p>
            <p className="text-xs text-slate-500">goles en contra</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              Más Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-lg">{mostEffective.nombre_equipo}</p>
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(((mostEffective.ganados || 0) / (mostEffective.partidos_jugados || 1)) * 100)}%
            </p>
            <p className="text-xs text-slate-500">victorias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Promedio Liga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-lg">Goles/Equipo</p>
            <p className="text-2xl font-bold text-orange-600">{avgGoles.toFixed(1)}</p>
            <p className="text-xs text-slate-500">por equipo</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}