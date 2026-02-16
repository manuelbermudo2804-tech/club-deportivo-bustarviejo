import React from "react";
import { Clock } from "lucide-react";

export default function PlayerCardSchedule({ playerSchedules }) {
  if (!playerSchedules || playerSchedules.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-green-700" />
        <p className="text-xs font-bold text-green-900">Horarios de Entrenamiento:</p>
      </div>
      <div className="space-y-1">
        {playerSchedules.map((schedule, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-green-200">
            <span className="font-semibold text-green-800">{schedule.dia_semana}</span>
            <span className="text-slate-700">{schedule.hora_inicio} - {schedule.hora_fin}</span>
          </div>
        ))}
      </div>
    </div>
  );
}