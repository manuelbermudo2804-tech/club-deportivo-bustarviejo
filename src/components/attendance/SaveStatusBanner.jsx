import React from "react";
import { CheckCircle2, CloudOff, Loader2, Wifi, WifiOff } from "lucide-react";

export default function SaveStatusBanner({ status, online, savedInfo }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-xs font-medium ${online ? "text-green-700" : "text-orange-700"}`}>
        {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {online ? "Con conexión" : "Sin cobertura · lo guardado se enviará solo al volver la señal"}
      </div>
      {status === "saving" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border-2 border-blue-300 text-blue-900">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-semibold">Enviando asistencia… (ya está guardada en tu móvil)</span>
        </div>
      )}
      {status === "pending" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border-2 border-orange-400 text-orange-900">
          <CloudOff className="w-6 h-6" />
          <div>
            <p className="font-bold text-lg">✅ Asistencia guardada en tu móvil · NO hace falta repetirla</p>
            <p className="text-sm">Hay poca cobertura y se enviará sola en cuanto vuelva la señal. Puedes cerrar la app tranquilamente.</p>
          </div>
        </div>
      )}
      {status === "saved" && savedInfo && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border-2 border-green-500 text-green-900">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <div>
            <p className="font-bold text-lg">Asistencia guardada</p>
            <p className="text-sm">{savedInfo.count} jugadores · {savedInfo.time}</p>
          </div>
        </div>
      )}
    </div>
  );
}