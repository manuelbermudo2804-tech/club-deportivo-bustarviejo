import React from "react";
import { Stethoscope } from "lucide-react";
import useReconocimientos from "@/hooks/useReconocimientos";
import { estadoRM } from "@/lib/reconocimiento";
import RMDocBloque from "./RMDocBloque";

// Reconocimiento médico dentro de la ficha de firmas de cada jugador (solo fútbol)
export default function RMJugadorRow({ player, canUpload }) {
  const { byJugador } = useReconocimientos();
  const rm = byJugador[player.id];
  const cat = `${player.categoria_principal || ""} ${player.deporte || ""}`.toLowerCase();
  if (!rm || cat.includes("baloncesto")) return null;
  const e = estadoRM(rm.fecha_vencimiento);
  return (
    <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Stethoscope className="w-4 h-4 text-blue-600" /> Reconocimiento médico</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${e.cls}`}>{e.label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <RMDocBloque rm={rm} tipo="hoja" canUpload={canUpload} />
        <RMDocBloque rm={rm} tipo="cita" canUpload={canUpload} />
      </div>
    </div>
  );
}