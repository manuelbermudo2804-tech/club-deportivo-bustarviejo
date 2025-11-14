import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function EvaluationCard({ evaluation }) {
  const avgScore = (
    (evaluation.tecnica + evaluation.tactica + evaluation.fisica + 
     evaluation.actitud + evaluation.trabajo_equipo) / 5
  ).toFixed(1);

  const getScoreColor = (score) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-orange-600";
    return "text-red-600";
  };

  const StarRating = ({ value }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= value ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-lg">{evaluation.jugador_nombre}</CardTitle>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
                {avgScore}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                {format(new Date(evaluation.fecha_evaluacion), "dd MMM yyyy", { locale: es })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Técnica</p>
              <StarRating value={evaluation.tecnica} />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Táctica</p>
              <StarRating value={evaluation.tactica} />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Física</p>
              <StarRating value={evaluation.fisica} />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Actitud</p>
              <StarRating value={evaluation.actitud} />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-1">Trabajo en Equipo</p>
              <StarRating value={evaluation.trabajo_equipo} />
            </div>
          </div>

          {evaluation.fortalezas && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-green-700 mb-1">💪 Fortalezas</p>
              <p className="text-sm text-slate-600">{evaluation.fortalezas}</p>
            </div>
          )}

          {evaluation.aspectos_mejorar && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-orange-700 mb-1">📈 A Mejorar</p>
              <p className="text-sm text-slate-600">{evaluation.aspectos_mejorar}</p>
            </div>
          )}

          {evaluation.observaciones && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">📝 Observaciones</p>
              <p className="text-sm text-slate-600">{evaluation.observaciones}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 border-t pt-3">
            <span>Evaluado por: {evaluation.entrenador_nombre}</span>
            {evaluation.visible_para_padres && (
              <Badge className="bg-green-100 text-green-700">Visible para padres</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}