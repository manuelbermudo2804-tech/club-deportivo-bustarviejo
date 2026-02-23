import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function MinorEvalEvolution({ playerId }) {
  const { data: evals = [] } = useQuery({
    queryKey: ["minorEvalEvolution", playerId],
    queryFn: async () => {
      const data = await base44.entities.PlayerEvaluation.filter(
        { jugador_id: playerId, visible_para_padres: true },
        "-fecha_evaluacion",
        10
      );
      return data;
    },
    enabled: !!playerId,
    staleTime: 300000,
  });

  if (evals.length < 2) return null;

  const latest = evals[0];
  const previous = evals[1];

  const avgOf = (e) =>
    ((e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5).toFixed(1);

  const latestAvg = parseFloat(avgOf(latest));
  const prevAvg = parseFloat(avgOf(previous));
  const diff = (latestAvg - prevAvg).toFixed(1);
  const diffNum = parseFloat(diff);

  const getTrend = () => {
    if (diffNum > 0) return { icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", label: `+${diff}`, msg: "¡Estás mejorando! 🚀" };
    if (diffNum < 0) return { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50", label: diff, msg: "¡Vamos a por la remontada! 💪" };
    return { icon: Minus, color: "text-slate-500", bg: "bg-slate-50", label: "=", msg: "Estable, ¡sigue trabajando!" };
  };

  const trend = getTrend();
  const TrendIcon = trend.icon;

  // Mini sparkline data
  const sparkData = evals.slice(0, 6).reverse().map((e) => parseFloat(avgOf(e)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-none shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 to-pink-500" />
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📈</span>
              <h3 className="font-bold text-slate-800 text-sm">Mi Evolución</h3>
            </div>
            <Badge className={`${trend.bg} ${trend.color} border-none text-xs font-bold flex items-center gap-1`}>
              <TrendIcon className="w-3 h-3" />
              {trend.label}
            </Badge>
          </div>

          {/* Mini chart */}
          <div className="flex items-end gap-1.5 h-16 mb-3">
            {sparkData.map((val, i) => {
              const height = Math.max(20, (val / 5) * 100);
              const isLatest = i === sparkData.length - 1;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`flex-1 rounded-t-lg ${
                    isLatest
                      ? "bg-gradient-to-t from-violet-600 to-pink-500"
                      : "bg-slate-200"
                  }`}
                  title={`${val}/5`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {evals.length} evaluaciones
            </p>
            <p className="text-xs font-medium text-slate-600">{trend.msg}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}