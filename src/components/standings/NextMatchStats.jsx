import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function NextMatchStats({ categoria, standings }) {
  const { data: callups = [] } = useQuery({
    queryKey: ['callups-next-match', categoria],
    queryFn: () => base44.entities.Convocatoria.list(),
  });

  // Buscar próxima convocatoria de esta categoría
  const nextCallup = callups
    .filter(c => c.categoria === categoria && c.publicada && new Date(c.fecha_partido) >= new Date())
    .sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido))[0];

  if (!nextCallup || !nextCallup.rival) return null;

  // Buscar estadísticas del rival en las clasificaciones
  const rivalStats = standings.find(s => 
    s.nombre_equipo.toLowerCase().includes(nextCallup.rival.toLowerCase()) ||
    nextCallup.rival.toLowerCase().includes(s.nombre_equipo.toLowerCase())
  );

  const bustarStats = standings.find(s => 
    s.nombre_equipo.toLowerCase().includes('bustarviejo') || 
    s.nombre_equipo.toLowerCase().includes('bustar')
  );

  if (!rivalStats || !bustarStats) return null;

  const posDiff = bustarStats.posicion - rivalStats.posicion;
  const ptsDiff = bustarStats.puntos - rivalStats.puntos;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-blue-900">Próximo Partido</h3>
          <Badge className="bg-blue-600 text-white ml-auto">
            {new Date(nextCallup.fecha_partido).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {/* CD Bustarviejo */}
          <div className="bg-white rounded-lg p-3">
            <p className="font-bold text-orange-600 mb-1">CD Bustarviejo</p>
            <div className="space-y-1 text-xs">
              <p className="flex items-center gap-2">
                <Trophy className="w-3 h-3" />
                Posición: <strong>{bustarStats.posicion}º</strong>
              </p>
              <p>Puntos: <strong>{bustarStats.puntos}</strong></p>
              <p>Racha: <strong>{bustarStats.ganados || 0}G - {bustarStats.empatados || 0}E - {bustarStats.perdidos || 0}P</strong></p>
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">VS</p>
              <p className="text-xs text-slate-600 mt-1">{nextCallup.hora_partido}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {nextCallup.local_visitante === "Local" ? "🏠 Casa" : "✈️ Fuera"}
              </Badge>
            </div>
          </div>

          {/* Rival */}
          <div className="bg-white rounded-lg p-3">
            <p className="font-bold text-slate-700 mb-1">{rivalStats.nombre_equipo}</p>
            <div className="space-y-1 text-xs">
              <p className="flex items-center gap-2">
                <Trophy className="w-3 h-3" />
                Posición: <strong>{rivalStats.posicion}º</strong>
              </p>
              <p>Puntos: <strong>{rivalStats.puntos}</strong></p>
              <p>Racha: <strong>{rivalStats.ganados || 0}G - {rivalStats.empatados || 0}E - {rivalStats.perdidos || 0}P</strong></p>
            </div>
          </div>
        </div>

        {/* Comparativa */}
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              {posDiff < 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-bold">{Math.abs(posDiff)} posiciones por encima</span>
                </>
              ) : posDiff > 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-bold">{posDiff} posiciones por debajo</span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-600">Misma posición</span>
                </>
              )}
            </div>
            <span className="text-slate-400">|</span>
            <div>
              {ptsDiff > 0 ? (
                <span className="text-green-600 font-bold">+{ptsDiff} puntos de ventaja</span>
              ) : ptsDiff < 0 ? (
                <span className="text-red-600 font-bold">{Math.abs(ptsDiff)} puntos de desventaja</span>
              ) : (
                <span className="text-slate-600">Mismos puntos</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}