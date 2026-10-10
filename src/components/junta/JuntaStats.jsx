import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function JuntaStats({ rows }) {
  const voy = rows.filter((r) => r.respuesta === "voy");
  const stats = [
    { label: "Personas que vienen", value: voy.reduce((s, r) => s + (r.personas || 1), 0), cls: "text-green-700" },
    { label: "Respuestas 'Voy'", value: voy.length, cls: "text-green-700" },
    { label: "Delegan voto", value: rows.filter((r) => r.respuesta === "delego").length, cls: "text-blue-700" },
    { label: "No pueden", value: rows.filter((r) => r.respuesta === "no_voy").length, cls: "text-red-700" },
    { label: "Socios al corriente (vienen)", value: voy.filter((r) => r.socio === "si").length, cls: "text-orange-700" },
    { label: "No socios (vienen)", value: voy.filter((r) => r.socio === "no").length, cls: "text-slate-700" },
    { label: "Preguntas recibidas", value: rows.filter((r) => r.pregunta).length, cls: "text-purple-700" },
  ];
  const ludo = rows.filter((r) => r.ludoteca === "si");
  if (ludo.length) stats.push({ label: `🧸 Quieren ludoteca (${ludo.reduce((s, r) => s + (r.ninos_ludoteca || 1), 0)} niños)`, value: ludo.length, cls: "text-sky-700" });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {stats.map((s) => (
        <Card key={s.label}><CardContent className="p-3">
          <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
          <p className="text-xs text-slate-500">{s.label}</p>
        </CardContent></Card>
      ))}
    </div>
  );
}