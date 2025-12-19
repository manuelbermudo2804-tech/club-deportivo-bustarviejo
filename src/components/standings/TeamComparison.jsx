import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Target, Shield, BarChart3, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TeamComparison({ standings, categoria }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  const bustarStats = standings.find(s => 
    s.nombre_equipo.toLowerCase().includes('bustarviejo') || 
    s.nombre_equipo.toLowerCase().includes('bustar')
  );

  const otherTeams = standings.filter(s => s.nombre_equipo !== bustarStats?.nombre_equipo);

  if (!bustarStats) return null;

  const compareTeams = (team) => {
    if (!team) return null;

    const posDiff = bustarStats.posicion - team.posicion;
    const ptsDiff = bustarStats.puntos - team.puntos;
    const gfDiff = (bustarStats.goles_favor || 0) - (team.goles_favor || 0);
    const gcDiff = (team.goles_contra || 0) - (bustarStats.goles_contra || 0);
    const winRateBustar = bustarStats.partidos_jugados > 0 ? ((bustarStats.ganados || 0) / bustarStats.partidos_jugados * 100) : 0;
    const winRateTeam = team.partidos_jugados > 0 ? ((team.ganados || 0) / team.partidos_jugados * 100) : 0;
    const winRateDiff = winRateBustar - winRateTeam;

    return {
      posDiff,
      ptsDiff,
      gfDiff,
      gcDiff,
      winRateDiff,
      winRateBustar,
      winRateTeam
    };
  };

  const comparison = selectedTeam ? compareTeams(selectedTeam) : null;

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Comparar Equipos
          </CardTitle>
          {selectedTeam && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedTeam(null)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Selector de equipo */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Comparar CD Bustarviejo con:
          </label>
          <Select
            value={selectedTeam?.nombre_equipo || ""}
            onValueChange={(teamName) => {
              const team = standings.find(s => s.nombre_equipo === teamName);
              setSelectedTeam(team);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un equipo" />
            </SelectTrigger>
            <SelectContent>
              {otherTeams.map((team) => (
                <SelectItem key={team.nombre_equipo} value={team.nombre_equipo}>
                  {team.posicion}° - {team.nombre_equipo} ({team.puntos} pts)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comparación visual */}
        {comparison && selectedTeam && (
          <div className="space-y-3 animate-fade-in">
            {/* Posiciones */}
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-center flex-1">
                  <div className="text-3xl font-bold text-orange-600">{bustarStats.posicion}°</div>
                  <div className="text-xs text-slate-600">CD Bustarviejo</div>
                </div>
                <div className="flex flex-col items-center px-3">
                  {comparison.posDiff < 0 ? (
                    <>
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-xs font-bold text-green-600 mt-1">
                        +{Math.abs(comparison.posDiff)} pos
                      </span>
                    </>
                  ) : comparison.posDiff > 0 ? (
                    <>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span className="text-xs font-bold text-red-600 mt-1">
                        -{comparison.posDiff} pos
                      </span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-600 mt-1">Igual</span>
                    </>
                  )}
                </div>
                <div className="text-center flex-1">
                  <div className="text-3xl font-bold text-purple-600">{selectedTeam.posicion}°</div>
                  <div className="text-xs text-slate-600 truncate">{selectedTeam.nombre_equipo}</div>
                </div>
              </div>
            </div>

            {/* Grid de estadísticas */}
            <div className="grid grid-cols-2 gap-2">
              {/* Puntos */}
              <div className="bg-white rounded-lg p-2 border border-purple-200">
                <div className="flex items-center gap-1 mb-1">
                  <Trophy className="w-3 h-3 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700">Puntos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-orange-600">{bustarStats.puntos}</span>
                  <Badge className={comparison.ptsDiff > 0 ? "bg-green-500" : comparison.ptsDiff < 0 ? "bg-red-500" : "bg-slate-400"}>
                    {comparison.ptsDiff > 0 ? `+${comparison.ptsDiff}` : comparison.ptsDiff}
                  </Badge>
                  <span className="text-lg font-bold text-purple-600">{selectedTeam.puntos}</span>
                </div>
              </div>

              {/* Goles favor */}
              <div className="bg-white rounded-lg p-2 border border-purple-200">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Goles (F)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-orange-600">{bustarStats.goles_favor || 0}</span>
                  <Badge className={comparison.gfDiff > 0 ? "bg-green-500" : comparison.gfDiff < 0 ? "bg-red-500" : "bg-slate-400"}>
                    {comparison.gfDiff > 0 ? `+${comparison.gfDiff}` : comparison.gfDiff}
                  </Badge>
                  <span className="text-lg font-bold text-purple-600">{selectedTeam.goles_favor || 0}</span>
                </div>
              </div>

              {/* Goles contra */}
              <div className="bg-white rounded-lg p-2 border border-purple-200">
                <div className="flex items-center gap-1 mb-1">
                  <Shield className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">Goles (C)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-orange-600">{bustarStats.goles_contra || 0}</span>
                  <Badge className={comparison.gcDiff > 0 ? "bg-green-500" : comparison.gcDiff < 0 ? "bg-red-500" : "bg-slate-400"}>
                    {comparison.gcDiff > 0 ? `+${comparison.gcDiff}` : comparison.gcDiff}
                  </Badge>
                  <span className="text-lg font-bold text-purple-600">{selectedTeam.goles_contra || 0}</span>
                </div>
              </div>

              {/* % Victorias */}
              <div className="bg-white rounded-lg p-2 border border-purple-200">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700">% Vict.</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-orange-600">{comparison.winRateBustar.toFixed(0)}%</span>
                  <Badge className={comparison.winRateDiff > 0 ? "bg-green-500" : comparison.winRateDiff < 0 ? "bg-red-500" : "bg-slate-400"}>
                    {comparison.winRateDiff > 0 ? `+${comparison.winRateDiff.toFixed(0)}%` : `${comparison.winRateDiff.toFixed(0)}%`}
                  </Badge>
                  <span className="text-lg font-bold text-purple-600">{comparison.winRateTeam.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Resumen comparativo */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 border border-purple-300">
              <p className="text-sm text-center font-medium text-purple-900">
                {comparison.ptsDiff > 0 && comparison.posDiff < 0 ? (
                  <>✨ CD Bustarviejo está <strong>{Math.abs(comparison.posDiff)} posiciones por encima</strong> con <strong>{comparison.ptsDiff} puntos de ventaja</strong></>
                ) : comparison.ptsDiff < 0 && comparison.posDiff > 0 ? (
                  <>⚠️ CD Bustarviejo está <strong>{comparison.posDiff} posiciones por debajo</strong> con <strong>{Math.abs(comparison.ptsDiff)} puntos de desventaja</strong></>
                ) : (
                  <>🤝 Equipos muy parejos en la clasificación</>
                )}
              </p>
            </div>
          </div>
        )}

        {!selectedTeam && (
          <div className="text-center py-6 text-slate-500 text-sm">
            Selecciona un equipo para ver la comparación detallada
          </div>
        )}
      </CardContent>
    </Card>
  );
}