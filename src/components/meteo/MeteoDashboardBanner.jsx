import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CloudSun } from "lucide-react";
import useMeteoAlerta from "@/hooks/useMeteoAlerta";

// Acceso permanente a "Entrenamiento". Parpadea cuando hoy hay entrenos
// al aire libre con condiciones ámbar/rojas sin decidir.
export default function MeteoDashboardBanner({ categorias = [] }) {
  const { avisos, alerta, hayRojo } = useMeteoAlerta(categorias);
  const primero = avisos[0];

  const estilo = hayRojo
    ? "border-red-400 bg-red-50 animate-pulse-strong"
    : alerta
      ? "border-amber-400 bg-amber-50 animate-pulse-strong"
      : "border-slate-700/50 bg-slate-800/60";

  return (
    <div className={`rounded-xl border-2 p-3 flex items-center gap-3 ${estilo}`}>
      <CloudSun className={`w-6 h-6 flex-shrink-0 ${hayRojo ? "text-red-600" : alerta ? "text-amber-600" : "text-sky-400"}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${hayRojo ? "text-red-900" : alerta ? "text-amber-900" : "text-white"}`}>
          {hayRojo ? "🔴 Entrenamiento · condiciones malas hoy" : alerta ? "🟠 Entrenamiento · ojo al tiempo hoy" : "🏃 Entrenamiento"}
          {avisos.length > 1 && ` · ${avisos.length} entrenos`}
        </p>
        <p className={`text-xs truncate ${hayRojo ? "text-red-800" : alerta ? "text-amber-800" : "text-slate-400"}`}>
          {alerta
            ? `${primero.categoria} ${primero.hora_inicio} · ${primero.recomendacion}`
            : "Avisos, asistencia, ejercicios, pizarra y reportes"}
        </p>
      </div>
      <Link to={alerta ? "/MeteoClub" : "/EntrenamientoHub"} className="flex-shrink-0">
        <Button size="sm" className={hayRojo ? "bg-red-600 hover:bg-red-700" : alerta ? "bg-amber-600 hover:bg-amber-700" : "bg-sky-600 hover:bg-sky-700"}>
          {alerta ? "Decidir y avisar" : "Abrir"}
        </Button>
      </Link>
    </div>
  );
}