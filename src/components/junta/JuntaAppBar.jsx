import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useJuntaActiva from "@/hooks/useJuntaActiva";
import { RESPUESTAS, faltaTexto } from "@/lib/juntaUtils";
import JuntaResponderDialog from "./JuntaResponderDialog";

// Sin respuesta: pantalla completa obligatoria. Con respuesta: mini cuenta atrás arriba.
export default function JuntaAppBar({ user, isAdmin }) {
  const { junta, miRespuesta, refetch } = useJuntaActiva(user);
  const qc = useQueryClient();
  const [editar, setEditar] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const prueba = (junta?.email_prueba || "").trim().toLowerCase();
  const loVe = prueba ? user.email?.toLowerCase() === prueba : !isAdmin;
  if (!junta || !loVe) return null;
  const r = miRespuesta && RESPUESTAS[miRespuesta.respuesta];
  const obligatorio = !miRespuesta;

  return (
    <>
      {r && (
        <button onClick={() => setEditar(true)} className="w-full bg-gradient-to-r from-orange-600 to-green-700 text-white text-xs font-semibold px-3 py-2 text-center">
          🗳️ Junta: {faltaTexto(junta.fecha)} · {r.emoji} {r.label}
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