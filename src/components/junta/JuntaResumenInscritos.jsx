import React, { useMemo } from "react";
import JuntaStats from "@/components/junta/JuntaStats";
import { unirRespuestas } from "@/lib/juntaUtils";

// Resumen de asistencia de la junta dentro de la lista de inscritos (app + web)
export default function JuntaResumenInscritos({ submissions, campos }) {
  const rows = useMemo(() => {
    const app = submissions.filter((s) => s.origen === "App");
    const web = submissions.filter((s) => s.origen !== "App");
    return unirRespuestas(app, web, [], campos || []);
  }, [submissions, campos]);
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-slate-900">Resumen de asistencia a la junta</h2>
      <JuntaStats rows={rows} />
    </section>
  );
}