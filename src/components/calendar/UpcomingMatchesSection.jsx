import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react";

function formatMatchDate(dateStr) {
  if (!dateStr) return null;
  // Handle dd/mm/yyyy format from RFFM
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return {
      formatted: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }),
      iso: date.toISOString().split("T")[0],
      raw: date
    };
  }
  // Handle ISO format
  const date = new Date(dateStr);
  if (isNaN(date)) return null;
  return {
    formatted: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }),
    iso: dateStr,
    raw: date
  };
}

function getShortCategory(cat) {
  if (!cat) return "";
  return cat
    .replace("Fútbol ", "")
    .replace("Baloncesto ", "🏀 ")
    .replace("(Mixto)", "")
    .trim();
}

export default function UpcomingMatchesSection() {
  const [expanded, setExpanded] = useState(false);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["proximos-partidos-all"],
    queryFn: () => base44.entities.ProximoPartido.list("-updated_date", 100),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-green-600 border-r-transparent"></div>
          <p className="text-xs text-green-700 mt-2">Cargando partidos...</p>
        </CardContent>
      </Card>
    );
  }

  // Filter only future matches and sort by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureMatches = matches
    .map(m => {
      const dateInfo = formatMatchDate(m.fecha || m.fecha_iso);
      return { ...m, dateInfo };
    })
    .filter(m => {
      if (!m.dateInfo) return false;
      return m.dateInfo.raw >= today;
    })
    .sort((a, b) => a.dateInfo.raw - b.dateInfo.raw);

  if (futureMatches.length === 0) {
    return (
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-4 text-center">
          <Trophy className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-700">No hay partidos próximos</p>
          <p className="text-xs text-green-600 mt-1">Los próximos partidos aparecerán aquí automáticamente</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const groupedByDate = {};
  futureMatches.forEach(m => {
    const key = m.dateInfo.iso;
    if (!groupedByDate[key]) {
      groupedByDate[key] = { date: m.dateInfo, matches: [] };
    }
    groupedByDate[key].matches.push(m);
  });

  const dateGroups = Object.values(groupedByDate);
  const displayGroups = expanded ? dateGroups : dateGroups.slice(0, 2);
  const hasMore = dateGroups.length > 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-green-700" />
          <h3 className="font-bold text-slate-900 text-base">⚽ Próximos Partidos</h3>
          <Badge className="bg-green-600 text-white text-xs">{futureMatches.length}</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {displayGroups.map((group) => (
          <div key={group.date.iso}>
            {/* Date header */}
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <p className="font-bold text-sm text-slate-800 capitalize">{group.date.formatted}</p>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            {/* Matches for this date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {group.matches.map((match, idx) => {
                const isLocal = match.local?.toUpperCase().includes("BUSTARVIEJO");
                const rival = isLocal ? match.visitante : match.local;
                
                return (
                  <Card key={`${match.id || idx}`} className="border border-green-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge className="bg-green-100 text-green-800 text-[10px] font-bold">
                          {getShortCategory(match.categoria)}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${isLocal ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'}`}>
                          {isLocal ? "🏠 Local" : "✈️ Visitante"}
                        </Badge>
                      </div>

                      {/* Teams */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 text-center">
                          <p className={`font-bold text-xs ${isLocal ? 'text-orange-600' : 'text-slate-600'}`}>
                            {match.local}
                          </p>
                        </div>
                        <span className="text-green-600 font-black text-sm">VS</span>
                        <div className="flex-1 text-center">
                          <p className={`font-bold text-xs ${!isLocal ? 'text-orange-600' : 'text-slate-600'}`}>
                            {match.visitante}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        {match.hora && (
                          <span className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-0.5">
                            <Clock className="w-3 h-3" />
                            {match.hora}
                          </span>
                        )}
                        {match.campo && (
                          <span className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-0.5 truncate max-w-[180px]">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {match.campo}
                          </span>
                        )}
                        {match.jornada && (
                          <span className="bg-green-100 text-green-700 rounded-md px-2 py-0.5 font-semibold">
                            J{match.jornada}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-green-700 hover:text-green-800 hover:bg-green-50"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Ver todos los partidos ({futureMatches.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}