import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Clock, MapPin } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

export default function NextMatchFromDB({ category, standings }) {
  const { data: matches } = useQuery({
    queryKey: ['proximo-partido-db', category],
    queryFn: () => base44.entities.ProximoPartido.filter({ categoria: category, jugado: false }, 'fecha_iso', 10),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  // Pick the earliest future match
  const today = new Date().toISOString().split('T')[0];
  const match = (matches || []).find(m => m.fecha_iso >= today);
  if (!match) return null;

  const isLocal = match.local?.toUpperCase().includes("BUSTARVIEJO");
  const rival = isLocal ? match.visitante : match.local;

  const rivalStats = standings?.data?.find(s =>
    s.nombre_equipo?.toUpperCase().includes(rival?.toUpperCase()?.split('"')[0]?.trim()) ||
    rival?.toUpperCase()?.includes(s.nombre_equipo?.toUpperCase())
  );
  const bustarStats = standings?.data?.find(s =>
    s.nombre_equipo?.toUpperCase().includes("BUSTARVIEJO")
  );

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-green-500/50 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-green-400" />
        <h3 className="font-bold text-lg">⚽ Próximo Partido</h3>
        {match.jornada && <Badge className="bg-green-600 text-white">Jornada {match.jornada}</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-2 items-center mb-3">
        <div className="text-center">
          <p className={`font-bold text-sm ${isLocal ? 'text-orange-400' : 'text-slate-300'}`}>
            {match.local}
          </p>
          {isLocal && <Badge className="bg-orange-600/30 text-orange-300 text-xs mt-1">Nosotros</Badge>}
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-green-400">VS</p>
        </div>
        <div className="text-center">
          <p className={`font-bold text-sm ${!isLocal ? 'text-orange-400' : 'text-slate-300'}`}>
            {match.visitante}
          </p>
          {!isLocal && <Badge className="bg-orange-600/30 text-orange-300 text-xs mt-1">Nosotros</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        {match.fecha && (
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="capitalize">{formatDate(match.fecha)}</span>
          </div>
        )}
        {match.hora && (
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 text-green-400" />
            <span>{match.hora}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
          <MapPin className="w-4 h-4 text-green-400" />
          <span>{isLocal ? "🏠 Casa" : "✈️ Fuera"}</span>
        </div>
        {match.campo && (
          !isLocal ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.campo)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="text-xs text-blue-300">📍 {match.campo}</span>
              <span className="text-[10px] text-blue-400">→ Mapa</span>
            </a>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-300">📍 {match.campo}</span>
            </div>
          )
        )}
      </div>

      {bustarStats && rivalStats && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div>
              <p className="text-orange-400 font-bold">{bustarStats.posicion}º</p>
              <p className="text-slate-400">Pos</p>
            </div>
            <div>
              <p className="text-slate-300 font-bold">
                {bustarStats.puntos} - {rivalStats.puntos}
              </p>
              <p className="text-slate-400">Puntos</p>
            </div>
            <div>
              <p className="text-slate-300 font-bold">{rivalStats.posicion}º</p>
              <p className="text-slate-400">Rival</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}