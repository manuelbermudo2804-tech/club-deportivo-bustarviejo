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
    <Card className="border-2 border-blue-200">
      <CardContent className="p-4 space-y-3">
        <p className="font-bold text-slate-900 flex items-center gap-2"><Stethoscope className="w-5 h-5 text-blue-600" /> Reconocimiento médico</p>
        {filas.map((rm) => {
          const e = estadoRM(rm.fecha_vencimiento);
          return (
            <div key={rm.id} className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm flex-1 min-w-[150px]">{rm.jugador_nombre}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${e.cls}`}>{e.label}</span>
              {rm.cita_pdf_uri && <RMDescargarCita uri={rm.cita_pdf_uri} label="Hoja de reconocimiento" />}
              {rm.hora_cita_pdf_uri && <RMDescargarCita uri={rm.hora_cita_pdf_uri} label="Cita (día y hora)" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}