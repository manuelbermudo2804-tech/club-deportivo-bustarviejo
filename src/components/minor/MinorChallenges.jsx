import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const CHALLENGES = [
  { id: "attend_5", emoji: "🎯", title: "Asistir a 5 sesiones", target: 5, type: "total" },
  { id: "attend_15", emoji: "💪", title: "Asistir a 15 sesiones", target: 15, type: "total" },
  { id: "attend_30", emoji: "🏆", title: "Asistir a 30 sesiones", target: 30, type: "total" },
  { id: "streak_3", emoji: "🔥", title: "3 sesiones seguidas", target: 3, type: "streak" },
  { id: "streak_8", emoji: "⚡", title: "8 sesiones seguidas", target: 8, type: "streak" },
  { id: "no_miss_month", emoji: "🌟", title: "Un mes sin faltar", target: 100, type: "monthly_pct" },
];

export default function MinorChallenges({ attendances, playerId }) {
  const { totalPresente, streak, monthlyPct } = useMemo(() => {
    if (!attendances?.length || !playerId) return { totalPresente: 0, streak: 0, monthlyPct: 0 };

    const records = attendances
      .map(att => {
        const me = att.asistencias?.find(a => a.jugador_id === playerId);
        return me ? { estado: me.estado, fecha: att.fecha } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const presente = records.filter(r => r.estado === "presente" || r.estado === "tardanza").length;

    let streakCount = 0;
    for (const r of records) {
      if (r.estado === "presente" || r.estado === "tardanza") streakCount++;
      else break;
    }

    // Monthly: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthRecords = records.filter(r => new Date(r.fecha) >= thirtyDaysAgo);
    const monthPresente = monthRecords.filter(r => r.estado === "presente" || r.estado === "tardanza").length;
    const monthlyPct = monthRecords.length > 0 ? Math.round((monthPresente / monthRecords.length) * 100) : 0;

    return { totalPresente: presente, streak: streakCount, monthlyPct };
  }, [attendances, playerId]);

  const challengeData = CHALLENGES.map(ch => {
    let current = 0;
    if (ch.type === "total") current = totalPresente;
    else if (ch.type === "streak") current = streak;
    else if (ch.type === "monthly_pct") current = monthlyPct;

    const completed = current >= ch.target;
    const progress = Math.min(100, Math.round((current / ch.target) * 100));
    return { ...ch, current, completed, progress };
  });

  const active = challengeData.filter(c => !c.completed);
  const completed = challengeData.filter(c => c.completed);

  if (active.length === 0 && completed.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-base">🎯</span>
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Mis Retos</h2>
        {completed.length > 0 && (
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            {completed.length}/{CHALLENGES.length} ✓
          </span>
        )}
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-3 space-y-2.5">
          {/* Active challenges (show up to 3) */}
          {active.slice(0, 3).map((ch, i) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-lg flex-shrink-0">
                {ch.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-slate-700 truncate">{ch.title}</p>
                  <span className="text-[10px] font-bold text-slate-400 ml-2 flex-shrink-0">
                    {ch.type === "monthly_pct" ? `${ch.current}%` : `${ch.current}/${ch.target}`}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${ch.progress}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}

          {/* Completed challenges (compact row) */}
          {completed.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
              {completed.map((ch) => (
                <motion.div
                  key={ch.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1"
                >
                  <span className="text-sm">{ch.emoji}</span>
                  <span className="text-[10px] font-bold text-green-700">{ch.title}</span>
                  <span className="text-green-500 text-xs">✓</span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}