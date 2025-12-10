import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Clock } from "lucide-react";

export default function CoachChatBanner({ isOutsideHours, horario }) {
  return (
    <div className="space-y-2">
      {/* Banner informativo permanente */}
      <Alert className="bg-blue-50 border-blue-300">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-xs ml-2">
          <strong>ℹ️ Este chat es solo para avisos rápidos</strong> (asistencia, dudas cortas).
          <br />
          Para quejas o problemas, usa <strong>💬 Chat Coordinador</strong>.
          <br />
          🚫 Prohibido: fotos, videos, audios, archivos, debates.
        </AlertDescription>
      </Alert>

      {/* Banner de horario (si aplica) */}
      {isOutsideHours && horario && (
        <Alert className="bg-orange-50 border-orange-300">
          <Clock className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-800 text-xs ml-2">
            <strong>⏰ Chat disponible:</strong> {horario.dias} {horario.inicio}-{horario.fin}
            <br />
            Puedes enviar mensajes y el entrenador los verá en horario laboral.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}