import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, AlertCircle, Lock, Users } from "lucide-react";

export default function MemberNoteCard({ note }) {
  const typeIcons = {
    "Comunicación": "💬",
    "Comportamiento": "😊",
    "Médica": "🏥",
    "Administrativa": "📋",
    "Pago": "💰",
    "Rendimiento": "⭐",
    "Otra": "📝"
  };

  const priorityColors = {
    "Baja": "bg-slate-200 text-slate-700",
    "Normal": "bg-blue-100 text-blue-700",
    "Alta": "bg-orange-100 text-orange-700",
    "Urgente": "bg-red-100 text-red-700"
  };

  const privacyIcons = {
    "Solo Admin": <Lock className="w-3 h-3" />,
    "Admin y Entrenadores": <Users className="w-3 h-3" />,
    "Todos": <Users className="w-3 h-3" />
  };

  return (
    <Card className={`border-none shadow-lg ${note.prioridad === "Urgente" ? "border-2 border-red-300" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">{typeIcons[note.tipo_nota]}</span>
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900">{note.titulo}</h3>
                  <Badge className={priorityColors[note.prioridad]}>
                    {note.prioridad}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  {privacyIcons[note.privacidad]}
                  {note.privacidad} • {note.tipo_nota}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-3 whitespace-pre-line">{note.contenido}</p>

            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {note.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Por: <strong>{note.autor_nombre}</strong>
              </p>
              <p className="text-xs text-slate-500">
                {format(new Date(note.created_date), "dd MMM yyyy HH:mm", { locale: es })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}