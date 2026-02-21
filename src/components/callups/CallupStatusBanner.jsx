import React from "react";
import { Badge } from "@/components/ui/badge";
import { Ban, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CallupStatusBanner({ callup }) {
  const estado = callup.estado_convocatoria;
  if (!estado || estado === "activa") return null;

  const isCancelled = estado === "cancelada";

  return (
    <div className={`rounded-xl p-3.5 border-2 ${
      isCancelled 
        ? "bg-red-50 border-red-300" 
        : "bg-amber-50 border-amber-300"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {isCancelled ? (
          <Ban className="w-5 h-5 text-red-600" />
        ) : (
          <RefreshCw className="w-5 h-5 text-amber-600" />
        )}
        <Badge className={`text-xs font-bold ${
          isCancelled 
            ? "bg-red-600 text-white" 
            : "bg-amber-600 text-white"
        }`}>
          {isCancelled ? "CANCELADA" : "REPROGRAMADA"}
        </Badge>
      </div>

      {callup.motivo_cambio && (
        <p className={`text-sm mt-1 ${isCancelled ? "text-red-800" : "text-amber-800"}`}>
          <strong>Motivo:</strong> {callup.motivo_cambio}
        </p>
      )}

      {!isCancelled && callup.fecha_partido_original && (
        <p className="text-xs text-amber-700 mt-1">
          Fecha anterior: {format(new Date(callup.fecha_partido_original), "EEEE d 'de' MMMM", { locale: es })}
          {callup.hora_partido_original ? ` a las ${callup.hora_partido_original}` : ""}
          {" → "}Nueva: {format(new Date(callup.fecha_partido), "EEEE d 'de' MMMM", { locale: es })} a las {callup.hora_partido}
        </p>
      )}
    </div>
  );
}