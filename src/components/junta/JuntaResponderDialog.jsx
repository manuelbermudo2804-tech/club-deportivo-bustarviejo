import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, MapPin, ExternalLink, Loader2, Send } from "lucide-react";
import { RESPUESTAS, fechaLarga, faltaTexto } from "@/lib/juntaUtils";

const ESCUDO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function JuntaResponderDialog({ open, onOpenChange, forzado, junta, user, miRespuesta, onSaved }) {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => forzado && e.preventDefault()}
        onEscapeKeyDown={(e) => forzado && e.preventDefault()}
        className={`p-0 gap-0 max-w-md w-full h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[92vh] sm:rounded-2xl overflow-hidden flex flex-col z-[70] border-0 ${forzado ? "[&>button]:hidden" : "[&>button]:text-white"}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="relative bg-gradient-to-br from-orange-600 via-orange-500 to-green-700 text-white px-5 pt-8 pb-10 text-center">
            <img src={ESCUDO} alt="CD Bustarviejo" className="w-20 h-20 rounded-full mx-auto ring-4 ring-white/80 shadow-xl object-cover" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] font-bold text-white/85">CD Bustarviejo te convoca</p>
            <DialogTitle className="text-2xl font-black mt-1 leading-tight">{junta.titulo || "Junta General de Socios"}</DialogTitle>
            <p className="mt-2 text-sm text-white/90">El club lo hacemos entre todos. <b>Tu voz cuenta y tu presencia es necesaria.</b></p>
            <div className="mt-4 inline-block rounded-full bg-white text-orange-700 font-black px-4 py-1.5 shadow">⏳ {faltaTexto(junta.fecha)}</div>
          </div>

          <div className="px-5 -mt-5 space-y-4 pb-4">
            <div className="rounded-2xl bg-white shadow-lg border border-orange-100 p-4 space-y-2 text-sm">
              <p className="flex items-center gap-2 font-semibold capitalize"><CalendarDays className="w-4 h-4 text-orange-600" />{fechaLarga(junta.fecha)}</p>
              {junta.lugar && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-green-700" />{junta.lugar}</p>}
            </div>

            {junta.orden_dia?.length > 0 && (
              <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-sm">
                <p className="font-bold text-green-800 mb-2">📋 Lo que decidiremos juntos</p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700">{junta.orden_dia.map((p, i) => <li key={i}>{p}</li>)}</ol>
              </div>
            )}
            {junta.landing_slug && (
              <a href={`/l/${junta.landing_slug}`} target="_blank" rel="noreferrer" className="text-sm text-orange-700 font-semibold underline flex items-center gap-1">
                Ver documentación completa <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <div>
              <p className="font-bold text-slate-800 mb-2">1. ¿Contamos contigo?</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(RESPUESTAS).map(([k, r]) => (
                  <button key={k} onClick={() => setRespuesta(k)} className={`rounded-2xl border-2 p-3 text-sm font-bold transition ${respuesta === k ? "border-orange-500 bg-orange-500 text-white shadow-lg scale-105" : "border-slate-200 bg-white"}`}>
                    <div className="text-2xl">{r.emoji}</div>{r.label}
                  </button>
                ))}
              </div>
            </div>
            {respuesta === "voy" && (
              <label className="text-sm block font-semibold">¿Cuántas personas venís (contándote)?
                <Input type="number" min={1} value={personas} onChange={(e) => setPersonas(e.target.value)} className="mt-1" />
              </label>
            )}
            <label className="text-sm block font-semibold">2. ¿Alguna pregunta o tema para la junta? <span className="font-normal text-slate-500">(opcional)</span>
              <Textarea value={pregunta} onChange={(e) => setPregunta(e.target.value)} className="mt-1" rows={3} placeholder="Escribe aquí lo que quieras que se trate…" />
            </label>
          </div>
        </div>

        <div className="border-t bg-white p-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          <button disabled={!respuesta || saving} onClick={guardar}
            className="w-full rounded-2xl py-4 font-black text-white text-base bg-gradient-to-r from-orange-600 to-green-700 shadow-lg disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Enviar mi respuesta al club</>}
          </button>
          {!respuesta && <p className="text-center text-xs text-slate-500 mt-2">Elige una opción para poder enviar</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}