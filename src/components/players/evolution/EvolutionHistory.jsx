import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { mediaEvaluacion } from "./usePlayerEvolution";

const SKILLS = [
  ["tecnica", "Técnica"],
  ["tactica", "Táctica"],
  ["fisica", "Física"],
  ["actitud", "Actitud"],
  ["trabajo_equipo", "Equipo"],
];

export default function EvolutionHistory({ evaluations }) {
  if (evaluations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Todavía no hay evaluaciones</p>
      </div>
    );
  }

  const ordered = [...evaluations].reverse();

  return (
    <div className="space-y-3">
      {ordered.map((ev) => {
        const m = mediaEvaluacion(ev);
        return (
          <Card key={ev.id} className="bg-slate-50">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {(ev.fecha_evaluacion || "").split("-").reverse().join("/")}
                </span>
                {m !== null && <Badge variant="outline">Media {m.toFixed(1)}/5</Badge>}
              </div>
              <div className="grid grid-cols-5 gap-1 text-center">
                {SKILLS.map(([key, label]) => (
                  <div key={key}>
                    <div className="font-bold text-slate-900 text-sm">{ev[key] ?? "—"}</div>
                    <div className="text-[10px] text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              {ev.fortalezas && <p className="text-xs text-green-700">💪 {ev.fortalezas}</p>}
              {ev.aspectos_mejorar && <p className="text-xs text-orange-700">🎯 {ev.aspectos_mejorar}</p>}
              {ev.observaciones && <p className="text-xs text-slate-600">📝 {ev.observaciones}</p>}
              {ev.entrenador_nombre && <p className="text-[10px] text-slate-400">Por {ev.entrenador_nombre}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}