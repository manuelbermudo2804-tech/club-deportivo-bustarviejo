import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

const COLORS = {
  Logro: "bg-green-100 text-green-700",
  Progreso: "bg-blue-100 text-blue-700",
  "Preocupación": "bg-red-100 text-red-700",
  "Recomendación": "bg-purple-100 text-purple-700",
  "Observación": "bg-slate-100 text-slate-700",
};

export default function EvolutionNotes({ notes }) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Todavía no hay notas del entrenador</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const fecha = (note.fecha_evento || note.created_date || "").slice(0, 10);
        return (
          <Card key={note.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${COLORS[note.tipo_nota] || COLORS["Observación"]} border-none text-xs`}>
                  {note.tipo_nota}
                </Badge>
                {fecha && <span className="text-xs text-slate-500">{fecha.split("-").reverse().join("/")}</span>}
              </div>
              <p className="text-sm text-slate-700">{note.contenido}</p>
              {note.autor_nombre && <p className="text-xs text-slate-400 mt-2">Por {note.autor_nombre}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}