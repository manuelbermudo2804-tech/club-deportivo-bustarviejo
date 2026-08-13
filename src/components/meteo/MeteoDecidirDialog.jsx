import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { DECISION_OPCIONES as OPCIONES, mensajeAviso } from "./meteoDecisionOptions";

export default function MeteoDecidirDialog({ open, onOpenChange, item, semicubierto, onConfirm }) {
  const [decision, setDecision] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setDecision(null); setMotivo(""); setNuevaHora(""); };

  const mensajePropuesto = () => {
    if (!item) return "";
    return mensajeAviso({
      decision,
      categoria: item.categoria,
      horaInicio: item.hora_inicio,
      semicubierto,
      nuevaHora,
    });
  };

  const guardar = async (avisar) => {
    setSaving(true);
    try {
      await onConfirm({ decision, motivo, nuevaHora, avisar, mensaje: avisar ? mensajePropuesto() : "" });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.categoria} · {item.hora_inicio}</DialogTitle>
        </DialogHeader>

        {!decision ? (
          <div className="space-y-2">
            {OPCIONES.map((o) => (
              <button
                key={o.key}
                onClick={() => setDecision(o.key)}
                className="w-full text-left rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
              >
                <p className="font-semibold text-slate-900">{o.label}</p>
                <p className="text-sm text-slate-500">{o.desc}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-semibold text-slate-900">
              {OPCIONES.find((o) => o.key === decision)?.label}
            </p>

            {decision === "aplazar" && (
              <div>
                <Label>Nueva hora</Label>
                <Input type="time" value={nuevaHora} onChange={(e) => setNuevaHora(e.target.value)} />
              </div>
            )}

            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Ej: viento muy fuerte en el campo" />
            </div>

            {decision !== "mantener" && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm font-semibold text-slate-700 mb-1">Aviso a las familias</p>
                <p className="text-sm text-slate-600">{mensajePropuesto()}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setDecision(null)}>Atrás</Button>
              {decision !== "mantener" && (
                <Button disabled={saving} onClick={() => guardar(true)}>Guardar y avisar</Button>
              )}
              <Button variant="outline" disabled={saving} onClick={() => guardar(false)}>
                {decision === "mantener" ? "Guardar" : "Guardar sin avisar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}