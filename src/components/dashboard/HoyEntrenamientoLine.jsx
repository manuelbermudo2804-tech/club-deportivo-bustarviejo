import React from "react";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import NoVoyEntrenoButton from "./NoVoyEntrenoButton";

// Una sola línea con el/los entrenamientos de HOY de los hijos de la familia,
// con botón "No va" por jugador. Si hoy no hay entrenamiento, no renderiza nada.
export default function HoyEntrenamientoLine({ items = [] }) {
  const { data: user } = useQuery({ queryKey: ["meHoyEntreno"], queryFn: () => base44.auth.me(), staleTime: 600000 });
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const deHoy = (items || []).filter((it) => {
    if (it.tipo !== "entreno" || !it.fecha) return false;
    const d = new Date(it.fecha);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === hoy.getTime();
  });

  if (deHoy.length === 0) return null;

  return (
    <div className="mb-3 pb-3 border-b border-orange-200 space-y-1">
      {deHoy.map((it, i) => (
        <div key={i} className="text-sm space-y-1.5">
          <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-slate-900">Hoy: Entrenamiento {it.hora}</span>
            <span className="block text-xs text-slate-500 truncate">
              {it.subtitulo}
              {it.ubicacion ? ` · ${it.ubicacion}` : ""}
            </span>
          </div>
          </div>
          {user && (
            <div className="flex flex-col items-start gap-1 pl-6">
              {(it.jugadoresIds || []).map((j) => (
                <NoVoyEntrenoButton key={j.id} jugador={j} categoria={it.subtitulo} fechaISO={fechaISO} user={user} solo={it.jugadoresIds.length === 1} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}