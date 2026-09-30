import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { RESPUESTAS } from "@/lib/juntaUtils";

const SOCIO = { si: ["Socio", "bg-orange-100 text-orange-800"], pendiente: ["Socio (cuota pendiente)", "bg-yellow-100 text-yellow-800"], no: ["No socio", "bg-slate-100 text-slate-700"] };
const FILTROS = [["todos", "Todos"], ["voy", "Vienen"], ["delego", "Delegan"], ["no_voy", "No pueden"], ["preguntas", "Con pregunta"]];

export default function JuntaAsistentesTabla({ rows }) {
  const [filtro, setFiltro] = useState("todos");
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
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {FILTROS.map(([k, l]) => <Button key={k} size="sm" variant={filtro === k ? "default" : "outline"} onClick={() => setFiltro(k)}>{l}</Button>)}
        <Button size="sm" variant="outline" className="ml-auto" onClick={exportar}><Download className="w-4 h-4 mr-1" />Exportar</Button>
      </div>
      {lista.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">Todavía no hay respuestas.</p> : (
        <div className="divide-y">
          {lista.map((r) => (
            <div key={r.origen + r.id} className="py-2 flex flex-wrap gap-2 items-start">
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold">{r.nombre}</p>
                <p className="text-xs text-slate-500">{[r.email, r.telefono].filter(Boolean).join(" · ")}</p>
                {r.pregunta && <p className="text-sm mt-1 bg-purple-50 rounded p-2">❓ {r.pregunta}</p>}
              </div>
              <Badge className={RESPUESTAS[r.respuesta]?.cls}>{RESPUESTAS[r.respuesta]?.emoji} {RESPUESTAS[r.respuesta]?.label}{r.respuesta === "voy" && r.personas > 1 ? ` (${r.personas})` : ""}</Badge>
              <Badge className={SOCIO[r.socio][1]}>{SOCIO[r.socio][0]}</Badge>
              <Badge variant="outline">{r.origen}</Badge>
            </div>
          ))}
        </div>
      )}
    </CardContent></Card>
  );
}