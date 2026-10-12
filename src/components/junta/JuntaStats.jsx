import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle2, Vote, XCircle, BadgeCheck, UserRoundX, MessageSquare, Baby } from "lucide-react";

export default function JuntaStats({ rows }) {
  const voy = rows.filter((r) => r.respuesta === "voy");
  const stats = [
    { label: "Personas que vienen", value: voy.reduce((s, r) => s + (r.personas || 1), 0), cls: "text-green-700", icon: Users, tone: "green" },
    { label: "Respuestas «Voy»", value: voy.length, cls: "text-green-700", icon: CheckCircle2, tone: "green" },
    { label: "Delegan voto", value: rows.filter((r) => r.respuesta === "delego").length, cls: "text-blue-700", icon: Vote, tone: "blue" },
    { label: "No pueden asistir", value: rows.filter((r) => r.respuesta === "no_voy").length, cls: "text-red-700", icon: XCircle, tone: "red" },
    { label: "Socios al corriente", value: voy.filter((r) => r.socio === "si").length, cls: "text-orange-700", icon: BadgeCheck, tone: "orange" },
    { label: "No socios", value: voy.filter((r) => r.socio === "no").length, cls: "text-slate-700", icon: UserRoundX, tone: "slate" },
    { label: "Preguntas recibidas", value: rows.filter((r) => r.pregunta).length, cls: "text-purple-700", icon: MessageSquare, tone: "purple" },
  ];
  const ludo = rows.filter((r) => r.ludoteca === "si");
  if (ludo.length) stats.push({ label: `Solicitan ludoteca · ${ludo.reduce((s, r) => s + (r.ninos_ludoteca || 1), 0)} niños`, value: ludo.length, cls: "text-sky-700", icon: Baby, tone: "sky" });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        const tones = { green: "bg-green-50 text-green-700 ring-green-100", blue: "bg-blue-50 text-blue-700 ring-blue-100", red: "bg-red-50 text-red-700 ring-red-100", orange: "bg-orange-50 text-orange-700 ring-orange-100", slate: "bg-slate-100 text-slate-700 ring-slate-200", purple: "bg-purple-50 text-purple-700 ring-purple-100", sky: "bg-sky-50 text-sky-700 ring-sky-100" };
        return (
          <Card key={s.label} className="rounded-xl border-slate-200 shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="flex min-h-28 items-start gap-3 p-3.5 sm:p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${tones[s.tone] || tones.slate}`}><Icon className="h-4 w-4" /></div>
              <div className="min-w-0"><p className={`text-2xl font-bold leading-tight ${s.cls}`}>{s.value}</p><p className="mt-1 text-xs leading-snug text-slate-500 sm:text-sm">{s.label}</p></div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}