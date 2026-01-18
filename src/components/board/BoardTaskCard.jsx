import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Pencil, Trash2, CheckCircle2, MessageCircle } from "lucide-react";

const PRIORITY_COLORS = {
  baja: "bg-blue-100 text-blue-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-red-100 text-red-800"
};

export default function BoardTaskCard({ task, onEdit, onDelete, onComplete }) {
  return (
    <Card className="bg-white/90">
      <CardHeader className="py-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">{task.titulo}</CardTitle>
          <div className="flex gap-1">
            {task.estado !== 'hecho' && (
              <Button size="icon" variant="ghost" onClick={()=>onComplete?.(task)} className="h-7 w-7 text-green-600 hover:text-green-700">
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={()=>onEdit(task)} className="h-7 w-7">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={()=>onDelete(task)} className="h-7 w-7">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-3">
        {task.descripcion && (
          <p className="text-xs text-slate-600 mb-2 line-clamp-3">{task.descripcion}</p>
        )}
        {Array.isArray(task.comentarios) && task.comentarios.length > 0 && (
          <div className="bg-slate-50 border rounded-lg p-2 mb-2">
            <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-1"><MessageCircle className="w-3 h-3" /> Último comentario</div>
            <p className="text-[12px] text-slate-700 line-clamp-2">{task.comentarios[task.comentarios.length-1].mensaje}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          {task.prioridad && (
            <Badge className={PRIORITY_COLORS[task.prioridad] || ''}>{task.prioridad}</Badge>
          )}
          {task.area && (
            <Badge variant="outline">{task.area}</Badge>
          )}
          {task.rol_asignado && (
            <Badge variant="secondary">{task.rol_asignado}</Badge>
          )}
          {task.asignado_a_email && (
            <span className="flex items-center gap-1 text-xs text-slate-500"><User className="w-3 h-3" />{task.asignado_a_email}</span>
          )}
          {task.fecha_limite && (
            <span className="flex items-center gap-1 text-xs text-slate-500"><Calendar className="w-3 h-3" />{task.fecha_limite}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}