import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Clock, Filter, X, ChevronDown, ChevronUp } from "lucide-react";

const BUST_NAMES = ["BUSTARVIEJO", "C.D. BUSTARVIEJO", "CD BUSTARVIEJO", "BUSTARVIEJO C.D.", "BUSTARVIEJO CD"];

function isBustarviejo(name) {
  if (!name) return false;
  const upper = name.toUpperCase().trim();
  return BUST_NAMES.some(n => upper.includes(n));
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

function MatchRow({ match, isNext }) {
  const isFinalizado = match.estado === "finalizado";
  const isLocal = isBustarviejo(match.local);
  const isVisitante = isBustarviejo(match.visitante);
  const rival = isLocal ? match.visitante : match.visitante;
  const rivalDisplay = isLocal ? match.visitante : match.local;

  let resultIcon = "⬜";
  let resultClass = "bg-slate-50 border-slate-200";
  if (isFinalizado) {
    const gf = isLocal ? match.goles_local : match.goles_visitante;
    const gc = isLocal ? match.goles_visitante : match.goles_local;
    if (gf > gc) { resultIcon = "✅"; resultClass = "bg-green-50 border-green-200"; }
    else if (gf === gc) { resultIcon = "🤝"; resultClass = "bg-yellow-50 border-yellow-200"; }
    else { resultIcon = "❌"; resultClass = "bg-red-50 border-red-200"; }
  }
  if (isNext) resultClass = "bg-orange-50 border-orange-300 ring-2 ring-orange-200";

  return (
    <div className={`rounded-xl border-2 p-3 sm:p-4 transition-all ${resultClass}`}>
      <div className="flex items-start gap-3">
        <div className="text-center min-w-[40px]">
          <div className="text-lg">{isNext ? "🔶" : resultIcon}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">J.{match.jornada}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-900 truncate">{rivalDisplay}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isLocal ? "border-green-300 text-green-700" : "border-blue-300 text-blue-700"}`}>
              {isLocal ? "🏠 Local" : "📍 Visitante"}
            </Badge>
            {isNext && <Badge className="bg-orange-600 text-white text-[10px] px-1.5 py-0">Próximo</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
            {match.fecha_partido && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(match.fecha_partido)}</span>
            )}
            {match.hora_partido && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{match.hora_partido}</span>
            )}
            {match.campo && (
              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{match.campo}</span>
            )}
          </div>
          {isFinalizado && (
            <div className="mt-1.5 text-sm font-bold text-slate-800">
              {match.local} {match.goles_local} - {match.goles_visitante} {match.visitante}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeasonSchedule({ category }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: allResults, isLoading } = useQuery({
    queryKey: ["season-schedule", category],
    queryFn: async () => {
      const results = await base44.entities.Resultado.filter({ categoria: category }, "jornada", 2000);
      return results;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const bustMatches = useMemo(() => {
    if (!allResults) return [];
    return allResults
      .filter(r => isBustarviejo(r.local) || isBustarviejo(r.visitante))
      .sort((a, b) => (a.jornada || 0) - (b.jornada || 0));
  }, [allResults]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextMatchIdx = useMemo(() => {
    return bustMatches.findIndex(m => {
      if (m.estado === "finalizado") return false;
      const d = parseDateStr(m.fecha_partido);
      if (!d) return m.estado === "pendiente";
      return d >= today;
    });
  }, [bustMatches, today]);

  const stats = useMemo(() => {
    const played = bustMatches.filter(m => m.estado === "finalizado").length;
    const pending = bustMatches.filter(m => m.estado !== "finalizado").length;
    const total = bustMatches.length;
    let wins = 0, draws = 0, losses = 0;
    bustMatches.filter(m => m.estado === "finalizado").forEach(m => {
      const isLocal = isBustarviejo(m.local);
      const gf = isLocal ? m.goles_local : m.goles_visitante;
      const gc = isLocal ? m.goles_visitante : m.goles_local;
      if (gf > gc) wins++;
      else if (gf === gc) draws++;
      else losses++;
    });
    return { played, pending, total, wins, draws, losses };
  }, [bustMatches]);

  const filteredMissed = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return bustMatches.filter(m => {
      if (m.estado === "finalizado") return false;
      const d = parseDateStr(m.fecha_partido);
      if (!d) return false;
      return d >= from && d <= to;
    });
  }, [bustMatches, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <Card><CardContent className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2" />
        <p className="text-slate-600 text-sm">Cargando calendario...</p>
      </CardContent></Card>
    );
  }

  if (!bustMatches.length) {
    return (
      <Card className="border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-white">
        <CardContent className="p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <p className="font-bold text-slate-800 text-lg mb-2">Sin calendario de liga</p>
          <p className="text-slate-600 text-sm">El calendario estará disponible cuando se importen los datos de la RFFM.</p>
          <p className="text-xs text-slate-500 mt-2">Admin: usa "Importar historial completo" en la pestaña Resultados.</p>
        </CardContent>
      </Card>
    );
  }

  // Show only from next match onward by default, or all if toggled
  const displayMatches = showAll ? bustMatches : (nextMatchIdx >= 0 ? bustMatches : bustMatches);

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-xl border-2 border-slate-200 p-3 text-center">
          <div className="text-xl font-bold text-green-600">{stats.played}</div>
          <div className="text-[10px] text-slate-500">Jugados</div>
        </div>
        <div className="bg-white rounded-xl border-2 border-orange-200 p-3 text-center">
          <div className="text-xl font-bold text-orange-600">{nextMatchIdx >= 0 ? 1 : 0}</div>
          <div className="text-[10px] text-slate-500">Próximo</div>
        </div>
        <div className="bg-white rounded-xl border-2 border-slate-200 p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-[10px] text-slate-500">Quedan</div>
        </div>
        <div className="bg-white rounded-xl border-2 border-slate-200 p-3 text-center">
          <div className="text-xl font-bold text-slate-700">{stats.total}</div>
          <div className="text-[10px] text-slate-500">Total</div>
        </div>
      </div>

      {/* Win/Draw/Loss mini stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1">✅ {stats.wins}V</span>
        <span className="flex items-center gap-1">🤝 {stats.draws}E</span>
        <span className="flex items-center gap-1">❌ {stats.losses}D</span>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-3">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
          <span>Progreso de liga</span>
          <span className="font-semibold">{stats.played} / {stats.total} jornadas</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full transition-all"
            style={{ width: `${stats.total ? (stats.played / stats.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Date filter: "¿Qué partidos me pierdo?" */}
      <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="w-full flex items-center justify-between p-3 hover:bg-blue-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <Filter className="w-4 h-4" /> ¿Te vas de viaje? Mira qué partidos te pierdes
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
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                  <X className="w-3 h-3 mr-1" /> Limpiar
                </Button>
              </div>
            )}
            {filteredMissed && (
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                {filteredMissed.length === 0 ? (
                  <p className="text-sm text-green-700 font-semibold">🎉 ¡No te pierdes ningún partido en esas fechas!</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-orange-800 mb-2">
                      ⚠️ Te pierdes {filteredMissed.length} partido{filteredMissed.length > 1 ? "s" : ""}:
                    </p>
                    <div className="space-y-2">
                      {filteredMissed.map(m => (
                        <MatchRow key={`missed-${m.id}`} match={m} isNext={false} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match timeline */}
      <div className="space-y-2">
        {displayMatches.map((m, idx) => (
          <MatchRow
            key={m.id || `${m.jornada}-${m.local}`}
            match={m}
            isNext={idx === nextMatchIdx}
          />
        ))}
      </div>
    </div>
  );
}