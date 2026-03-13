import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const LEVELS = [
  { name: "Bronce", emoji: "🥉", min: 0, color: "from-amber-700 to-amber-500", textColor: "text-amber-100", bgRing: "ring-amber-400/50" },
  { name: "Plata", emoji: "🥈", min: 50, color: "from-slate-400 to-slate-300", textColor: "text-slate-700", bgRing: "ring-slate-300/60" },
  { name: "Oro", emoji: "🥇", min: 75, color: "from-yellow-500 to-amber-400", textColor: "text-yellow-900", bgRing: "ring-yellow-400/60" },
  { name: "Diamante", emoji: "💎", min: 90, color: "from-cyan-400 to-blue-500", textColor: "text-white", bgRing: "ring-cyan-300/60" },
];

export default function MinorCommitmentLevel({ attendances, playerId }) {
  const { pct, total, presente, level, nextLevel, pctToNext } = useMemo(() => {
    if (!attendances?.length || !playerId) return { pct: 0, total: 0, presente: 0, level: LEVELS[0], nextLevel: LEVELS[1], pctToNext: 0 };

    const records = attendances
      .map(att => att.asistencias?.find(a => a.jugador_id === playerId))
      .filter(Boolean);

    const total = records.length;
    const presente = records.filter(r => r.estado === "presente" || r.estado === "tardanza").length;
    const pct = total > 0 ? Math.round((presente / total) * 100) : 0;

    let currentLevel = LEVELS[0];
    let next = LEVELS[1];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (pct >= LEVELS[i].min) {
        currentLevel = LEVELS[i];
        next = LEVELS[i + 1] || null;
        break;
      }
    }

    const pctToNext = next ? Math.min(100, Math.round(((pct - currentLevel.min) / (next.min - currentLevel.min)) * 100)) : 100;

    return { pct, total, presente, level: currentLevel, nextLevel: next, pctToNext };
  }, [attendances, playerId]);

  if (total < 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", delay: 0.1 }}
    >
      <Card className={`border-none shadow-xl overflow-hidden bg-gradient-to-br ${level.color}`}>
        <CardContent className="p-4 relative">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-black/5 rounded-full blur-xl" />
          </div>

          <div className="relative flex items-center gap-4">
            <motion.div
              className={`w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ${level.bgRing}`}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="text-3xl">{level.emoji}</span>
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${level.textColor} opacity-70 uppercase tracking-wider`}>
                Nivel de compromiso
              </p>
              <h3 className={`font-black text-xl ${level.textColor}`}>
                {level.name}
              </h3>
              <p className={`text-xs ${level.textColor} opacity-80`}>
                {pct}% asistencia · {presente}/{total} sesiones
              </p>
            </div>
          </div>

          {/* Progress to next level */}
          {nextLevel && (
            <div className="relative mt-3">
              <div className="flex justify-between text-[10px] font-bold mb-1 opacity-70" style={{ color: "white" }}>
                <span>{level.emoji} {level.name}</span>
                <span>{nextLevel.emoji} {nextLevel.name} ({nextLevel.min}%)</span>
              </div>
              <div className="h-2 bg-black/15 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white/60 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pctToNext}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>
          )}

          {!nextLevel && (
            <motion.p
              className={`text-center text-xs font-bold mt-3 ${level.textColor}`}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ✨ ¡Has alcanzado el nivel máximo! ✨
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}