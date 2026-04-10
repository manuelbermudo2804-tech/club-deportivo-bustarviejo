import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Clock, Filter, X, ChevronDown, ChevronUp, Plane, Trophy } from "lucide-react";

const BUST = ["BUSTARVIEJO"];
function isBust(name) {
  if (!name) return false;
  return BUST.some(b => name.toUpperCase().includes(b));
}

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const year = y.length === 2 ? `20${y}` : y;
  return new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00`);
}

function formatDate(dateStr) {
  const d = parseDateStr(dateStr);
  if (!d || isNaN(d)) return dateStr || "Sin fecha";
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function getShortCat(cat) {
  if (!cat) return "";
  return cat.replace("Fútbol ", "").replace("Baloncesto ", "🏀 ").replace("(Mixto)", "").trim();
}

function MatchItem({ match, highlight }) {
  const isLocal = isBust(match.local);
  const rival = isLocal ? match.visitante : match.local;
  const isFinalizado = match.estado === "finalizado";

  let bgClass = "bg-white border-slate-200";
  let icon = "⏳";
  if (highlight) {
    bgClass = "bg-orange-50 border-orange-300 ring-2 ring-orange-200";
    icon = "⚠️";
  } else if (isFinalizado) {
    const gf = isLocal ? match.goles_local : match.goles_visitante;
    const gc = isLocal ? match.goles_visitante : match.goles_local;
    if (gf > gc) { bgClass = "bg-green-50 border-green-200"; icon = "✅"; }
    else if (gf === gc) { bgClass = "bg-yellow-50 border-yellow-200"; icon = "🤝"; }
    else { bgClass = "bg-red-50 border-red-200"; icon = "❌"; }
  }

  return (
    <div className={`rounded-xl border-2 p-3 transition-all ${bgClass}`}>
      <div className="flex items-start gap-3">
        <div className="text-center min-w-[36px]">
          <div className="text-base">{icon}</div>
          <div className="text-[9px] text-slate-500 font-medium mt-0.5">J.{match.jornada}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-900 truncate">{rival}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isLocal ? "border-green-300 text-green-700" : "border-blue-300 text-blue-700"}`}>
              {isLocal ? "🏠 Local" : "📍 Visitante"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
            {match.fecha_partido && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(match.fecha_partido)}</span>
            )}
            {match.hora_partido && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{match.hora_partido}</span>
            )}
            {match.campo && !isLocal && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('campo de fútbol ' + match.campo)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                <MapPin className="w-3 h-3" />{match.campo}
              </a>
            )}
          </div>
          {isFinalizado && (
            <div className="mt-1 text-sm font-bold text-slate-800">
              {match.goles_local} - {match.goles_visitante}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyTeamSchedule({ myCategories }) {
  const [showFilter, setShowFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [showPast, setShowPast] = useState(false);

  // Fetch results for all my categories
  const { data: allResults, isLoading } = useQuery({
    queryKey: ["my-team-schedule", myCategories.join(",")],
    queryFn: async () => {
      if (!myCategories.length) return [];
      const promises = myCategories.map(cat =>
        base44.entities.Resultado.filter({ categoria: cat }, "jornada", 500)
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: myCategories.length > 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const bustMatches = useMemo(() => {
    if (!allResults) return [];
    return allResults
      .filter(r => isBust(r.local) || isBust(r.visitante))
      .sort((a, b) => {
        const da = parseDateStr(a.fecha_partido);
        const db = parseDateStr(b.fecha_partido);
        if (da && db) return da - db;
        return (a.jornada || 0) - (b.jornada || 0);
      });
  }, [allResults]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const catFiltered = useMemo(() => {
    if (selectedCat === "all") return bustMatches;
    return bustMatches.filter(m => m.categoria === selectedCat);
  }, [bustMatches, selectedCat]);

  const pendingMatches = useMemo(() => {
    return catFiltered.filter(m => {
      if (m.estado === "finalizado") return false;
      const d = parseDateStr(m.fecha_partido);
      if (!d) return m.estado === "pendiente";
      return d >= today;
    });
  }, [catFiltered, today]);

  const pastMatches = useMemo(() => {
    return catFiltered.filter(m => m.estado === "finalizado").reverse();
  }, [catFiltered]);

  const missedMatches = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return catFiltered.filter(m => {
      if (m.estado === "finalizado") return false;
      const d = parseDateStr(m.fecha_partido);
      if (!d) return false;
      return d >= from && d <= to;
    });
  }, [catFiltered, dateFrom, dateTo]);

  if (!myCategories.length) return null;

  if (isLoading) {
    return (
      <Card><CardContent className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2" />
        <p className="text-slate-600 text-sm">Cargando calendario de tu equipo...</p>
      </CardContent></Card>
    );
  }

  if (!bustMatches.length) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2.5">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">Calendario de Mi Equipo</h3>
            <p className="text-orange-100 text-xs">
              {pendingMatches.length} partido{pendingMatches.length !== 1 ? "s" : ""} pendiente{pendingMatches.length !== 1 ? "s" : ""}
              {myCategories.length > 1 ? ` en ${myCategories.length} categorías` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Category filter (if multi-category) */}
      {myCategories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCat("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCat === "all" ? "bg-orange-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-orange-300"
            }`}
          >
            Todas ({bustMatches.length})
          </button>
          {myCategories.map(cat => {
            const count = bustMatches.filter(m => m.categoria === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCat === cat ? "bg-orange-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-orange-300"
                }`}
              >
                {getShortCat(cat)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Travel filter */}
      <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="w-full flex items-center justify-between p-3 hover:bg-blue-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <Plane className="w-4 h-4" /> ¿Te vas de viaje? Mira qué partidos te pierdes
          </span>
          {showFilter ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
        </button>
        {showFilter && (
          <div className="px-3 pb-3 space-y-3 border-t border-blue-100 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Desde</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Hasta</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
              </div>
            </div>
            {dateFrom && dateTo && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                <X className="w-3 h-3 mr-1" /> Limpiar
              </Button>
            )}
            {missedMatches && (
              <div className={`rounded-lg p-3 border ${missedMatches.length === 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
                {missedMatches.length === 0 ? (
                  <p className="text-sm text-green-700 font-semibold">🎉 ¡No te pierdes ningún partido!</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-orange-800 mb-2">
                      ⚠️ Te pierdes {missedMatches.length} partido{missedMatches.length > 1 ? "s" : ""}:
                    </p>
                    <div className="space-y-2">
                      {missedMatches.map(m => <MatchItem key={m.id} match={m} highlight />)}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming matches */}
      {pendingMatches.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            Próximos partidos ({pendingMatches.length})
          </h4>
          {pendingMatches.map((m, idx) => (
            <MatchItem key={m.id || idx} match={m} highlight={idx === 0} />
          ))}
        </div>
      )}

      {/* Past matches toggle */}
      {pastMatches.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPast(!showPast)}
            className="w-full text-slate-500 hover:text-slate-700"
          >
            {showPast ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showPast ? "Ocultar resultados" : `Ver resultados anteriores (${pastMatches.length})`}
          </Button>
          {showPast && (
            <div className="space-y-2 mt-2">
              {pastMatches.map((m, idx) => <MatchItem key={m.id || idx} match={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}