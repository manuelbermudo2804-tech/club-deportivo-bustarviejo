import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DECISION_OPCIONES, mensajeAviso } from "./meteoDecisionOptions";

// Réplica exacta de las opciones que pulsa el entrenador, pero en modo prueba:
// no guarda nada ni avisa a nadie.
export default function MeteoSimuladorDecision({
  categoria, horaInicio, semicubierto,
  decision, onDecision, nuevaHora, onNuevaHora,
}) {
  const mensaje = mensajeAviso({ decision, categoria, horaInicio, semicubierto, nuevaHora });

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">Opciones del entrenador al pulsar DECIDIR</p>
      {DECISION_OPCIONES.map((o) => (
        <button
          key={o.key}
          onClick={() => onDecision(o.key)}
          className={`w-full text-left rounded-xl border p-3 transition ${
            decision === o.key ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:bg-slate-50"
          }`}
        >
          <p className="font-semibold text-slate-900">{o.label}</p>
          <p className="text-sm text-slate-500">{o.desc}</p>
        </button>
      ))}

      {decision === "aplazar" && (
        <div className="pt-1">
          <Label>Nueva hora</Label>
          <Input type="time" value={nuevaHora} onChange={(e) => onNuevaHora(e.target.value)} />
        </div>
      )}

      {mensaje && (
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-sm font-semibold text-slate-700 mb-1">Aviso que recibirían las familias</p>
          <p className="text-sm text-slate-600">{mensaje}</p>
        </div>
      )}

      {decision && (
        <Button variant="ghost" size="sm" onClick={() => onDecision(null)}>Quitar decisión de prueba</Button>
      )}
    </div>
  );
}