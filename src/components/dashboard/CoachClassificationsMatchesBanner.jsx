import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, MapPin, Calendar, Clock, TrendingUp, TrendingDown, Minus, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

import { es } from "date-fns/locale";

export default function CoachClassificationsMatchesBanner({ myCategories = [] }) {
  const [showAllStandings, setShowAllStandings] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  const { data: standings = [] } = useQuery({
    queryKey: ['clasificaciones-coach', 'all'],
    queryFn: async () => {
      // Una sola llamada para evitar rate limit; filtramos en memoria
      const all = await base44.entities.Clasificacion.list('-jornada', 200);
      return all;
    },
    enabled: myCategories.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
  });

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callupsCoach'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    enabled: myCategories.length > 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
  });

  const today = new Date().toISOString().split('T')[0];

  // Agrupar clasificaciones de mis categorías
  const standingsByCategory = useMemo(() => {
    const byCategory = {};
    standings.forEach(s => {
      if (!myCategories.includes(s.categoria)) return;
      if (!byCategory[s.categoria]) byCategory[s.categoria] = [];
      byCategory[s.categoria].push(s);
    });

    const result = [];
    Object.keys(byCategory).forEach(categoria => {
      const maxJornada = Math.max(...byCategory[categoria].map(s => s.jornada));
      const latest = byCategory[categoria].filter(s => s.jornada === maxJornada);
      const bustarTeam = latest.find(t => 
        t.nombre_equipo.toLowerCase().includes('bustarviejo') || 
        t.nombre_equipo.toLowerCase().includes('bustar')
      );

      if (bustarTeam) {
        const allJornadas = Object.values(
          byCategory[categoria].reduce((acc, s) => {
            if (!acc[s.jornada]) acc[s.jornada] = [];
            acc[s.jornada].push(s);
            return acc;
          }, {})
        ).sort((a, b) => b[0].jornada - a[0].jornada).slice(0, 4).reverse();

        const evolution = allJornadas.map(j => {
          const team = j.find(t => 
            t.nombre_equipo.toLowerCase().includes('bustarviejo') || 
            t.nombre_equipo.toLowerCase().includes('bustar')
          );
          return team ? team.posicion : null;
        }).filter(p => p !== null);

        result.push({
          ...bustarTeam,
          jornada: maxJornada,
          totalTeams: latest.length,
          evolution
        });
      }
    });

    return result.sort((a, b) => a.posicion - b.posicion);
  }, [standings, myCategories]);

  const bestStanding = standingsByCategory[0];
  const additionalCategories = standingsByCategory.length - 1;

  // Próximos partidos de mis categorías
  const upcomingMatches = useMemo(() => {
    return allCallups
      .filter(c => c.publicada && !c.cerrada && c.fecha_partido >= today && myCategories.includes(c.categoria))
      .sort((a, b) => {
        const dateCompare = a.fecha_partido.localeCompare(b.fecha_partido);
        if (dateCompare !== 0) return dateCompare;
        return (a.hora_partido || "").localeCompare(b.hora_partido || "");
      });
  }, [allCallups, today, myCategories]);

  const nextMatch = upcomingMatches[0];
  const additionalMatches = upcomingMatches.length - 1;

  const openGoogleMaps = (callup) => {
    if (callup.enlace_ubicacion) {
      window.open(callup.enlace_ubicacion, '_blank');
    } else if (callup.ubicacion) {
      const query = encodeURIComponent(callup.ubicacion);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  // Calcular tendencia
  let trendIcon = null;
  let trendColor = "";
  if (bestStanding?.evolution && bestStanding.evolution.length >= 2) {
    const last = bestStanding.evolution[bestStanding.evolution.length - 1];
    const prev = bestStanding.evolution[bestStanding.evolution.length - 2];
    if (last < prev) {
      trendIcon = <TrendingUp className="w-4 h-4" />;
      trendColor = "text-green-600";
    } else if (last > prev) {
      trendIcon = <TrendingDown className="w-4 h-4" />;
      trendColor = "text-red-600";
    } else {
      trendIcon = <Minus className="w-4 h-4" />;
      trendColor = "text-slate-500";
    }
  }

  const positionClass = bestStanding 
    ? bestStanding.posicion === 1 ? "text-yellow-600" :
      bestStanding.posicion <= 3 ? "text-green-600" :
      bestStanding.posicion > bestStanding.totalTeams - 3 ? "text-red-600" :
      "text-slate-700"
    : "text-slate-700";

  if (myCategories.length === 0) return null;

  return (
    <>
      <Card className="border border-slate-200 shadow-md overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-slate-200">
            {/* IZQUIERDA: CLASIFICACIONES */}
            <button
              onClick={() => additionalCategories > 0 ? setShowAllStandings(true) : window.location.href = createPageUrl("CentroCompeticionTecnico")}
              className="hover:bg-orange-50/50 transition-colors text-left"
            >
              <div className="p-3 bg-gradient-to-br from-orange-50 to-white h-full">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-orange-600" />
                    <p className="font-bold text-slate-900 text-xs">Clasificación</p>
                  </div>
                  {additionalCategories > 0 && (
                    <Badge className="bg-orange-500 text-white text-[9px] px-1.5 py-0">+{additionalCategories}</Badge>
                  )}
                </div>
                
                {bestStanding ? (
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">{bestStanding.categoria.split(' ')[1] || bestStanding.categoria}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xl font-bold ${positionClass} flex items-center gap-0.5`}>
                        {bestStanding.posicion}º
                        {trendIcon && <span className={trendColor}>{trendIcon}</span>}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-orange-600">{bestStanding.puntos} pts</p>
                        <p className="text-[10px] text-slate-400">J{bestStanding.jornada}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Sin datos</p>
                )}
              </div>
            </button>

            {/* DERECHA: MIS CONVOCATORIAS */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50">
              {nextMatch ? (
                <button
                  onClick={() => setShowAllMatches(true)}
                  className="w-full h-full text-left p-3 hover:bg-green-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-green-700" />
                      <p className="font-bold text-slate-900 text-xs">Mis Convocatorias</p>
                    </div>
                    {additionalMatches > 0 && (
                      <Badge className="bg-green-600 text-white text-[9px] px-1.5 py-0">+{additionalMatches}</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mb-0.5">{nextMatch.categoria.split(' ')[1] || nextMatch.categoria}</p>
                  <p className="font-bold text-slate-900 text-xs mb-1 line-clamp-1">{nextMatch.rival || nextMatch.titulo}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 mb-1.5">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(nextMatch.fecha_partido), "EEE d MMM", { locale: es })}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {nextMatch.hora_partido}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full h-7 bg-green-600 hover:bg-green-700 text-white text-[10px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGoogleMaps(nextMatch);
                    }}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Cómo Llegar
                  </Button>
                </button>
              ) : (
                <Link to={createPageUrl("CalendarAndSchedules")} className="block h-full">
                  <div className="p-3 text-center flex flex-col items-center justify-center h-full hover:bg-green-100/50 transition-colors">
                    <Bell className="w-5 h-5 text-slate-400 mb-1" />
                    <p className="text-[11px] font-semibold text-slate-600 mb-1">Sin convocatorias activas</p>
                    <p className="text-[9px] text-slate-400 leading-tight mb-1.5">No hay partidos programados aún</p>
                    <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                      📅 Ver partidos del club →
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog todas las clasificaciones de mis equipos */}
      <Dialog open={showAllStandings} onOpenChange={setShowAllStandings}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-600" />
              Mis Clasificaciones ({standingsByCategory.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            {standingsByCategory.map((team, idx) => {
              const categoryShort = team.categoria.split(' ').slice(1).join(' ') || team.categoria;
              const posClass = 
                team.posicion === 1 ? "text-yellow-600" :
                team.posicion <= 3 ? "text-green-600" :
                team.posicion > team.totalTeams - 3 ? "text-red-600" :
                "text-slate-700";

              let trend = null;
              let trendCol = "";
              if (team.evolution && team.evolution.length >= 2) {
                const last = team.evolution[team.evolution.length - 1];
                const prev = team.evolution[team.evolution.length - 2];
                if (last < prev) {
                  trend = <TrendingUp className="w-4 h-4" />;
                  trendCol = "text-green-600";
                } else if (last > prev) {
                  trend = <TrendingDown className="w-4 h-4" />;
                  trendCol = "text-red-600";
                } else {
                  trend = <Minus className="w-4 h-4" />;
                  trendCol = "text-slate-500";
                }
              }

              return (
                <Link key={idx} to={createPageUrl("CentroCompeticionTecnico")} onClick={() => setShowAllStandings(false)}>
                  <Card className="border-2 border-slate-200 hover:border-orange-400 transition-colors cursor-pointer hover:shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`text-3xl font-bold ${posClass} flex items-center gap-1`}>
                            {team.posicion}º
                            {trend && <span className={trendCol}>{trend}</span>}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{categoryShort}</p>
                            <p className="text-xs text-slate-500">Jornada {team.jornada}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-600">{team.puntos} pts</div>
                          {team.partidos_jugados && (
                            <p className="text-xs text-slate-500">{team.partidos_jugados} PJ</p>
                          )}
                        </div>
                      </div>
                      {team.evolution && team.evolution.length >= 2 && (
                        <div className="flex items-center gap-1 mt-3">
                          {team.evolution.map((pos, i) => {
                            const size = i === team.evolution.length - 1 ? "w-3 h-3" : "w-2 h-2";
                            const color = pos <= 3 ? "bg-green-500" : pos > team.totalTeams - 3 ? "bg-red-500" : "bg-slate-400";
                            return (
                              <div key={i} className={`${size} ${color} rounded-full`} title={`J${team.jornada - team.evolution.length + i + 1}: ${pos}º`}></div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog todos los partidos */}
      <Dialog open={showAllMatches} onOpenChange={setShowAllMatches}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-600" />
              Mis Convocatorias ({upcomingMatches.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {upcomingMatches.map((callup) => (
              <Card key={callup.id} className="border-2 border-slate-200">
                <CardContent className="p-3">
                  <p className="font-bold text-sm text-slate-900 mb-1">{callup.categoria}</p>
                  <p className="text-sm text-slate-700 mb-2">{callup.titulo}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(callup.fecha_partido), "EEEE d MMM", { locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {callup.hora_partido}
                    </span>
                  </div>
                  {callup.ubicacion && (
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {callup.ubicacion}
                    </p>
                  )}
                  <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => openGoogleMaps(callup)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    📍 Cómo Llegar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}