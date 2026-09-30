import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import useJuntaActiva from "@/hooks/useJuntaActiva";
import { RESPUESTAS, faltaTexto, fechaLarga } from "@/lib/juntaUtils";
import JuntaResponderDialog from "./JuntaResponderDialog";

// Aviso fijo en toda la app con cuenta atrás hasta la junta
export default function JuntaAppBar({ user, isAdmin }) {
  const { junta, miRespuesta, refetch } = useJuntaActiva(user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const [cerrada, setCerrada] = useState(false);
  const prueba = (junta?.email_prueba || "").trim().toLowerCase();
  const loVe = prueba ? user.email?.toLowerCase() === prueba : !isAdmin;
  if (!junta || !loVe || cerrada || localStorage.getItem("junta_cerrada") === junta.id) return null;
  const cerrar = () => { localStorage.setItem("junta_cerrada", junta.id); setCerrada(true); };
  const r = miRespuesta && RESPUESTAS[miRespuesta.respuesta];

  return (
    <div className="fixed z-[60] right-3 left-3 bottom-[140px] sm:left-auto sm:w-[420px] lg:bottom-24 lg:right-6">
      <div className={`${open ? "hidden" : ""} relative rounded-2xl p-3 pr-8 flex flex-wrap items-center gap-3 text-white shadow-lg ${r ? "bg-gradient-to-r from-slate-700 to-slate-800" : "bg-gradient-to-r from-orange-600 to-green-700"}`}>
        <button onClick={cerrar} aria-label="Cerrar aviso" className="absolute top-2 right-3 text-white/80 hover:text-white text-lg leading-none">×</button>
        <span className="text-2xl">🗳️</span>
        <div className="flex-1 min-w-[180px]">
          <p className="font-bold leading-tight">{junta.titulo || "Junta General de Socios"}</p>
          <p className="text-xs opacity-90 capitalize">{fechaLarga(junta.fecha)}{junta.lugar ? ` · ${junta.lugar}` : ""}</p>
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">⏳ {faltaTexto(junta.fecha)}</span>
        {r ? (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>{r.emoji} {r.label} · Cambiar</Button>
        ) : (
          <Button size="sm" className="bg-white text-orange-700 hover:bg-orange-50 font-bold" onClick={() => setOpen(true)}>¿Vienes? Responde</Button>
        )}
      </div>
      <JuntaResponderDialog open={open} onOpenChange={setOpen} junta={junta} user={user} miRespuesta={miRespuesta} onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["juntaRespuestas"] }); }} />
    </div>
  );
}