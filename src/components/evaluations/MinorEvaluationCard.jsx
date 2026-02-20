import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SKILL_CONFIG = [
  { key: "tecnica", label: "Técnica", emoji: "⚽", color: "from-blue-400 to-cyan-500" },
  { key: "tactica", label: "Táctica", emoji: "🧠", color: "from-purple-400 to-violet-500" },
  { key: "fisica", label: "Física", emoji: "💪", color: "from-green-400 to-emerald-500" },
  { key: "actitud", label: "Actitud", emoji: "🔥", color: "from-orange-400 to-red-500" },
  { key: "trabajo_equipo", label: "Equipo", emoji: "🤝", color: "from-pink-400 to-rose-500" },
];

function SkillBar({ skill, value, delay }) {
  const pct = (value / 5) * 100;
  const getMessage = (v) => {
    if (v >= 5) return "¡CRACK! 🏆";
    if (v >= 4) return "¡Genial! 💫";
    if (v >= 3) return "Bien 👍";
    if (v >= 2) return "A mejorar 📈";
    return "Vamos a por ello 💪";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold flex items-center gap-1.5">
          <span className="text-lg">{skill.emoji}</span> {skill.label}
        </span>
        <span className="text-xs font-medium text-slate-500">{getMessage(value)}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
        />
      </div>
      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`text-xs ${i <= value ? "text-yellow-500" : "text-slate-300"}`}>★</span>
        ))}
      </div>
    </motion.div>
  );
}

export default function MinorEvaluationCard({ evaluation, index = 0 }) {
  const avgScore = (
    (evaluation.tecnica + evaluation.tactica + evaluation.fisica +
      evaluation.actitud + evaluation.trabajo_equipo) / 5
  ).toFixed(1);

  const overallEmoji = avgScore >= 4.5 ? "🏆" : avgScore >= 4 ? "⭐" : avgScore >= 3 ? "💪" : avgScore >= 2 ? "📈" : "🌱";
  const overallMessage = avgScore >= 4.5 ? "¡Rendimiento ÉLITE!" : avgScore >= 4 ? "¡Muy buen nivel!" : avgScore >= 3 ? "¡Buen trabajo, sigue así!" : avgScore >= 2 ? "¡A seguir mejorando!" : "¡Cada día un poco más!";
  const overallColor = avgScore >= 4 ? "from-yellow-400 to-orange-500" : avgScore >= 3 ? "from-green-400 to-emerald-500" : "from-blue-400 to-cyan-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-none shadow-xl overflow-hidden">
        {/* Header with overall score */}
        <div className={`bg-gradient-to-r ${overallColor} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs font-medium">
                {format(new Date(evaluation.fecha_evaluacion), "d 'de' MMMM yyyy", { locale: es })}
              </p>
              <p className="text-lg font-black mt-0.5">{overallMessage}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl">{overallEmoji}</div>
              <div className="text-2xl font-black">{avgScore}</div>
              <div className="text-[10px] text-white/70 font-medium">de 5.0</div>
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Skills */}
          <div className="space-y-3">
            {SKILL_CONFIG.map((skill, i) => (
              <SkillBar
                key={skill.key}
                skill={skill}
                value={evaluation[skill.key]}
                delay={index * 0.1 + i * 0.05}
              />
            ))}
          </div>

          {/* Fortalezas */}
          {evaluation.fortalezas && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-3 mt-3"
            >
              <p className="text-xs font-bold text-green-700 flex items-center gap-1 mb-1">
                💪 Tus superpoderes
              </p>
              <p className="text-sm text-green-800 leading-relaxed">{evaluation.fortalezas}</p>
            </motion.div>
          )}

          {/* Aspectos a mejorar */}
          {evaluation.aspectos_mejorar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-3"
            >
              <p className="text-xs font-bold text-blue-700 flex items-center gap-1 mb-1">
                🎯 Tu próximo reto
              </p>
              <p className="text-sm text-blue-800 leading-relaxed">{evaluation.aspectos_mejorar}</p>
            </motion.div>
          )}

          {/* Observaciones */}
          {evaluation.observaciones && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-3"
            >
              <p className="text-xs font-bold text-purple-700 flex items-center gap-1 mb-1">
                📝 Notas del entrenador
              </p>
              <p className="text-sm text-purple-800 leading-relaxed">{evaluation.observaciones}</p>
            </motion.div>
          )}

          {/* Coach */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Evaluado por <strong className="text-slate-600">{evaluation.entrenador_nombre}</strong>
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}