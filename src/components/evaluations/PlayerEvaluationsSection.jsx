import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";

const SKILL_LABELS = {
  tecnica: { label: "Técnica", emoji: "⚽" },
  tactica: { label: "Táctica", emoji: "🧠" },
  fisica: { label: "Física", emoji: "💪" },
  actitud: { label: "Actitud", emoji: "🔥" },
  trabajo_equipo: { label: "Equipo", emoji: "🤝" },
};

function StarRating({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`}
        />
      ))}
    </div>
  );
}

export default function PlayerEvaluationsSection({ evaluations }) {
  if (!evaluations || evaluations.length === 0) return null;

  const visibleEvals = evaluations
    .filter((e) => e.visible_para_padres)
    .sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion));

  if (visibleEvals.length === 0) return null;

  return (
    <div className="bg-indigo-50 rounded-lg p-4 space-y-3 border border-indigo-200">
      <h3 className="font-bold text-indigo-900 flex items-center gap-2">
        📊 Evaluaciones del Entrenador
      </h3>
      <p className="text-xs text-indigo-600">
        Valoraciones realizadas por el entrenador sobre el rendimiento del jugador
      </p>

      <div className="space-y-3">
        {visibleEvals.slice(0, 3).map((ev, idx) => {
          const avg = ((ev.tecnica + ev.tactica + ev.fisica + ev.actitud + ev.trabajo_equipo) / 5).toFixed(1);
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-xl p-3 border border-indigo-100 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-indigo-600">
                  {format(new Date(ev.fecha_evaluacion), "d MMM yyyy", { locale: es })}
                </span>
                <Badge className={`border-none text-xs ${
                  avg >= 4 ? "bg-green-100 text-green-700" :
                  avg >= 3 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  Media: {avg}/5
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SKILL_LABELS).map(([key, { label, emoji }]) => (
                  <div key={key} className="flex items-center justify-between gap-1">
                    <span className="text-xs text-slate-600">{emoji} {label}</span>
                    <StarRating value={ev[key]} />
                  </div>
                ))}
              </div>

              {ev.fortalezas && (
                <div className="mt-2 pt-2 border-t border-indigo-50">
                  <p className="text-xs text-green-700"><strong>💪 Fortalezas:</strong> {ev.fortalezas}</p>
                </div>
              )}
              {ev.aspectos_mejorar && (
                <div className="mt-1">
                  <p className="text-xs text-orange-700"><strong>🎯 A mejorar:</strong> {ev.aspectos_mejorar}</p>
                </div>
              )}
              {ev.observaciones && (
                <div className="mt-1">
                  <p className="text-xs text-slate-600"><strong>📝 Notas:</strong> {ev.observaciones}</p>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-2">
                Evaluado por {ev.entrenador_nombre}
              </p>
            </motion.div>
          );
        })}
      </div>

      {visibleEvals.length > 3 && (
        <p className="text-xs text-indigo-500 text-center pt-1">
          Y {visibleEvals.length - 3} evaluación(es) más...
        </p>
      )}
    </div>
  );
}