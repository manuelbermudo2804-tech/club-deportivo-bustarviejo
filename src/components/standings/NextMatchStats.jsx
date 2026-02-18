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
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-orange-500/50 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-orange-400" />
        <h3 className="font-bold text-lg">Próximo Partido</h3>
        <Badge className="bg-orange-600 text-white ml-auto">
          {new Date(nextCallup.fecha_partido).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        {/* CD Bustarviejo */}
        <div className="bg-white/10 rounded-xl p-3 border border-white/10">
          <p className="font-bold text-orange-400 mb-2">CD Bustarviejo</p>
          <div className="space-y-1.5 text-xs text-slate-300">
            <p className="flex items-center gap-2">
              <Trophy className="w-3 h-3 text-yellow-400" />
              Posición: <strong className="text-white">{bustarStats.posicion}º</strong>
            </p>
            <p>Puntos: <strong className="text-white">{bustarStats.puntos}</strong></p>
            <p>Registro: <strong className="text-white">{bustarStats.ganados || 0}V - {bustarStats.empatados || 0}E - {bustarStats.perdidos || 0}D</strong></p>
          </div>
        </div>

        {/* VS */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-black text-orange-500">VS</p>
            <p className="text-xs text-slate-400 mt-1">{nextCallup.hora_partido}</p>
            <Badge className="mt-1.5 bg-white/10 border border-white/20 text-slate-300 text-xs">
              {nextCallup.local_visitante === "Local" ? "🏠 Casa" : "✈️ Fuera"}
            </Badge>
          </div>
        </div>

        {/* Rival */}
        <div className="bg-white/10 rounded-xl p-3 border border-white/10">
          <p className="font-bold text-slate-200 mb-2">{rivalStats.nombre_equipo}</p>
          <div className="space-y-1.5 text-xs text-slate-300">
            <p className="flex items-center gap-2">
              <Trophy className="w-3 h-3 text-slate-400" />
              Posición: <strong className="text-white">{rivalStats.posicion}º</strong>
            </p>
            <p>Puntos: <strong className="text-white">{rivalStats.puntos}</strong></p>
            <p>Registro: <strong className="text-white">{rivalStats.ganados || 0}V - {rivalStats.empatados || 0}E - {rivalStats.perdidos || 0}D</strong></p>
          </div>
        </div>
      </div>

      {/* Comparativa */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            {posDiff < 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-bold">{Math.abs(posDiff)} posiciones por encima</span>
              </>
            ) : posDiff > 0 ? (
              <>
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-bold">{posDiff} posiciones por debajo</span>
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Misma posición</span>
              </>
            )}
          </div>
          <span className="text-slate-600">|</span>
          <div>
            {ptsDiff > 0 ? (
              <span className="text-green-400 font-bold">+{ptsDiff} puntos de ventaja</span>
            ) : ptsDiff < 0 ? (
              <span className="text-red-400 font-bold">{Math.abs(ptsDiff)} puntos de desventaja</span>
            ) : (
              <span className="text-slate-400">Mismos puntos</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}