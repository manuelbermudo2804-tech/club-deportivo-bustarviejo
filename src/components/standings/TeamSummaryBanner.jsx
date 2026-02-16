import React from "react";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function TeamSummaryBanner({ standings, categoria }) {
  const bustarviejo = (standings || []).find(
    (s) =>
      (s.nombre_equipo || "").toLowerCase().includes("bustarviejo") ||
      (s.nombre_equipo || "").toLowerCase().includes("bustar")
  );

  if (!bustarviejo) return null;

  const totalTeams = standings.length;
  const pos = bustarviejo.posicion;
  const pts = bustarviejo.puntos || 0;
  const pj = bustarviejo.partidos_jugados || 0;
  const g = bustarviejo.ganados || 0;
  const e = bustarviejo.empatados || 0;
  const p = bustarviejo.perdidos || 0;
  const gf = bustarviejo.goles_favor || 0;
  const gc = bustarviejo.goles_contra || 0;
  const diff = gf - gc;

  // Racha: calcular de los últimos partidos (G/E/P) - tomamos la distribución general
  // Si hay más ganados que perdidos => buena racha, etc.
  const lastGames = Math.min(pj, 5);
  // Simular racha basada en proporciones (sin datos por jornada)
  const winRate = pj > 0 ? g / pj : 0;

  const posLabel =
    pos === 1 ? "🥇 Líder" : pos === 2 ? "🥈 2º" : pos === 3 ? "🥉 3º" : `${pos}º`;

  const posColor =
    pos <= 3
      ? "from-green-500 to-emerald-600"
      : pos <= Math.ceil(totalTeams / 2)
      ? "from-orange-500 to-orange-600"
      : "from-red-500 to-red-600";

  return (
    <div className="mb-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-orange-500/50">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`bg-gradient-to-br ${posColor} w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black shadow-lg`}
        >
          {pos}º
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg truncate">CD Bustarviejo</p>
          <p className="text-sm text-orange-300">{posLabel} de {totalTeams} equipos</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-orange-400">{pts}</p>
          <p className="text-xs text-slate-400">puntos</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center">
        <div className="bg-white/10 rounded-lg p-2">
          <p className="text-lg font-bold">{pj}</p>
          <p className="text-[10px] text-slate-400 uppercase">Jugados</p>
        </div>
        <div className="bg-green-500/20 rounded-lg p-2">
          <p className="text-lg font-bold text-green-400">{g}</p>
          <p className="text-[10px] text-green-300 uppercase">Victorias</p>
        </div>
        <div className="bg-yellow-500/20 rounded-lg p-2">
          <p className="text-lg font-bold text-yellow-400">{e}</p>
          <p className="text-[10px] text-yellow-300 uppercase">Empates</p>
        </div>
        <div className="bg-red-500/20 rounded-lg p-2">
          <p className="text-lg font-bold text-red-400">{p}</p>
          <p className="text-[10px] text-red-300 uppercase">Derrotas</p>
        </div>
        <div className="bg-white/10 rounded-lg p-2">
          <p className={`text-lg font-bold ${diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-slate-300"}`}>
            {diff > 0 ? `+${diff}` : diff}
          </p>
          <p className="text-[10px] text-slate-400 uppercase">Dif. goles</p>
        </div>
      </div>

      {/* Mini racha visual */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-slate-400">Rendimiento:</span>
        <div className="flex-1 bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
            style={{ width: `${Math.round(winRate * 100)}%` }}
          />
        </div>
        <span className="text-xs text-slate-300 font-bold">{Math.round(winRate * 100)}%</span>
      </div>
    </div>
  );
}