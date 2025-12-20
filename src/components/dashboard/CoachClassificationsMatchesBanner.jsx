import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, MapPin, Calendar, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CoachClassificationsMatchesBanner({ myCategories = [] }) {
  const [showAllStandings, setShowAllStandings] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  const { data: standings = [] } = useQuery({
    queryKey: ['clasificaciones-coach'],
    queryFn: () => base44.entities.Clasificacion.list('-jornada'),
    enabled: myCategories.length > 0
  });

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callupsCoach'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    enabled: myCategories.length > 0
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
      <Card className="border-2 border-slate-300 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-slate-300">
            {/* IZQUIERDA: CLASIFICACIONES */}
            <button
              onClick={() => additionalCategories > 0 ? setShowAllStandings(true) : window.location.href = createPageUrl("Clasificaciones")}
              className="hover:bg-orange-50/50 transition-colors text-left"
            >
              <div className="p-4 bg-gradient-to-br from-orange-50 to-white h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-orange-600" />
                    <p className="font-bold text-slate-900 text-sm">📊 {additionalCategories > 0 ? 'Clasificaciones' : 'Mi Clasificación'}</p>
                  </div>
                  {additionalCategories > 0 && (
                    <Badge className="bg-orange-500 text-white text-xs">+{additionalCategories}</Badge>
                  )}
                </div>
                
                {bestStanding ? (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{bestStanding.categoria.split(' ')[1] || bestStanding.categoria}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${positionClass} flex items-center gap-1`}>
                        {bestStanding.posicion}º
                        {trendIcon && <span className={trendColor}>{trendIcon}</span>}
                      </span>
                      <div>
                        <p className="text-lg font-bold text-orange-600">{bestStanding.puntos} pts</p>
                        <p className="text-xs text-slate-500">J{bestStanding.jornada}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin clasificaciones</p>
                )}
              </div>
            </button>

            {/* DERECHA: PRÓXIMO PARTIDO */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50">
              {nextMatch ? (
                <button
                  onClick={() => setShowAllMatches(true)}
                  className="w-full h-full text-left p-4 hover:bg-green-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-green-700" />
                      <p className="font-bold text-slate-900 text-sm">⚽ Próximo Partido</p>
                    </div>
                    {additionalMatches > 0 && (
                      <Badge className="bg-green-600 text-white text-xs">+{additionalMatches}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-1">{nextMatch.categoria.split(' ')[1] || nextMatch.categoria}</p>
                  <p className="font-bold text-slate-900 text-sm mb-2">{nextMatch.rival || nextMatch.titulo}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(nextMatch.fecha_partido), "EEE d MMM", { locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {nextMatch.hora_partido}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGoogleMaps(nextMatch);
                    }}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    📍 Cómo Llegar
                  </Button>
                </button>
              ) : (
                <div className="p-4 text-center flex items-center justify-center h-full">
                  <div>
                    <Trophy className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Sin partidos próximos</p>
                  </div>
                </div>
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
                <Link key={idx} to={createPageUrl("Clasificaciones")} onClick={() => setShowAllStandings(false)}>
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
              <Trophy className="w-5 h-5 text-green-600" />
              Mis Próximos Partidos ({upcomingMatches.length})
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