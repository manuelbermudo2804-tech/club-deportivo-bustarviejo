import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Mini-podio Top 3 en vivo para el hero del landing de la Porra.
 * Solo se muestra cuando hay puntuaciones reales (puntos_total > 0 en al menos uno).
 */
export default function PorraHeroPodium() {
  const [top, setTop] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("porraRanking", { limite: 3 });
        const ranking = res?.data?.ranking || [];
        if (!cancelled) {
          setTop(ranking);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!loaded) return null;

  // No mostrar si nadie tiene puntos todavía (la porra aún no ha empezado a puntuar)
  const hayPuntos = top.some(p => (p.puntos_total || 0) > 0);
  if (!hayPuntos || top.length === 0) return null;

  const medals = ["🥇", "🥈", "🥉"];
  const bgs = [
    "from-yellow-400/30 to-amber-500/20 border-yellow-300/40",
    "from-slate-200/30 to-slate-400/20 border-slate-200/40",
    "from-orange-400/30 to-orange-600/20 border-orange-300/40",
  ];

  const renderMov = (mov) => {
    if (!mov || mov === 0) return <Minus className="w-3 h-3 text-white/50" />;
    if (mov > 0) return (
      <span className="flex items-center gap-0.5 text-green-300 text-xs font-bold">
        <TrendingUp className="w-3 h-3" />{mov}
      </span>
    );
    return (
      <span className="flex items-center gap-0.5 text-red-300 text-xs font-bold">
        <TrendingDown className="w-3 h-3" />{Math.abs(mov)}
      </span>
    );
  };

  return (
    <div className="mt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          EN VIVO
        </span>
        <h3 className="text-white font-bold text-sm md:text-base flex items-center gap-1.5">
          <Trophy className="w-4 h-4" /> Top 3 del ranking
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {top.map((p, i) => (
          <Link
            key={i}
            to="/PorraRanking"
            className={`bg-gradient-to-br ${bgs[i]} backdrop-blur-md border rounded-2xl p-3 md:p-4 text-center hover:scale-105 transition-transform`}
          >
            <div className="text-2xl md:text-3xl mb-1">{medals[i]}</div>
            <div className="text-white font-bold text-xs md:text-sm truncate" title={p.alias_equipo}>
              {p.alias_equipo}
            </div>
            <div className="text-white text-lg md:text-xl font-extrabold mt-1">
              {p.puntos_total} <span className="text-xs font-medium opacity-80">pts</span>
            </div>
            <div className="flex justify-center mt-1 h-4">
              {renderMov(p.movimiento)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}