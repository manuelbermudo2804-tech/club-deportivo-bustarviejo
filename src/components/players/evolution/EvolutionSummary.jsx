import React from "react";
import { Card, CardContent } from "@/components/ui/card";

function Kpi({ value, label, hint, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-slate-600">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function EvolutionSummary({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi
        value={`${stats.attendanceRate}%`}
        label="Asistencia"
        hint={`${stats.attendedSessions}/${stats.totalSessions} sesiones`}
        color="text-orange-600"
      />
      <Kpi
        value={stats.avgScore ? `${stats.avgScore}/5` : "—"}
        label="Valoración media"
        hint={`${stats.totalEvaluations} evaluaciones`}
        color="text-blue-600"
      />
      <Kpi
        value={stats.completedGoals}
        label="Objetivos logrados"
        hint={`${stats.activeGoals} en marcha`}
        color="text-green-600"
      />
      <Kpi value={stats.totalNotes} label="Notas del entrenador" color="text-purple-600" />
    </div>
  );
}