import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StandingsWidget({ userEmail }) {
  const { data: players } = useQuery({
    queryKey: ['players-for-standings'],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        (p.email_padre === userEmail || 
         p.email_tutor_2 === userEmail ||
         (p.email_jugador === userEmail && p.acceso_jugador_autorizado)) &&
        p.activo === true
      );
    },
    initialData: [],
  });

  const { data: standings } = useQuery({
    queryKey: ['clasificaciones-widget'],
    queryFn: () => base44.entities.Clasificacion.list('-jornada'),
    initialData: [],
    enabled: players.length > 0
  });

  if (!players || players.length === 0) return null;

  // Obtener categorías únicas de los jugadores
  const playerCategories = [...new Set(players.map(p => p.deporte).filter(Boolean))];

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

    return bustarTeam ? { ...bustarTeam, jornada: latest.jornada, totalTeams: latest.data.length } : null;
  }).filter(Boolean);

  if (latestStandings.length === 0) return null;

  return (
    <Card className="border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-white shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-600" />
            Clasificaciones
          </h3>
          <Link to={createPageUrl("Clasificaciones")}>
            <Badge className="bg-green-500 hover:bg-green-600 cursor-pointer">
              <Eye className="w-3 h-3 mr-1" />
              Ver todas
            </Badge>
          </Link>
        </div>

        <div className="space-y-2">
          {latestStandings.slice(0, 3).map((team, idx) => {
            const categoryShort = team.categoria.split(' ')[1] || team.categoria;
            const positionClass = 
              team.posicion === 1 ? "text-yellow-600" :
              team.posicion <= 3 ? "text-green-600" :
              team.posicion > team.totalTeams - 3 ? "text-red-600" :
              "text-slate-700";

            return (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200 hover:border-orange-400 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${positionClass}`}>
                    {team.posicion}º
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
            );
          })}
        </div>

        {latestStandings.length > 3 && (
          <Link to={createPageUrl("Clasificaciones")}>
            <button className="w-full mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium">
              Ver más categorías →
            </button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}