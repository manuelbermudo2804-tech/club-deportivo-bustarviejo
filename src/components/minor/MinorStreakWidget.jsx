import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function MinorStreakWidget({ attendances, playerId, compact = false }) {
  const streak = useMemo(() => {
    if (!attendances?.length || !playerId) return 0;
    
    const sorted = attendances
      .map(att => {
        const me = att.asistencias?.find(a => a.jugador_id === playerId);
        return me ? { fecha: att.fecha, estado: me.estado } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    let count = 0;
    for (const record of sorted) {
      if (record.estado === "presente" || record.estado === "tardanza") {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [attendances, playerId]);

  if (streak < 2) return null;

  const getMessage = () => {
    if (streak >= 20) return "¡¡LEYENDA!! 🏆";
    if (streak >= 15) return "¡¡IMPARABLE!! 🔥🔥";
    if (streak >= 10) return "¡MÁQUINA! 💪";
    if (streak >= 5) return "¡Gran racha! 🔥";
    return "¡Sigue así! ⚡";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", delay: 0.15 }}
    >
      <Card className={`h-full border border-orange-200 shadow-md bg-gradient-to-r from-amber-500 to-orange-500 overflow-hidden ${compact ? "min-h-[122px]" : ""}`}>
        <CardContent className={`h-full p-4 relative flex items-center ${compact ? "min-h-[122px]" : ""}`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>
          <div className="relative flex items-center gap-3 w-full min-w-0">
            <motion.div
              className="text-4xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            >
              🔥
            </motion.div>
            <div className="flex-1">
              <h3 className="text-white font-black text-lg">
                {streak} entrenamientos seguidos
              </h3>
              <p className="text-white/80 text-sm">{getMessage()}</p>
            </div>
            <div className="text-white/30 text-4xl font-black">{streak}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}