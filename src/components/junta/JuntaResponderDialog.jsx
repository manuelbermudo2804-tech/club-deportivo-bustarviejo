import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { RESPUESTAS, fechaLarga, faltaTexto } from "@/lib/juntaUtils";

export default function JuntaResponderDialog({ open, onOpenChange, junta, user, miRespuesta, onSaved }) {
  const [respuesta, setRespuesta] = useState(null);
  const [personas, setPersonas] = useState(1);
  const [pregunta, setPregunta] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRespuesta(miRespuesta?.respuesta || null);
    setPersonas(miRespuesta?.personas || 1);
    setPregunta(miRespuesta?.pregunta || "");
  }, [open, miRespuesta]);

  const guardar = async () => {
    setSaving(true);
    const data = { junta_id: junta.id, email: user.email, nombre: user.full_name || user.email, respuesta, personas: respuesta === "voy" ? Number(personas) || 1 : 0, pregunta };
    if (miRespuesta) await base44.entities.JuntaAsistencia.update(miRespuesta.id, data);
    else await base44.entities.JuntaAsistencia.create(data);
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-lg overflow-y-auto z-[70]">
        <DialogHeader><DialogTitle>🗳️ {junta.titulo || "Junta General de Socios"}</DialogTitle></DialogHeader>
        <div className="rounded-xl bg-orange-50 p-3 space-y-1 text-sm">
          <p className="flex items-center gap-2 font-semibold capitalize"><CalendarDays className="w-4 h-4" />{fechaLarga(junta.fecha)}</p>
          {junta.lugar && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{junta.lugar}</p>}
          <p className="text-orange-700 font-bold">{faltaTexto(junta.fecha)}</p>
        </div>
        {junta.orden_dia?.length > 0 && (
          <div className="text-sm">
            <p className="font-semibold mb-1">Esto es lo que se decide:</p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-700">{junta.orden_dia.map((p, i) => <li key={i}>{p}</li>)}</ol>
          </div>
        )}
        {junta.landing_slug && (
          <a href={`/l/${junta.landing_slug}`} target="_blank" rel="noreferrer" className="text-sm text-orange-700 underline flex items-center gap-1">
            Ver documentación completa <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(RESPUESTAS).map(([k, r]) => (
            <button key={k} onClick={() => setRespuesta(k)} className={`rounded-xl border-2 p-2 text-sm font-semibold ${respuesta === k ? "border-orange-500 bg-orange-50" : "border-slate-200"}`}>
              <div className="text-xl">{r.emoji}</div>{r.label}
            </button>
          ))}
        </div>
        {respuesta === "voy" && (
          <label className="text-sm block">¿Cuántas personas venís (contándote)?
            <Input type="number" min={1} value={personas} onChange={(e) => setPersonas(e.target.value)} className="mt-1" />
          </label>
        )}
        <label className="text-sm block">¿Alguna pregunta o tema para la junta? (opcional)
          <Textarea value={pregunta} onChange={(e) => setPregunta(e.target.value)} className="mt-1" rows={3} />
        </label>
        <Button disabled={!respuesta || saving} onClick={guardar} className="w-full bg-orange-600 hover:bg-orange-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar respuesta"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}