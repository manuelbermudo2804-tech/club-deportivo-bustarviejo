import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function StandingsTable({ categoria }) {
  const [standings, setStandings] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStandings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await base44.functions.getStandings({
        categoria,
        temporada: "2024-2025",
        source: "rffm"
      });
      
      if (result.success) {
        setStandings(result.standings);
        setMetadata(result.metadata);
      } else {
        setError(result.error || "No se pudo cargar la clasificación");
      }
    } catch (err) {
      setError("Error al cargar clasificación: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position, totalTeams) => {
    if (position <= 3) return "bg-green-100 text-green-800";
    if (position >= totalTeams - 2) return "bg-red-100 text-red-800";
    return "bg-slate-100 text-slate-800";
  };

  if (standings.length === 0 && !loading && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-600" />
              Clasificación
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">Carga la clasificación actual de la liga</p>
            <Button onClick={loadStandings} className="bg-orange-600 hover:bg-orange-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Cargar Clasificación
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-600" />
              Clasificación
            </CardTitle>
            {metadata && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {metadata.grupo && (
                  <Badge variant="outline" className="text-xs">
                    {metadata.grupo}
                  </Badge>
                )}
                {metadata.jornada && (
                  <Badge variant="outline" className="text-xs">
                    Jornada {metadata.jornada}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button 
            onClick={loadStandings} 
            size="sm" 
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
            <p className="text-sm text-slate-500 mt-3">Cargando clasificación...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadStandings} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        )}

        {!loading && !error && standings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Equipo</th>
                  <th className="text-center py-2 px-2">PJ</th>
                  <th className="text-center py-2 px-2 hidden md:table-cell">G</th>
                  <th className="text-center py-2 px-2 hidden md:table-cell">E</th>
                  <th className="text-center py-2 px-2 hidden md:table-cell">P</th>
                  <th className="text-center py-2 px-2 hidden sm:table-cell">GF</th>
                  <th className="text-center py-2 px-2 hidden sm:table-cell">GC</th>
                  <th className="text-center py-2 px-2">DG</th>
                  <th className="text-center py-2 px-2 font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => {
                  const isCDBusta = team.equipo.toLowerCase().includes('bustarviejo');
                  
                  return (
                    <tr 
                      key={team.posicion}
                      className={`border-b border-slate-100 ${
                        isCDBusta ? 'bg-orange-50 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-2">
                        <Badge className={getPositionColor(team.posicion, standings.length)}>
                          {team.posicion}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {team.equipo}
                          {isCDBusta && <span className="text-orange-600">★</span>}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">{team.partidos_jugados}</td>
                      <td className="text-center py-3 px-2 hidden md:table-cell text-green-600">{team.ganados}</td>
                      <td className="text-center py-3 px-2 hidden md:table-cell text-orange-600">{team.empatados}</td>
                      <td className="text-center py-3 px-2 hidden md:table-cell text-red-600">{team.perdidos}</td>
                      <td className="text-center py-3 px-2 hidden sm:table-cell">{team.goles_favor}</td>
                      <td className="text-center py-3 px-2 hidden sm:table-cell">{team.goles_contra}</td>
                      <td className="text-center py-3 px-2">
                        <span className={team.diferencia > 0 ? 'text-green-600' : team.diferencia < 0 ? 'text-red-600' : ''}>
                          {team.diferencia > 0 ? '+' : ''}{team.diferencia}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2 font-bold text-orange-600">{team.puntos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-4 text-xs text-slate-500 text-center">
              <p>PJ: Partidos Jugados | G: Ganados | E: Empatados | P: Perdidos | GF: Goles Favor | GC: Goles Contra | DG: Diferencia de Goles</p>
              {metadata?.ultima_actualizacion && (
                <p className="mt-1">Última actualización: {new Date(metadata.ultima_actualizacion).toLocaleDateString('es-ES')}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}