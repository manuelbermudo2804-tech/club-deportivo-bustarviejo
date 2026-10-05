import React from "react";
import { Stethoscope } from "lucide-react";
import useReconocimientos from "@/hooks/useReconocimientos";
import { estadoRM } from "@/lib/reconocimiento";
import RMSubirCita from "./RMSubirCita";
import RMDescargarCita from "./RMDescargarCita";
import RMQuitarCita from "./RMQuitarCita";

// Reconocimiento médico dentro de la ficha de firmas de cada jugador (solo fútbol)
export default function RMJugadorRow({ player, canUpload }) {
  const { byJugador } = useReconocimientos();
  const rm = byJugador[player.id];
  const cat = `${player.categoria_principal || ""} ${player.deporte || ""}`.toLowerCase();
  if (!rm || cat.includes("baloncesto")) return null;
  const e = estadoRM(rm.fecha_vencimiento);
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Stethoscope className="w-4 h-4 text-blue-600" /> Reconocimiento médico</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${e.cls}`}>{e.label}</span>
      {rm.cita_pdf_uri && <RMDescargarCita uri={rm.cita_pdf_uri} label="Ver hoja" />}
      {canUpload && <RMSubirCita rm={rm} tipo="hoja" />}
      {canUpload && rm.cita_pdf_uri && <RMQuitarCita rm={rm} tipo="hoja" />}
      {rm.hora_cita_pdf_uri && <RMDescargarCita uri={rm.hora_cita_pdf_uri} label="Ver cita" />}
      {canUpload && <RMSubirCita rm={rm} tipo="cita" />}
      {canUpload && rm.hora_cita_pdf_uri && <RMQuitarCita rm={rm} tipo="cita" />}
    </div>
  );
}