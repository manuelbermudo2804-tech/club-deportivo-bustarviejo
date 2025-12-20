import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Eye, TrendingDown, Minus, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StandingsWidget({ userEmail, categoria, compact = false }) {
  const { data: players } = useQuery({
    queryKey: ['players-for-standings'],
    queryFn: async () => {
      if (categoria) return []; // Si es modo compacto, no necesitamos jugadores
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        (p.email_padre === userEmail || 
         p.email_tutor_2 === userEmail ||
         (p.email_jugador === userEmail && p.acceso_jugador_autorizado)) &&
        p.activo === true
      );
    },
    initialData: [],
    enabled: !categoria,
  });

  const { data: standings } = useQuery({
    queryKey: ['clasificaciones-widget', categoria],
    queryFn: () => base44.entities.Clasificacion.list('-jornada'),
    initialData: [],
  });

  const { data: events } = useQuery({
    queryKey: ['events-for-standings'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-fecha');
      const today = new Date().toISOString().split('T')[0];
      return allEvents.filter(e => 
        e.tipo === "Partido" && 
        e.fecha >= today && 
        e.publicado === true
      );
    },
    initialData: [],
    enabled: players.length > 0
  });

  // Si se especifica categoría, usarla directamente (modo compacto para coach/coordinator)
  const playerCategories = categoria ? [categoria] : [...new Set(players.map(p => p.deporte).filter(Boolean))];

  if (playerCategories.length === 0) {
    return compact ? (
      <p className="text-sm text-slate-500 text-center py-4">No hay clasificaciones disponibles</p>
    ) : null;
  }

  // Agrupar clasificaciones por categoría y obtener la última jornada de cada una
  const latestStandings = playerCategories.map(categoria => {
    const categoryStandings = standings.filter(s => s.categoria === categoria);
    
    if (categoryStandings.length === 0) return null;

    // Agrupar por jornada
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

    // Obtener la jornada más reciente
    const latest = Object.values(byJornada).sort((a, b) => b.jornada - a.jornada)[0];
    
    if (!latest) return null;

    // Buscar CD Bustarviejo en la clasificación
    const bustarTeam = latest.data.find(team => 
      team.nombre_equipo.toLowerCase().includes('bustarviejo') || 
      team.nombre_equipo.toLowerCase().includes('bustar')
    );

    if (!bustarTeam) return null;

    // Calcular evolución de posición (últimas jornadas)
    const allJornadas = Object.values(byJornada)
      .sort((a, b) => a.jornada - b.jornada)
      .slice(-4); // Últimas 4 jornadas
    
    const evolution = allJornadas.map(j => {
      const team = j.data.find(t => 
        t.nombre_equipo.toLowerCase().includes('bustarviejo') || 
        t.nombre_equipo.toLowerCase().includes('bustar')
      );
      return team ? team.posicion : null;
    }).filter(p => p !== null);

    // Buscar próximo partido de esta categoría
    const nextMatch = events.find(e => 
      e.destinatario_categoria === categoria && e.rival
    );

    let nextRival = null;
    if (nextMatch && nextMatch.rival) {
      const rivalTeam = latest.data.find(t => 
        t.nombre_equipo.toLowerCase().includes(nextMatch.rival.toLowerCase())
      );
      if (rivalTeam) {
        nextRival = {
          nombre: rivalTeam.nombre_equipo,
          posicion: rivalTeam.posicion,
          puntos: rivalTeam.puntos,
          fecha: nextMatch.fecha,
          hora: nextMatch.hora,
          local: nextMatch.local_visitante === "Local"
        };
      }
    }

    return { 
      ...bustarTeam, 
      jornada: latest.jornada, 
      totalTeams: latest.data.length,
      evolution,
      nextRival
    };
  }).filter(Boolean);

  if (latestStandings.length === 0) {
    return compact ? (
      <div className="text-center py-8">
        <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No hay clasificaciones disponibles</p>
        <p className="text-xs text-slate-400 mt-1">Consulta con el administrador</p>
      </div>
    ) : null;
  }

  return compact ? (
    <div className="space-y-2">
      {latestStandings.slice(0, 1).map((team, idx) => {
        const categoryShort = team.categoria.split(' ').slice(1).join(' ') || team.categoria;
        const positionClass = 
          team.posicion === 1 ? "text-yellow-600" :
          team.posicion <= 3 ? "text-green-600" :
          team.posicion > team.totalTeams - 3 ? "text-red-600" :
          "text-slate-700";

        let trendIcon = null;
        let trendColor = "";
        if (team.evolution && team.evolution.length >= 2) {
          const last = team.evolution[team.evolution.length - 1];
          const prev = team.evolution[team.evolution.length - 2];
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

        return (
          <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${positionClass} flex items-center gap-1`}>
                  {team.posicion}º
                  {trendIcon && (
                    <span className={trendColor}>
                      {trendIcon}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{categoryShort}</p>
                  <p className="text-xs text-slate-500">Jornada {team.jornada}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-orange-600">{team.puntos} pts</div>
                {team.partidos_jugados && (
                  <p className="text-xs text-slate-500">{team.partidos_jugados} PJ</p>
                )}
              </div>
            </div>

            {team.nextRival && (
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 mt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-900 font-medium">
                      {team.nextRival.local ? "🏠" : "✈️"} vs {team.nextRival.nombre.split(' ').slice(-2).join(' ')}
                    </p>
                    <p className="text-[10px] text-blue-700">
                      {team.nextRival.posicion}º • {team.nextRival.puntos} pts
                    </p>
                  </div>
                  <div className="text-xs text-blue-600 font-bold">
                    {new Date(team.nextRival.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            )}

            {team.evolution && team.evolution.length >= 2 && (
              <div className="flex items-center gap-1 mt-2">
                {team.evolution.map((pos, i) => {
                  const size = i === team.evolution.length - 1 ? "w-3 h-3" : "w-2 h-2";
                  const color = pos <= 3 ? "bg-green-500" : pos > team.totalTeams - 3 ? "bg-red-500" : "bg-slate-400";
                  return (
                    <div key={i} className={`${size} ${color} rounded-full`} title={`J${team.jornada - team.evolution.length + i + 1}: ${pos}º`}></div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  ) : (
    <Card className="border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-white shadow-lg h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-600" />
            📊 Clasificaciones
          </h3>
          {latestStandings.length > 1 && (
            <Badge className="bg-orange-500">+{latestStandings.length - 1} más</Badge>
          )}
        </div>

        <div className="space-y-2 flex-1">
          {latestStandings.slice(0, 1).map((team, idx) => {
            const categoryShort = team.categoria.split(' ')[1] || team.categoria;
            const positionClass = 
              team.posicion === 1 ? "text-yellow-600" :
              team.posicion <= 3 ? "text-green-600" :
              team.posicion > team.totalTeams - 3 ? "text-red-600" :
              "text-slate-700";

            // Calcular tendencia de evolución
            let trendIcon = null;
            let trendColor = "";
            if (team.evolution && team.evolution.length >= 2) {
              const last = team.evolution[team.evolution.length - 1];
              const prev = team.evolution[team.evolution.length - 2];
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

            return (
              <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200 hover:border-orange-400 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl font-bold ${positionClass} flex items-center gap-1`}>
                      {team.posicion}º
                      {trendIcon && (
                        <span className={trendColor}>
                          {trendIcon}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{categoryShort}</p>
                      <p className="text-xs text-slate-500">Jornada {team.jornada}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">{team.puntos} pts</div>
                    {team.partidos_jugados && (
                      <p className="text-xs text-slate-500">{team.partidos_jugados} PJ</p>
                    )}
                  </div>
                </div>

                {/* Próximo rival */}
                {team.nextRival && (
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-xs text-blue-900 font-medium">
                          {team.nextRival.local ? "🏠" : "✈️"} vs {team.nextRival.nombre.split(' ').slice(-2).join(' ')}
                        </p>
                        <p className="text-[10px] text-blue-700">
                          {team.nextRival.posicion}º • {team.nextRival.puntos} pts
                        </p>
                      </div>
                      <div className="text-xs text-blue-600 font-bold">
                        {new Date(team.nextRival.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Evolución visual mini */}
                {team.evolution && team.evolution.length >= 2 && (
                  <div className="flex items-center gap-1">
                    {team.evolution.map((pos, i) => {
                      const size = i === team.evolution.length - 1 ? "w-3 h-3" : "w-2 h-2";
                      const color = pos <= 3 ? "bg-green-500" : pos > team.totalTeams - 3 ? "bg-red-500" : "bg-slate-400";
                      return (
                        <div key={i} className={`${size} ${color} rounded-full transition-all`} title={`J${team.jornada - team.evolution.length + i + 1}: ${pos}º`}></div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!compact && (
          <Link to={createPageUrl("Clasificaciones")}>
            <button className="w-full mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium">
              Ver clasificación completa →
            </button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}