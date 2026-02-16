import React from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PlayerCardNextMatch({ nextCallup }) {
  if (!nextCallup) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-purple-700" />
        <p className="text-xs font-bold text-purple-900">🏆 Próximo partido:</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-purple-800">{nextCallup.titulo || `vs ${nextCallup.rival}`}</p>
        <div className="flex items-center gap-3 text-xs text-purple-700">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(nextCallup.fecha_partido), "EEE d MMM", { locale: es })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {nextCallup.hora_partido}
          </span>
        </div>
        {nextCallup.ubicacion && (
          <p className="text-xs text-purple-600 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {nextCallup.ubicacion}
          </p>
        )}
      </div>
    </div>
  );
}