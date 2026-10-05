import React from "react";
import { FileText, CalendarClock } from "lucide-react";
import { RM_DOCS } from "./rmDocs";
import RMSubirCita from "./RMSubirCita";
import RMDescargarCita from "./RMDescargarCita";
import RMQuitarCita from "./RMQuitarCita";

// Apartado independiente para cada PDF del reconocimiento (hoja / hora de la cita)
export default function RMDocBloque({ rm, tipo, canUpload }) {
  const d = RM_DOCS[tipo];
  const uri = rm[d.uri];
  const Icon = tipo === "hoja" ? FileText : CalendarClock;
  const estilo = tipo === "hoja" ? "border-blue-200 bg-white" : "border-emerald-200 bg-emerald-50/50";
  return (
    <div className={`flex-1 min-w-[220px] rounded-lg border p-2 space-y-2 ${estilo}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1">
          <Icon className="w-4 h-4" /> {d.corto}
        </span>
        <span className={`text-[11px] font-semibold ${uri ? "text-green-700" : "text-slate-400"}`}>{uri ? "✓ Subido" : "Sin PDF"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {uri && <RMDescargarCita uri={uri} label="Ver" />}
        {canUpload && <RMSubirCita rm={rm} tipo={tipo} />}
        {canUpload && uri && <RMQuitarCita rm={rm} tipo={tipo} />}
      </div>
    </div>
  );
}