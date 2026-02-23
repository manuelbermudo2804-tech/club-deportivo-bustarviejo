import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const BADGE_DEFS = [
  { id: "first_training", emoji: "🏃", label: "Primer entreno", desc: "Asististe a tu primer entrenamiento", check: (s) => s.totalPresente >= 1 },
  { id: "streak_5", emoji: "🔥", label: "Racha x5", desc: "5 entrenamientos seguidos", check: (s) => s.streak >= 5 },
  { id: "streak_10", emoji: "🔥🔥", label: "Racha x10", desc: "10 entrenamientos seguidos", check: (s) => s.streak >= 10 },
  { id: "streak_20", emoji: "🏆", label: "Leyenda", desc: "20 entrenamientos seguidos", check: (s) => s.streak >= 20 },
  { id: "attendance_90", emoji: "⭐", label: "Asistencia 90%", desc: "Más del 90% de asistencia", check: (s) => s.pctAsistencia >= 90 },
  { id: "first_goal", emoji: "⚽", label: "Primer gol", desc: "Marcaste tu primer gol", check: (s) => s.goles >= 1 },
  { id: "goals_5", emoji: "🎯", label: "Goleador", desc: "5 goles en la temporada", check: (s) => s.goles >= 5 },
  { id: "goals_10", emoji: "👑", label: "Pichichi", desc: "10 goles en la temporada", check: (s) => s.goles >= 10 },
  { id: "callup_5", emoji: "📋", label: "Convocado x5", desc: "5 convocatorias", check: (s) => s.convocatorias >= 5 },
  { id: "callup_10", emoji: "🌟", label: "Titular", desc: "10 convocatorias", check: (s) => s.convocatorias >= 10 },
  { id: "goal_set", emoji: "🎯", label: "Con objetivos", desc: "Te pusiste tu primera meta", check: (s) => s.metas >= 1 },
  { id: "goal_done", emoji: "✅", label: "Meta cumplida", desc: "Completaste una meta", check: (s) => s.metasCompletadas >= 1 },
];

export default function MinorBadgesWidget({ attendances, playerId, goles, convocatorias, metas, metasCompletadas }) {
  const stats = useMemo(() => {
    if (!attendances || !playerId) return { totalPresente: 0, streak: 0, pctAsistencia: 0 };
    
    const sorted = attendances
      .map(att => {
        const me = att.asistencias?.find(a => a.jugador_id === playerId);
        return me ? { estado: me.estado, fecha: att.fecha } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const total = sorted.length;
    const presente = sorted.filter(r => r.estado === "presente" || r.estado === "tardanza").length;

    let streak = 0;
    for (const r of sorted) {
      if (r.estado === "presente" || r.estado === "tardanza") streak++;
      else break;
    }

    return {
      totalPresente: presente,
      streak,
      pctAsistencia: total > 0 ? Math.round((presente / total) * 100) : 0,
      goles: goles || 0,
      convocatorias: convocatorias || 0,
      metas: metas || 0,
      metasCompletadas: metasCompletadas || 0,
    };
  }, [attendances, playerId, goles, convocatorias, metas, metasCompletadas]);

  const earned = BADGE_DEFS.filter(b => b.check(stats));
  const locked = BADGE_DEFS.filter(b => !b.check(stats));

  if (earned.length === 0 && locked.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-base">🏅</span>
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Mis Logros</h2>
        {earned.length > 0 && (
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            {earned.length}/{BADGE_DEFS.length}
          </span>
        )}
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-4">
          {/* Earned badges */}
          {earned.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {earned.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", delay: i * 0.06 }}
                  className="text-center"
                  title={badge.desc}
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 flex items-center justify-center text-2xl shadow-md">
                    {badge.emoji}
                  </div>
                  <p className="text-[10px] font-bold text-slate-700 mt-1.5 leading-tight">{badge.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Locked badges (show next 4) */}
          {locked.length > 0 && (
            <>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                Próximos logros
              </p>
              <div className="grid grid-cols-4 gap-3">
                {locked.slice(0, 4).map((badge) => (
                  <div key={badge.id} className="text-center opacity-40" title={badge.desc}>
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center text-2xl grayscale">
                      {badge.emoji}
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 mt-1.5 leading-tight">{badge.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}