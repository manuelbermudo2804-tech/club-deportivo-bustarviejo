import React from "react";
import { Badge } from "@/components/ui/badge";

function getShortCategory(cat) {
  if (!cat) return "";
  return cat.replace("Fútbol ", "").replace("Baloncesto ", "🏀 ").replace("(Mixto)", "").trim();
}

export default function RecentResultCard({ match }) {
  const isLocal = match.local?.toUpperCase().includes("BUSTARVIEJO");
  const gf = isLocal ? match.goles_local : match.goles_visitante;
  const gc = isLocal ? match.goles_visitante : match.goles_local;
  const won = gf > gc;
  const draw = gf === gc;
  const resultColor = won ? "from-green-600 to-green-700" : draw ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600";
  const resultEmoji = won ? "✅" : draw ? "🤝" : "❌";
  const resultLabel = won ? "Victoria" : draw ? "Empate" : "Derrota";

  return (
    <div className="relative overflow-hidden rounded-xl bg-white border-2 border-slate-200 shadow-sm">
      {/* Result strip */}
      <div className={`bg-gradient-to-r ${resultColor} text-white text-[10px] font-black tracking-widest text-center py-1 uppercase`}>
        {resultEmoji} {resultLabel}
      </div>

      <div className="p-3">
        {/* Category */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-[10px] font-bold border-slate-300">
            ⚽ {getShortCategory(match.categoria)}
          </Badge>
          {match.jornada && (
            <span className="text-[10px] text-slate-400 font-semibold">
              J{match.jornada}
            </span>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 text-right">
            <p className={`font-bold text-sm leading-tight ${isLocal ? 'text-orange-600' : 'text-slate-700'}`}>
              {match.local}
            </p>
          </div>

          <div className="flex-shrink-0 bg-slate-900 rounded-lg px-3 py-1.5 min-w-[60px] text-center">
            <span className="text-white font-black text-lg">
              {match.goles_local} - {match.goles_visitante}
            </span>
          </div>

          <div className="flex-1 text-left">
            <p className={`font-bold text-sm leading-tight ${!isLocal ? 'text-orange-600' : 'text-slate-700'}`}>
              {match.visitante}
            </p>
          </div>
        </div>

        {/* Date */}
        {match.dateInfo && (
          <p className="text-center text-[10px] text-slate-400 mt-2 capitalize">
            {match.dateInfo.short}
          </p>
        )}
      </div>
    </div>
  );
}