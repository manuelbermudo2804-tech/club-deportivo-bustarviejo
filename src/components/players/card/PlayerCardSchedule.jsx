import React from "react";
import { Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PlayerCardSchedule({ playerSchedules }) {
  if (!playerSchedules || playerSchedules.length === 0) return null;

  const hoy = new Date().toISOString().split("T")[0];
  const inicioFuturo = playerSchedules
    .map(s => s.fecha_inicio)
    .filter(f => f && f > hoy)
    .sort()[0];

  const ubicacion = playerSchedules.find(s => s.ubicacion)?.ubicacion;

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3.5 h-3.5 text-green-700" />
        <p className="text-xs font-bold text-green-900">Horarios de entrenamiento</p>
      </div>
      <div className="space-y-1">
        {playerSchedules.map((s, idx) => (
          <div key={idx} className="flex items-center justify-between text-[11px] bg-white rounded-lg px-2.5 py-1.5 border border-green-100">
            <span className="font-semibold text-green-800">{s.dia_semana}</span>
            <span className="text-slate-700 font-medium">{s.hora_inicio} - {s.hora_fin}</span>
          </div>
        ))}
      </div>
      {ubicacion && (
        <p className="flex items-center gap-1 text-[10px] text-green-700 mt-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {ubicacion}
        </p>
      )}
      {inicioFuturo && (
        <p className="text-[10px] text-green-600 mt-1.5">
          Empiezan el {format(new Date(inicioFuturo), "d 'de' MMMM", { locale: es })}
        </p>
      )}
    </div>
  );
}