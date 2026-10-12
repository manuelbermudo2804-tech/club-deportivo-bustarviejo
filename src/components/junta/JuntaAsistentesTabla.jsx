import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Search, Users, MessageSquare, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { RESPUESTAS } from "@/lib/juntaUtils";

const SOCIO = { si: ["Socio", "bg-orange-100 text-orange-800"], pendiente: ["Socio (cuota pendiente)", "bg-yellow-100 text-yellow-800"], no: ["No socio", "bg-slate-100 text-slate-700"] };
const FILTROS = [["todos", "Todos"], ["voy", "Vienen"], ["delego", "Delegan"], ["no_voy", "No pueden"], ["preguntas", "Con pregunta"]];

export default function JuntaAsistentesTabla({ rows }) {
  const [filtro, setFiltro] = useState("todos");
  const qc = useQueryClient();
  const [borrando, setBorrando] = useState(null);
  const borrar = async (r) => {
    if (!window.confirm(`¿Quitar a ${r.nombre} de la lista de la junta?`)) return;
    setBorrando(r.id);
    if (r.origen === "App") await base44.entities.JuntaAsistencia.delete(r.id);
    else await base44.functions.invoke("manageLandingSubmission", { action: "delete", submission_id: r.id });
    await qc.invalidateQueries({ queryKey: ["juntaRespuestas"] });
    setBorrando(null);
    toast.success("Asistente eliminado");
  };
  const lista = rows.filter((r) => filtro === "todos" || (filtro === "preguntas" ? !!r.pregunta : r.respuesta === filtro));

  const exportar = () => {
    const csv = [["Nombre", "Email", "Teléfono", "Respuesta", "Personas", "Socio", "Origen", "Pregunta"], ...lista.map((r) => [r.nombre, r.email, r.telefono, RESPUESTAS[r.respuesta]?.label, r.personas, SOCIO[r.socio][0], r.origen, r.pregunta])]
      .map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = "asistentes-junta.csv";
    a.click();
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><Users className="h-5 w-5 text-orange-600" />Listado de respuestas</h3><p className="mt-1 text-xs text-slate-500">{lista.length} {lista.length === 1 ? "respuesta" : "respuestas"} en esta vista</p></div>
        <Button size="sm" variant="outline" className="h-10 w-full rounded-lg border-slate-300 sm:w-auto" onClick={exportar}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map(([k, l]) => <Button key={k} size="sm" variant={filtro === k ? "default" : "outline"} className={`h-9 shrink-0 rounded-lg px-3 ${filtro === k ? "bg-orange-600 text-white hover:bg-orange-700" : "border-slate-200 text-slate-600"}`} onClick={() => setFiltro(k)}>{l}</Button>)}
      </div>
      {lista.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-600">No hay respuestas en este filtro</p><p className="mt-1 text-xs text-slate-400">Prueba a seleccionar «Todos» para ver la lista completa.</p></div> : (
        <div className="divide-y divide-slate-100">
          {lista.map((r) => (
            <div key={r.origen + r.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-slate-900">{r.nombre || "Sin nombre"}</p>
                <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">{[r.email, r.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
                {r.ludoteca === "si" && <p className="mt-2 inline-flex rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">🧸 Ludoteca · {r.ninos_ludoteca || 1} niños</p>}
                {r.pregunta && <p className="mt-2 flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3 text-sm leading-relaxed text-purple-900"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />{r.pregunta}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:max-w-64 sm:justify-end">
                <Badge className={`rounded-md px-2 py-1 ${RESPUESTAS[r.respuesta]?.cls || "bg-slate-100 text-slate-700"}`}>{RESPUESTAS[r.respuesta]?.emoji} {RESPUESTAS[r.respuesta]?.label}{r.respuesta === "voy" && r.personas > 1 ? ` (${r.personas})` : ""}</Badge>
                <Badge className={`rounded-md px-2 py-1 ${SOCIO[r.socio]?.[1] || "bg-slate-100 text-slate-700"}`}>{SOCIO[r.socio]?.[0] || "Socio sin verificar"}</Badge>
                <Badge variant="outline" className="rounded-md px-2 py-1">{r.origen}</Badge>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-red-600 hover:bg-red-50" disabled={borrando === r.id} onClick={() => borrar(r)} aria-label="Borrar asistente"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent></Card>
  );
}