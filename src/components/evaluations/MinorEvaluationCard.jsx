import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SKILL_CONFIG = [
  { key: "tecnica", label: "Técnica", color: "bg-blue-500" },
  { key: "tactica", label: "Táctica", color: "bg-violet-500" },
  { key: "fisica", label: "Física", color: "bg-emerald-500" },
  { key: "actitud", label: "Actitud", color: "bg-orange-500" },
  { key: "trabajo_equipo", label: "Trabajo en equipo", color: "bg-rose-500" },
];

function SkillBar({ skill, value, delay }) {
  const pct = (value / 5) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3"
    >
      <span className="text-sm font-medium text-slate-600 w-32 shrink-0">{skill.label}</span>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.15, duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${skill.color}`}
        />
      </div>
      <span className="text-sm font-bold text-slate-700 w-8 text-right">{value}/5</span>
    </motion.div>
  );
}

export default function MinorEvaluationCard({ evaluation, index = 0 }) {
  const avgScore = (
    (evaluation.tecnica + evaluation.tactica + evaluation.fisica +
      evaluation.actitud + evaluation.trabajo_equipo) / 5
  ).toFixed(1);

  const getLevel = (avg) => {
    if (avg >= 4.5) return { label: "Excelente", bg: "bg-emerald-600" };
    if (avg >= 3.5) return { label: "Muy bien", bg: "bg-blue-600" };
    if (avg >= 2.5) return { label: "En progreso", bg: "bg-orange-500" };
    return { label: "A trabajar", bg: "bg-slate-500" };
  };

  const level = getLevel(parseFloat(avgScore));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="border border-slate-200 shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs">
              {format(new Date(evaluation.fecha_evaluacion), "d MMM yyyy", { locale: es })}
            </p>
            <p className="text-white font-semibold text-base mt-0.5">Valoración del entrenador</p>
          </div>
          <div className="text-center">
            <div className={`${level.bg} text-white text-xs font-bold px-3 py-1 rounded-full`}>
              {level.label}
            </div>
            <p className="text-white text-xl font-black mt-1">{avgScore}<span className="text-slate-400 text-sm font-normal">/5</span></p>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Skill bars */}
          <div className="space-y-3">
            {SKILL_CONFIG.map((skill, i) => (
              <SkillBar
                key={skill.key}
                skill={skill}
                value={evaluation[skill.key]}
                delay={index * 0.08 + i * 0.04}
              />
            ))}
          </div>

          {/* Comments section */}
          {(evaluation.fortalezas || evaluation.aspectos_mejorar || evaluation.observaciones) && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              {evaluation.fortalezas && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Puntos fuertes</p>
                  <p className="text-sm text-emerald-800 leading-relaxed">{evaluation.fortalezas}</p>
                </div>
              )}

              {evaluation.aspectos_mejorar && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Aspectos a mejorar</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{evaluation.aspectos_mejorar}</p>
                </div>
              )}

              {evaluation.observaciones && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{evaluation.observaciones}</p>
                </div>
              )}
            </div>
          )}

          {/* Coach */}
          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Entrenador: <span className="text-slate-600 font-medium">{evaluation.entrenador_nombre}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}