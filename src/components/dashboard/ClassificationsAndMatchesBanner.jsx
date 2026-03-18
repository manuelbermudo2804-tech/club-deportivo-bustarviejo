import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, MapPin, Calendar, Clock, Eye, TrendingUp, TrendingDown, Minus, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ClassificationsAndMatchesBanner({ userEmail, myPlayers = [] }) {
  const [showAllMatches, setShowAllMatches] = useState(false);

  // Obtener categorías de mis jugadores
  const playerCategories = [...new Set(myPlayers.map(p => p.deporte).filter(Boolean))];
  
  // Fetch standings SOLO de categorías relevantes
  const { data: standings = [] } = useQuery({
    queryKey: ['clasificaciones-widget', 'all'],
    queryFn: async () => {
      // Una única petición y filtramos en memoria para reducir 429
      return await base44.entities.Clasificacion.list('-jornada', 200);
    },
    enabled: !!userEmail && myPlayers.length > 0 && playerCategories.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
  });

  // Resumen de resultados desactivado para vista Familia (consulta eliminada)

  // Resumen de goleadores desactivado para vista Familia (consulta eliminada)

  // Fetch callups for next matches
  const { data: allCallups = [] } = useQuery({
    queryKey: ['nextMatchCallups'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    enabled: myPlayers.length > 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
  });

  const today = new Date().toISOString().split('T')[0];

  // === CLASIFICACIONES LOGIC ===
  const latestStandings = playerCategories.map(categoria => {
    const categoryStandings = standings.filter(s => s.categoria === categoria);
    if (categoryStandings.length === 0) return null;

    const byJornada = categoryStandings.reduce((acc, standing) => {
      const key = `${standing.temporada}|${standing.jornada}`;
      if (!acc[key]) {
        acc[key] = {
          temporada: standing.temporada,
          categoria: standing.categoria,
          jornada: standing.jornada,
          fecha: standing.fecha_actualizacion,
          data: []
        };
      }
      acc[key].data.push(standing);
      return acc;
    }, {});

    const latest = Object.values(byJornada).sort((a, b) => b.jornada - a.jornada)[0];
    if (!latest) return null;

    const bustarTeam = latest.data.find(team => 
      team.nombre_equipo.toLowerCase().includes('bustarviejo') || 
      team.nombre_equipo.toLowerCase().includes('bustar')
    );

    if (!bustarTeam) return null;

    const allJornadas = Object.values(byJornada)
      .sort((a, b) => a.jornada - b.jornada)
      .slice(-4);
    
    const evolution = allJornadas.map(j => {
      const team = j.data.find(t => 
        t.nombre_equipo.toLowerCase().includes('bustarviejo') || 
        t.nombre_equipo.toLowerCase().includes('bustar')
      );
      return team ? team.posicion : null;
    }).filter(p => p !== null);

    return { 
      ...bustarTeam, 
      jornada: latest.jornada, 
      totalTeams: latest.data.length,
      evolution
    };
  }).filter(Boolean);

  const bestStanding = latestStandings.sort((a, b) => a.posicion - b.posicion)[0];

  // === PRÓXIMO PARTIDO LOGIC ===
  const myCallups = allCallups.filter(c => {
    if (!c.publicada || c.cerrada || c.fecha_partido < today) return false;
    return c.jugadores_convocados?.some(j => 
      myPlayers.some(p => p.id === j.jugador_id)
    );
  });

  const sortedCallups = myCallups.sort((a, b) => {
    const dateCompare = a.fecha_partido.localeCompare(b.fecha_partido);
    if (dateCompare !== 0) return dateCompare;
    return (a.hora_partido || "").localeCompare(b.hora_partido || "");
  });

  const nextMatch = sortedCallups[0];
  const additionalMatches = sortedCallups.length - 1;

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

  return (
    <>
      <Card className="border border-slate-200 shadow-md overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-slate-200">
            {/* IZQUIERDA: CLASIFICACIONES */}
            <Link to={createPageUrl("CentroCompeticion")} className="hover:bg-orange-50/50 transition-colors">
              <div className="p-3 bg-gradient-to-br from-orange-50 to-white">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-orange-600" />
                    <p className="font-bold text-slate-900 text-xs">Clasificación</p>
                  </div>
                  {latestStandings.length > 1 && (
                    <Badge className="bg-orange-500 text-white text-[9px] px-1.5 py-0">+{latestStandings.length - 1}</Badge>
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
                  <div className="text-center py-1">
                    <p className="text-xs font-semibold text-orange-600">🏆 Preparando temporada</p>
                    <p className="text-[10px] text-slate-500">Datos en septiembre</p>
                  </div>
                )}
              </div>
            </Link>

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
                    <p className="text-[9px] text-slate-400 leading-tight mb-1.5">Tus hijos no están convocados aún</p>
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

      {/* Dialog con todos los partidos */}
      <Dialog open={showAllMatches} onOpenChange={setShowAllMatches}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-600" />
              Mis Convocatorias ({sortedCallups.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {sortedCallups.map((callup) => (
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