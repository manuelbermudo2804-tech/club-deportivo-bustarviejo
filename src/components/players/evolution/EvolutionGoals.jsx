import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const icon = (goal) => {
  if (goal.completada || goal.estado === "Completado") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (goal.estado === "En progreso") return <Clock className="w-4 h-4 text-blue-600" />;
  if (goal.estado === "Cancelado") return <AlertCircle className="w-4 h-4 text-red-500" />;
  return <Target className="w-4 h-4 text-slate-400" />;
};

export default function EvolutionGoals({ goals }) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Todavía no hay objetivos definidos</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <Card key={goal.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-2">
              {icon(goal)}
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 text-sm">{goal.titulo}</h4>
                {goal.descripcion && <p className="text-sm text-slate-600 mt-0.5">{goal.descripcion}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-xs">{goal.categoria}</Badge>
              <Badge variant="outline" className="text-xs">
                {goal.completada && goal.estado !== "Completado" ? "Completado" : goal.estado || "Pendiente"}
              </Badge>
            </div>
            <Progress value={goal.progreso || 0} className="h-2" />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progreso: {goal.progreso || 0}%</span>
              {goal.fecha_limite && <span>Hasta {goal.fecha_limite.split("-").reverse().join("/")}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}