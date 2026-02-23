import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function MinorTeamRanking({ attendances, playerId }) {
  const ranking = useMemo(() => {
    if (!attendances?.length) return [];

    // Aggregate all players' attendance
    const playerMap = {};
    attendances.forEach((att) => {
      (att.asistencias || []).forEach((a) => {
        if (!playerMap[a.jugador_id]) {
          playerMap[a.jugador_id] = { id: a.jugador_id, nombre: a.jugador_nombre, presente: 0, total: 0 };
        }
        playerMap[a.jugador_id].total++;
        if (a.estado === "presente" || a.estado === "tardanza") {
          playerMap[a.jugador_id].presente++;
        }
      });
    });

    return Object.values(playerMap)
      .filter((p) => p.total >= 3) // Min 3 sessions
      .map((p) => ({ ...p, pct: Math.round((p.presente / p.total) * 100) }))
      .sort((a, b) => b.pct - a.pct || b.presente - a.presente)
      .slice(0, 5);
  }, [attendances]);

  if (ranking.length < 3) return null;

  const myPosition = ranking.findIndex((r) => r.id === playerId) + 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-base">🏅</span>
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Ranking Asistencia</h2>
        {myPosition > 0 && (
          <Badge className="bg-orange-100 text-orange-700 border-none text-xs">
            Tú: #{myPosition}
          </Badge>
        )}
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-3 space-y-1.5">
          {ranking.map((player, i) => {
            const isMe = player.id === playerId;
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isMe
                    ? "bg-gradient-to-r from-orange-50 to-amber-50 ring-2 ring-orange-300"
                    : "bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg w-7 text-center">
                  {i < 3 ? MEDALS[i] : <span className="text-xs font-bold text-slate-400">#{i + 1}</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? "text-orange-800" : "text-slate-700"}`}>
                    {player.nombre?.split(" ")[0]}
                    {isMe && " (tú)"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${player.pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06 }}
                      className={`h-full rounded-full ${
                        player.pct >= 90 ? "bg-green-500" : player.pct >= 70 ? "bg-blue-500" : "bg-orange-500"
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-bold w-10 text-right ${isMe ? "text-orange-700" : "text-slate-500"}`}>
                    {player.pct}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}