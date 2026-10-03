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
  const obligatorio = !miRespuesta;

  return (
    <>
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