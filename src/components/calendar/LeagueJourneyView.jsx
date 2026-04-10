import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MapPin, Calendar, Clock } from "lucide-react";
import { extractTownFromCampo } from "../utils/campoParsing";

function getShortCat(cat) {
  if (!cat) return "";
  return cat.replace("Fútbol ", "").replace("Baloncesto ", "🏀 ").replace("(Mixto)", "").trim();
}

function JornadaRow({ match, isNext }) {
  const isBust = (s) => (s || "").toUpperCase().includes("BUSTARVIEJO");
  const isLocal = isBust(match.local);
  const rival = isLocal ? match.visitante : match.local;
  const played = match.jugado && match.goles_local != null && match.goles_visitante != null;

  const gf = isLocal ? match.goles_local : match.goles_visitante;
  const gc = isLocal ? match.goles_visitante : match.goles_local;

  let bg = "bg-white border-slate-200";
  let resultBadge = null;

  if (played) {
    if (gf > gc) {
      bg = "bg-green-50 border-green-300";
      resultBadge = <span className="text-green-700 font-black text-sm">{match.goles_local}-{match.goles_visitante}</span>;
    } else if (gf === gc) {
      bg = "bg-yellow-50 border-yellow-300";
      resultBadge = <span className="text-yellow-700 font-black text-sm">{match.goles_local}-{match.goles_visitante}</span>;
    } else {
      bg = "bg-red-50 border-red-300";
      resultBadge = <span className="text-red-600 font-black text-sm">{match.goles_local}-{match.goles_visitante}</span>;
    }
  }

  if (isNext) bg = "bg-orange-50 border-orange-400 ring-2 ring-orange-200";

  // Parse date from fecha or fecha_iso
  let dateStr = "";
  if (match.fecha) {
    const parts = match.fecha.split("/");
    if (parts.length === 3) {
      const [d, m] = parts;
      const date = new Date(parseInt(parts[2]), parseInt(m) - 1, parseInt(d));
      dateStr = date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
    }
  } else if (match.fecha_iso) {
    const date = new Date(match.fecha_iso);
    if (!isNaN(date)) dateStr = date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all ${bg}`}>
      {/* Jornada number */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm ${
        isNext ? "bg-orange-500 text-white" : played ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500"
      }`}>
        {match.jornada || "?"}
      </div>

      {/* Match info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold text-sm truncate ${isNext ? "text-orange-800" : "text-slate-800"}`}>
            {rival}
          </span>
          <Badge variant="outline" className={`text-[9px] px-1 py-0 flex-shrink-0 ${
            isLocal ? "border-green-300 text-green-700 bg-green-50" : "border-blue-300 text-blue-700 bg-blue-50"
          }`}>
            {isLocal ? "🏠" : "📍"}
          </Badge>
          {isNext && <Badge className="bg-orange-500 text-white text-[9px] px-1.5 py-0">⚽ PRÓXIMO</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
          {dateStr && <span className="capitalize">{dateStr}</span>}
          {match.hora && <span>· {match.hora}</span>}
          {!isLocal && match.campo && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('campo de fútbol ' + match.campo)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline truncate max-w-[120px]"
              onClick={e => e.stopPropagation()}
            >
              {extractTownFromCampo(match.campo) || match.campo}
            </a>
          )}
        </div>
      </div>

      {/* Result or pending */}
      <div className="flex-shrink-0 text-right">
        {played ? (
          resultBadge
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">
            {dateStr ? "Pendiente" : "Sin fecha"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function LeagueJourneyView({ matches, category }) {
  const [showAll, setShowAll] = useState(false);

  // Filter matches for this category, sorted by jornada
  const catMatches = useMemo(() => {
    if (!matches || !category) return [];
    const normCat = (s) => (s || "").trim().toLowerCase().replace(/\(mixto\)/g, "").replace(/\s+/g, " ").trim();
    const target = normCat(category);
    return matches
      .filter(m => normCat(m.categoria).includes(target) || target.includes(normCat(m.categoria)))
      .sort((a, b) => (a.jornada || 999) - (b.jornada || 999));
  }, [matches, category]);

  // Find next match (first non-played)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextIdx = catMatches.findIndex(m => {
    if (m.jugado) return false;
    return true;
  });

  // Stats
  const played = catMatches.filter(m => m.jugado).length;
  const total = catMatches.length;
  const remaining = total - played;

  const isBust = (s) => (s || "").toUpperCase().includes("BUSTARVIEJO");
  let wins = 0, draws = 0, losses = 0;
  catMatches.filter(m => m.jugado && m.goles_local != null).forEach(m => {
    const isLocal = isBust(m.local);
    const gf = isLocal ? m.goles_local : m.goles_visitante;
    const gc = isLocal ? m.goles_visitante : m.goles_local;
    if (gf > gc) wins++;
    else if (gf === gc) draws++;
    else losses++;
  });

  if (catMatches.length === 0) return null;

  // By default show: 2 recent results + next + 2 upcoming. Toggle to show all.
  const displayMatches = showAll ? catMatches : (() => {
    if (nextIdx < 0) return catMatches.slice(-5); // all played, show last 5
    const start = Math.max(0, nextIdx - 2);
    const end = Math.min(catMatches.length, nextIdx + 3);
    return catMatches.slice(start, end);
  })();

  // We need to track which jornada index maps to in the full array
  const displaySet = new Set(displayMatches.map(m => m.id || `${m.jornada}-${m.local}`));

  return (
    <div className="space-y-3">
      {/* Mini stats bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1">
          <span className="text-[10px] font-bold text-slate-600">J{played}/{total}</span>
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full" style={{ width: `${total ? (played / total) * 100 : 0}%` }} />
          </div>
        </div>
        <span className="text-[10px] text-green-700 font-semibold">✅{wins}</span>
        <span className="text-[10px] text-yellow-700 font-semibold">🤝{draws}</span>
        <span className="text-[10px] text-red-600 font-semibold">❌{losses}</span>
        <span className="text-[10px] text-slate-500 ml-auto">{remaining} por jugar</span>
      </div>

      {/* Jornadas list */}
      <div className="space-y-1.5">
        {displayMatches.map((m, idx) => {
          const realIdx = catMatches.indexOf(m);
          return (
            <JornadaRow
              key={m.id || `${m.jornada}-${m.local}-${idx}`}
              match={m}
              isNext={realIdx === nextIdx}
            />
          );
        })}
      </div>

      {/* Toggle */}
      {catMatches.length > 5 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full rounded-xl text-xs border-slate-300"
        >
          {showAll ? (
            <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Ver resumen</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Ver todas las jornadas ({total})</>
          )}
        </Button>
      )}
    </div>
  );
}