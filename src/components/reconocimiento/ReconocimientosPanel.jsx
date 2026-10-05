import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, ChevronDown, ChevronUp } from "lucide-react";
import useReconocimientos from "@/hooks/useReconocimientos";
import { estadoRM } from "@/lib/reconocimiento";
import RMSubirCita from "./RMSubirCita";
import RMDescargarCita from "./RMDescargarCita";

// Listado "quién vence y cuándo" para el club y entrenadores de firmas
export default function ReconocimientosPanel({ players, canUpload }) {
  const { byJugador, isLoading } = useReconocimientos();
  const [abierto, setAbierto] = useState(true);
  const filas = players.map((p) => byJugador[p.id]).filter(Boolean)
    .map((rm) => ({ rm, e: estadoRM(rm.fecha_vencimiento) }))
    .sort((a, b) => a.e.orden - b.e.orden || (a.rm.fecha_vencimiento || "").localeCompare(b.rm.fecha_vencimiento || ""));
  const alerta = filas.filter((f) => f.e.orden < 3).length;

  return (
    <Card className="border-2 border-blue-200 shadow-lg">
      <button onClick={() => setAbierto(!abierto)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="font-bold text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-blue-600" /> Reconocimientos médicos
          {alerta > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{alerta} por revisar</span>}
        </span>
        {abierto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {abierto && (
        <CardContent className="pt-0 space-y-2">
          <p className="text-xs text-slate-500">Fechas sincronizadas cada mañana con la Federación.</p>
          {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
          {!isLoading && filas.length === 0 && <p className="text-sm text-slate-500">Aún no hay datos sincronizados.</p>}
          <div className="max-h-[480px] overflow-y-auto divide-y">
            {filas.map(({ rm, e }) => (
              <div key={rm.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-sm text-slate-900">{rm.jugador_nombre}</p>
                  <p className="text-xs text-slate-500">{rm.categoria}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${e.cls}`}>{e.label}</span>
                {rm.cita_pdf_uri && <RMDescargarCita uri={rm.cita_pdf_uri} label="Ver hoja" />}
                {canUpload && <RMSubirCita rm={rm} tipo="hoja" />}
                {rm.hora_cita_pdf_uri && <RMDescargarCita uri={rm.hora_cita_pdf_uri} label="Ver cita" />}
                {canUpload && <RMSubirCita rm={rm} tipo="cita" />}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}