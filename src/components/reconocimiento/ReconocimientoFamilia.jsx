import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";
import useReconocimientos from "@/hooks/useReconocimientos";
import { estadoRM } from "@/lib/reconocimiento";
import RMDescargarCita from "./RMDescargarCita";

export default function ReconocimientoFamilia({ players }) {
  const { byJugador } = useReconocimientos();
  const filas = players.map((p) => byJugador[p.id]).filter(Boolean);
  if (!filas.length) return null;
  return (
    <Card className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <p className="font-bold text-slate-900 flex items-center gap-2 text-base sm:text-lg"><Stethoscope className="w-5 h-5 text-blue-600" /> Reconocimiento médico</p>
        {filas.map((rm) => {
          const e = estadoRM(rm.fecha_vencimiento);
          return (
            <div key={rm.id} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="font-semibold text-sm flex-1 min-w-0 break-words">{rm.jugador_nombre}</span>
              <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full border ${e.cls}`}>{e.label}</span>
              {rm.cita_pdf_uri && <RMDescargarCita uri={rm.cita_pdf_uri} label="Hoja de reconocimiento" />}
              {rm.hora_cita_pdf_uri && <RMDescargarCita uri={rm.hora_cita_pdf_uri} label="Cita (día y hora)" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}