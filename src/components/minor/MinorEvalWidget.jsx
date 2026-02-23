import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight } from "lucide-react";

const SKILLS = [
  { key: "tecnica", label: "TEC", color: "bg-blue-500" },
  { key: "tactica", label: "TÁC", color: "bg-violet-500" },
  { key: "fisica", label: "FÍS", color: "bg-emerald-500" },
  { key: "actitud", label: "ACT", color: "bg-orange-500" },
  { key: "trabajo_equipo", label: "EQP", color: "bg-rose-500" },
];

export default function MinorEvalWidget({ playerId }) {
  const { data: lastEval } = useQuery({
    queryKey: ["minorLastEval", playerId],
    queryFn: async () => {
      const evals = await base44.entities.PlayerEvaluation.filter(
        { jugador_id: playerId, visible_para_padres: true },
        "-fecha_evaluacion",
        1
      );
      return evals[0] || null;
    },
    enabled: !!playerId,
    staleTime: 300000,
  });

  if (!lastEval) return null;

  const avg = (
    (lastEval.tecnica + lastEval.tactica + lastEval.fisica +
      lastEval.actitud + lastEval.trabajo_equipo) / 5
  ).toFixed(1);

  const getLevel = (v) => {
    if (v >= 4.5) return { label: "Excelente", color: "text-emerald-600 bg-emerald-50" };
    if (v >= 3.5) return { label: "Muy bien", color: "text-blue-600 bg-blue-50" };
    if (v >= 2.5) return { label: "En progreso", color: "text-orange-600 bg-orange-50" };
    return { label: "A trabajar", color: "text-slate-600 bg-slate-50" };
  };
  const level = getLevel(parseFloat(avg));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Link to={createPageUrl("PlayerEvaluations")}>
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-rose-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <h3 className="font-bold text-slate-800 text-sm">Última valoración</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${level.color} border-none text-xs font-bold`}>
                  {avg}/5 · {level.label}
                </Badge>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div className="flex gap-2">
              {SKILLS.map((skill) => (
                <div key={skill.key} className="flex-1 text-center">
                  <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden mb-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(lastEval[skill.key] / 5) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className={`absolute bottom-0 left-0 right-0 ${skill.color} rounded-lg`}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                      {lastEval[skill.key]}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">{skill.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-right">
              {format(new Date(lastEval.fecha_evaluacion), "d MMM yyyy", { locale: es })}
            </p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}