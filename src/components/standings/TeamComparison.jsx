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
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-orange-500/50 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-lg">Comparar Equipos</h3>
        </div>
        {selectedTeam && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedTeam(null)}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Selector de equipo */}
      <div className="mb-3">
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">
          Comparar CD Bustarviejo con:
        </label>
        <Select
          value={selectedTeam?.nombre_equipo || ""}
          onValueChange={(teamName) => {
            const team = standings.find(s => s.nombre_equipo === teamName);
            setSelectedTeam(team);
          }}
        >
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
        <div className="space-y-3">
          {/* Posiciones */}
          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-3xl font-black text-orange-400">{bustarStats.posicion}°</div>
                <div className="text-xs text-orange-300 font-semibold">CD Bustarviejo</div>
              </div>
              <div className="flex flex-col items-center px-4">
                {comparison.posDiff < 0 ? (
                  <>
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <span className="text-xs font-bold text-green-400 mt-1">
                      +{Math.abs(comparison.posDiff)} pos
                    </span>
                  </>
                ) : comparison.posDiff > 0 ? (
                  <>
                    <TrendingDown className="w-6 h-6 text-red-400" />
                    <span className="text-xs font-bold text-red-400 mt-1">
                      -{comparison.posDiff} pos
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-6 h-6 text-slate-400" />
                    <span className="text-xs text-slate-400 mt-1">Igual</span>
                  </>
                )}
              </div>
              <div className="text-center flex-1">
                <div className="text-3xl font-black text-slate-300">{selectedTeam.posicion}°</div>
                <div className="text-xs text-slate-400 truncate">{selectedTeam.nombre_equipo}</div>
              </div>
            </div>
          </div>

          {/* Grid de estadísticas */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Trophy, label: "Puntos", colorIcon: "text-yellow-400", bustVal: bustarStats.puntos, rivalVal: selectedTeam.puntos, diff: comparison.ptsDiff },
              { icon: Target, label: "Goles (F)", colorIcon: "text-green-400", bustVal: bustarStats.goles_favor || 0, rivalVal: selectedTeam.goles_favor || 0, diff: comparison.gfDiff },
              { icon: Shield, label: "Goles (C)", colorIcon: "text-blue-400", bustVal: bustarStats.goles_contra || 0, rivalVal: selectedTeam.goles_contra || 0, diff: comparison.gcDiff },
              { icon: TrendingUp, label: "% Vict.", colorIcon: "text-orange-400", bustVal: `${comparison.winRateBustar.toFixed(0)}%`, rivalVal: `${comparison.winRateTeam.toFixed(0)}%`, diff: comparison.winRateDiff, isPct: true },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                <div className="flex items-center gap-1 mb-1.5">
                  <stat.icon className={`w-3 h-3 ${stat.colorIcon}`} />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">{stat.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-orange-400">{stat.bustVal}</span>
                  <Badge className={`text-white ${stat.diff > 0 ? "bg-green-600" : stat.diff < 0 ? "bg-red-600" : "bg-slate-600"}`}>
                    {stat.isPct 
                      ? (stat.diff > 0 ? `+${stat.diff.toFixed(0)}%` : `${stat.diff.toFixed(0)}%`)
                      : (stat.diff > 0 ? `+${stat.diff}` : stat.diff)
                    }
                  </Badge>
                  <span className="text-lg font-bold text-slate-300">{stat.rivalVal}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen comparativo */}
          <div className="bg-white/10 rounded-lg p-3 border border-white/10">
            <p className="text-sm text-center font-medium text-slate-200">
              {comparison.ptsDiff > 0 && comparison.posDiff < 0 ? (
                <>✨ CD Bustarviejo está <strong className="text-green-400">{Math.abs(comparison.posDiff)} posiciones por encima</strong> con <strong className="text-green-400">{comparison.ptsDiff} puntos de ventaja</strong></>
              ) : comparison.ptsDiff < 0 && comparison.posDiff > 0 ? (
                <>⚠️ CD Bustarviejo está <strong className="text-red-400">{comparison.posDiff} posiciones por debajo</strong> con <strong className="text-red-400">{Math.abs(comparison.ptsDiff)} puntos de desventaja</strong></>
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
    </div>
  );
}