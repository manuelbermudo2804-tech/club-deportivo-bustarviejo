import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
import { format } from "date-fns";

// La "pantalla soñada": Categoría / Campo / Hora / Local [x] Visitante [y] [Guardar]
export default function PartidoResultRow({ partido, equipos, onSave, isSaving }) {
  const eqLocal = equipos.find((e) => e.id === partido.equipo_local_id);
  const eqVisit = equipos.find((e) => e.id === partido.equipo_visitante_id);
  const nombreLocal = eqLocal?.nombre || partido.equipo_local_placeholder || "Por decidir";
  const nombreVisit = eqVisit?.nombre || partido.equipo_visitante_placeholder || "Por decidir";

  const [local, setLocal] = useState(partido.marcador_local ?? "");
  const [visit, setVisit] = useState(partido.marcador_visitante ?? "");

  useEffect(() => {
    setLocal(partido.marcador_local ?? "");
    setVisit(partido.marcador_visitante ?? "");
  }, [partido.marcador_local, partido.marcador_visitante]);

  const puedeGuardar = eqLocal && eqVisit && local !== "" && visit !== "";
  const cambiado = String(local) !== String(partido.marcador_local ?? "") || String(visit) !== String(partido.marcador_visitante ?? "");

  return (
    <div className={`bg-white rounded-lg border p-2.5 ${partido.finalizado ? "border-green-200" : ""}`}>
      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1.5">
        {partido.campo && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{partido.campo}</span>}
        {partido.fecha_hora && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(partido.fecha_hora), "dd/MM HH:mm")}
          </span>
        )}
        {partido.finalizado && <span className="text-green-600 ml-auto inline-flex items-center gap-0.5"><Check className="w-3 h-3" /> Final</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-right text-sm font-medium truncate">{nombreLocal}</span>
        <Input
          type="number"
          className="w-12 text-center px-1"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          disabled={!eqLocal || !eqVisit}
        />
        <span className="text-slate-300">-</span>
        <Input
          type="number"
          className="w-12 text-center px-1"
          value={visit}
          onChange={(e) => setVisit(e.target.value)}
          disabled={!eqLocal || !eqVisit}
        />
        <span className="flex-1 text-sm font-medium truncate">{nombreVisit}</span>
        <Button
          size="sm"
          className="h-8"
          disabled={!puedeGuardar || !cambiado || isSaving}
          onClick={() => onSave(partido, Number(local), Number(visit))}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}