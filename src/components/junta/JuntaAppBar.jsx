import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useJuntaActiva from "@/hooks/useJuntaActiva";
import { RESPUESTAS, faltaTexto } from "@/lib/juntaUtils";
import JuntaResponderDialog from "./JuntaResponderDialog";

// Sin respuesta: pantalla completa obligatoria. Con respuesta: mini cuenta atrás arriba.
export default function JuntaAppBar({ user, isAdmin }) {
  const { junta, miRespuesta, refetch } = useJuntaActiva(user);
  const qc = useQueryClient();
  const [editar, setEditar] = useState(() => new URLSearchParams(window.location.search).get("junta") === "1");
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    const abrir = () => setEditar(true);
    window.addEventListener("abrir-junta", abrir);
    return () => { clearInterval(t); window.removeEventListener("abrir-junta", abrir); };
  }, []);

  const prueba = (junta?.email_prueba || "").trim().toLowerCase();
  const loVe = prueba ? user.email?.toLowerCase() === prueba : !isAdmin;
  if (!junta || !loVe) return null;
  const r = miRespuesta && RESPUESTAS[miRespuesta.respuesta];
  const solicitudActiva = junta.solicitar_confirmacion !== false;
  const obligatorio = solicitudActiva && !miRespuesta;

  return (
    <>
      {!solicitudActiva && !miRespuesta && !editar && (
        <button type="button" onClick={() => setEditar(true)} className="fixed bottom-4 left-3 right-3 z-[60] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-white p-4 text-left shadow-xl sm:bottom-5">
          <span className="min-w-0"><span className="block font-bold text-slate-900">🗳️ {junta.titulo || "Junta de Socios"}</span><span className="mt-1 block text-sm text-slate-600">⏳ {faltaTexto(junta.fecha)} · Pulsa para confirmar asistencia</span></span>
          <span className="shrink-0 rounded-xl bg-orange-600 px-3 py-2 text-sm font-bold text-white">Responder</span>
        </button>
      )}
      <JuntaResponderDialog
        open={obligatorio || editar}
        forzado={obligatorio}
        onOpenChange={(v) => { if (!obligatorio) setEditar(v); }}
        junta={junta} user={user} miRespuesta={miRespuesta}
        onSaved={() => { setEditar(false); refetch(); qc.invalidateQueries({ queryKey: ["juntaRespuestas"] }); }}
      />
    </>
  );
}