import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Clock, MapPin, ChevronDown, ChevronUp, Zap } from "lucide-react";
import RecentResultCard from "./RecentResultCard";

function formatMatchDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return {
      formatted: date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }),
      short: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }),
      iso: date.toISOString().split("T")[0],
      raw: date
    };
  }
  const date = new Date(dateStr);
  if (isNaN(date)) return null;
  return {
    formatted: date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }),
    short: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }),
    iso: dateStr,
    raw: date
  };
}

function getDaysUntil(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "¡HOY!";
  if (diff === 1) return "Mañana";
  return `En ${diff} días`;
}

function getShortCategory(cat) {
  if (!cat) return "";
  return cat.replace("Fútbol ", "").replace("Baloncesto ", "🏀 ").replace("(Mixto)", "").trim();
}

function MatchCard({ match, isFirst }) {
  const isLocal = match.local?.toUpperCase().includes("BUSTARVIEJO");
  const daysUntil = getDaysUntil(match.dateInfo.raw);
  const isToday = daysUntil === "¡HOY!";
  const isTomorrow = daysUntil === "Mañana";

  return (
    <div className={`relative overflow-hidden rounded-2xl ${
      isFirst 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 shadow-xl' 
        : 'bg-gradient-to-br from-slate-800 to-slate-700 shadow-lg'
    }`}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
      
      {/* Urgency strip */}
      {(isToday || isTomorrow) && (
        <div className={`${isToday ? 'bg-red-500' : 'bg-orange-500'} text-white text-[10px] font-black tracking-widest text-center py-1 uppercase`}>
          <Zap className="w-3 h-3 inline mr-1" />
          {daysUntil}
          <Zap className="w-3 h-3 inline ml-1" />
        </div>
      )}

      <div className={`p-4 ${isFirst ? 'pb-5' : 'pb-4'}`}>
        {/* Top: Category + Countdown */}
        <div className="flex items-center justify-between mb-3">
          <Badge className="bg-green-600/80 text-white text-[10px] font-bold border-0">
            ⚽ {getShortCategory(match.categoria)}
          </Badge>
          {!isToday && !isTomorrow && (
            <span className="text-[10px] text-green-400 font-semibold bg-green-900/50 rounded-full px-2.5 py-0.5">
              {daysUntil}
            </span>
          )}
          {match.jornada && (
            <span className="text-[10px] text-slate-400 font-semibold">
              Jornada {match.jornada}
            </span>
          )}
        </div>

        {/* Teams VS */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 text-center">
            <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-1.5 ${
              isLocal ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30' : 'bg-slate-600/60'
            }`}>
              <span className="text-xl">{isLocal ? "🏠" : "⚽"}</span>
            </div>
            <p className={`font-bold text-sm leading-tight ${isLocal ? 'text-orange-400' : 'text-white'}`}>
              {match.local}
            </p>
            {isLocal && <p className="text-[9px] text-orange-300/80 font-semibold mt-0.5">NOSOTROS</p>}
          </div>

          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isFirst ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/40' : 'bg-green-600/50'
            }`}>
              <span className="text-white font-black text-sm">VS</span>
            </div>
          </div>

          <div className="flex-1 text-center">
            <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-1.5 ${
              !isLocal ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30' : 'bg-slate-600/60'
            }`}>
              <span className="text-xl">{!isLocal ? "🏠" : "⚽"}</span>
            </div>
            <p className={`font-bold text-sm leading-tight ${!isLocal ? 'text-orange-400' : 'text-white'}`}>
              {match.visitante}
            </p>
            {!isLocal && <p className="text-[9px] text-orange-300/80 font-semibold mt-0.5">NOSOTROS</p>}
          </div>
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs">
            <Calendar className="w-3.5 h-3.5 text-green-400" />
            <span className="capitalize">{match.dateInfo.short}</span>
          </div>
          {match.hora && (
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs">
              <Clock className="w-3.5 h-3.5 text-green-400" />
              <span className="font-semibold">{match.hora}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs">
            <MapPin className="w-3.5 h-3.5 text-green-400" />
            <span>{isLocal ? "Casa" : "Fuera"}</span>
          </div>
        </div>

        {/* Campo */}
        {match.campo && (
          !isLocal ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.campo)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 mt-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="text-[10px] text-blue-300 truncate">📍 {match.campo}</span>
              <span className="text-[10px] text-blue-400 font-semibold whitespace-nowrap">→ Mapa</span>
            </a>
          ) : (
            <p className="text-center text-[10px] text-slate-400 mt-2 truncate">
              📍 {match.campo}
            </p>
          )
        )}
      </div>
    </div>
  );
}

export default function UpcomingMatchesSection() {
  const [expanded, setExpanded] = useState(false);

  // Fuente 1: Partidos scrapeados de la federación (ProximoPartido)
  const { data: proximosPartidos = [], isLoading: loadingProximos } = useQuery({
    queryKey: ["proximos-partidos-all"],
    queryFn: () => base44.entities.ProximoPartido.list("-updated_date", 100),
    staleTime: 5 * 60_000,
  });

  const isLoading = loadingProximos;

  // Solo datos de la RFFM (ProximoPartido) — sin mezclar convocatorias manuales
  const matches = proximosPartidos;

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-r-transparent"></div>
        <p className="text-xs text-green-400 mt-3">Cargando partidos...</p>
      </div>
    );
  }

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Normalize for deduplication
  const normCatDedup = (s) => (s || '').trim().toLowerCase().replace(/\(mixto\)/g, '').replace(/\s+/g, ' ').trim();

  // Deduplicate matches by categoria + fecha (1 match per category per day)
  // Prioritize entries with more data (ProximoPartido over Convocatoria)
  const seen = new Set();
  const allWithDates = matches
    .map(m => ({ ...m, dateInfo: formatMatchDate(m.fecha || m.fecha_iso) }))
    .filter(m => m.dateInfo)
    .filter(m => {
      const key = `${normCatDedup(m.categoria)}|${m.dateInfo.iso}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Split into: played (with result), finished today (hour passed), and future
  const recentResults = allWithDates
    .filter(m => m.jugado && m.goles_local != null && m.goles_visitante != null)
    .sort((a, b) => b.dateInfo.raw - a.dateInfo.raw)
    .slice(0, 4); // Last 4 results

  const futureMatches = allWithDates
    .filter(m => {
      // Already played with result → skip (shown in results)
      if (m.jugado) return false;
      // Future date → show
      if (m.dateInfo.raw > today) return true;
      // Today: if has hora and hora+2h passed, hide it
      if (m.dateInfo.raw.getTime() === today.getTime() && m.hora) {
        const [h, min] = m.hora.split(':').map(Number);
        const matchEnd = new Date(now);
        matchEnd.setHours(h + 2, min || 0, 0, 0);
        if (now > matchEnd) return false;
      }
      // Today without hora or still ongoing → show
      if (m.dateInfo.raw >= today) return true;
      return false;
    })
    .sort((a, b) => a.dateInfo.raw - b.dateInfo.raw);

  if (futureMatches.length === 0 && recentResults.length === 0) {
    // Sin datos: podría ser fuera de temporada o simplemente sin partidos programados
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-500/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <p className="text-white font-bold text-lg mb-1">¡Preparando la temporada!</p>
          <p className="text-slate-400 text-sm mb-4">Los partidos y resultados aparecerán aquí cuando comience la competición.</p>
          <div className="flex justify-center gap-2">
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-semibold border border-orange-500/30">
              🏟️ Desde 1989
            </span>
            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-semibold border border-green-500/30">
              💚 Bustarviejo
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Group by date
  const groupedByDate = {};
  futureMatches.forEach(m => {
    const key = m.dateInfo.iso;
    if (!groupedByDate[key]) groupedByDate[key] = { date: m.dateInfo, matches: [] };
    groupedByDate[key].matches.push(m);
  });

  const dateGroups = Object.values(groupedByDate);
  const displayGroups = expanded ? dateGroups : dateGroups.slice(0, 3);
  const hasMore = dateGroups.length > 3;

  // First match gets special treatment
  let isFirstGlobal = true;

  return (
    <div className="space-y-4">
      {/* Próximos Partidos - PRIMERO */}
      {futureMatches.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <Trophy className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg leading-tight">Próximos Partidos</h3>
              <p className="text-[11px] text-slate-500">{futureMatches.length} partido{futureMatches.length !== 1 ? 's' : ''} programado{futureMatches.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* Match groups */}
      {futureMatches.length > 0 && <div className="space-y-5">
        {displayGroups.map((group) => {
          return (
            <div key={group.date.iso}>
              {/* Date divider */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1">
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />
                  <p className="font-bold text-xs text-slate-700 capitalize">{group.date.formatted}</p>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">
                  {group.matches.length} partido{group.matches.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Matches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.matches.map((match, idx) => {
                  const isFirst = isFirstGlobal;
                  isFirstGlobal = false;
                  return <MatchCard key={match.id || idx} match={match} isFirst={isFirst} />;
                })}
              </div>
            </div>
          );
        })}
      </div>}

      {/* Expand button */}
      {hasMore && futureMatches.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 rounded-xl"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1.5" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1.5" />
              Ver todos los partidos ({futureMatches.length})
            </>
          )}
        </Button>
      )}

      {/* Últimos Resultados - DESPUÉS */}
      {recentResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-lg">
              <Trophy className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg leading-tight">Últimos Resultados</h3>
              <p className="text-[11px] text-slate-500">{recentResults.length} partido{recentResults.length !== 1 ? 's' : ''} jugado{recentResults.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentResults.map((match, idx) => (
              <RecentResultCard key={match.id || idx} match={match} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}