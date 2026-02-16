import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileSignature, CheckCircle2, AlertCircle } from "lucide-react";

export default function PlayerCardSignatures({
  firmasStatus, firmasPendientes, hasEnlaceFirmaJugador, hasEnlaceFirmaTutor,
  firmaJugadorOk, firmaTutorOk, esMayorDeEdad
}) {
  if (firmasStatus === "none") return null;

  return (
    <div className={`rounded-lg p-2 border ${
      firmasStatus === "complete" ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileSignature className={`w-3.5 h-3.5 ${
            firmasStatus === "complete" ? "text-green-600" : "text-yellow-600"
          }`} />
          <span className="text-xs font-medium text-slate-700">Firmas Federación:</span>
        </div>
        {firmasStatus === "complete" ? (
          <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completadas
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-700 text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Pendiente
          </Badge>
        )}
      </div>
      {firmasStatus === "pending" && firmasPendientes.length > 0 && (
        <div className="flex gap-2 mt-1.5">
          {hasEnlaceFirmaJugador && (
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              firmaJugadorOk ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              {firmaJugadorOk ? "✅" : "⏳"} Jugador
            </div>
          )}
          {hasEnlaceFirmaTutor && !esMayorDeEdad && (
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              firmaTutorOk ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              {firmaTutorOk ? "✅" : "⏳"} Tutor
            </div>
          )}
        </div>
      )}
    </div>
  );
}