import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Pencil, Trash2, CheckCircle2, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

const PRIORITY_COLORS = {
  baja: "bg-blue-100 text-blue-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-red-100 text-red-800"
};

export default function BoardTaskCard({ task, onEdit, onDelete, onComplete, canManage = false, canDelete = false }) {
  const [expanded, setExpanded] = React.useState(false);
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
            {canManage && <Button size="icon" variant="ghost" aria-label="Editar tarea" onClick={()=>onEdit(task)} className="h-7 w-7">
              <Pencil className="w-4 h-4" />
            </Button>}
            {canDelete && <Button size="icon" variant="ghost" aria-label="Eliminar tarea" onClick={()=>onDelete(task)} className="h-7 w-7 text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-3">
        {task.descripcion && (
          <p className={`text-xs text-slate-600 mb-2 whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}>{task.descripcion}</p>
        )}
        {Array.isArray(task.historial) && task.historial.length > 0 && (
          <div className="mb-2 rounded-lg border border-orange-100 bg-orange-50/60 p-2">
            <div className="mb-1 text-[11px] font-medium text-orange-800">Último movimiento</div>
            <p className="text-[12px] text-slate-700">{task.historial[task.historial.length - 1].detalle}</p>
            <p className="mt-1 text-[10px] text-slate-500">{task.historial[task.historial.length - 1].autor_nombre || task.historial[task.historial.length - 1].autor_email} · {task.historial[task.historial.length - 1].fecha ? new Date(task.historial[task.historial.length - 1].fecha).toLocaleString("es-ES") : ""}</p>
          </div>
        )}
        {Array.isArray(task.comentarios) && task.comentarios.length > 0 && (
          <div className="bg-slate-50 border rounded-lg p-2 mb-2">
            <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-1"><MessageCircle className="w-3 h-3" /> Último comentario</div>
            <p className="text-[12px] text-slate-700 line-clamp-2">{task.comentarios[task.comentarios.length-1].mensaje}</p>
          </div>
        )}
        {(task.descripcion || (task.historial || []).length > 1 || (task.comentarios || []).length > 1) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)} className="mb-2 h-7 px-2 text-xs text-slate-600">
            {expanded ? <><ChevronUp className="mr-1 h-3 w-3" /> Ver menos</> : <><ChevronDown className="mr-1 h-3 w-3" /> Ampliar tarea y actividad</>}
          </Button>
        )}
        {expanded && Array.isArray(task.historial) && task.historial.length > 1 && (
          <div className="mb-2 space-y-2 rounded-lg border border-slate-200 bg-white p-2">
            <p className="text-[11px] font-semibold text-slate-600">Actividad completa</p>
            {task.historial.slice().reverse().map((item, index) => (
              <div key={`${item.fecha || "movimiento"}-${index}`} className="border-l-2 border-orange-200 pl-2">
                <p className="text-xs text-slate-700">{item.detalle}</p>
                <p className="text-[10px] text-slate-500">{item.autor_nombre || item.autor_email || "Miembro de la Junta"} · {item.fecha ? new Date(item.fecha).toLocaleString("es-ES") : ""}</p>
              </div>
            ))}
          </div>
        )}
        {expanded && Array.isArray(task.comentarios) && task.comentarios.length > 1 && (
          <div className="mb-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] font-semibold text-slate-600">Comentarios</p>
            {task.comentarios.slice().reverse().map((item, index) => (
              <div key={`${item.fecha || "comentario"}-${index}`}>
                <p className="whitespace-pre-wrap text-xs text-slate-700">{item.mensaje}</p>
                <p className="text-[10px] text-slate-500">{item.autor_nombre || item.autor_email || "Miembro de la Junta"} · {item.fecha ? new Date(item.fecha).toLocaleString("es-ES") : ""}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          {task.prioridad && (
            <Badge className={PRIORITY_COLORS[task.prioridad] || ''}>{task.prioridad}</Badge>
          )}
          {task.tipo_registro && task.tipo_registro !== "tarea" && (
            <Badge variant="outline" className="border-orange-200 text-orange-800">{task.tipo_registro}</Badge>
          )}
          {task.reunion_id && <Badge variant="outline" className="border-sky-200 text-sky-800">Vinculada a acta</Badge>}
          {task.area && (
            <Badge variant="outline">{task.area}</Badge>
          )}
          {(task.asignado_a_nombre || task.asignado_a_email) && (
            <span className="flex items-center gap-1 text-xs font-medium text-slate-700"><User className="w-3 h-3" />{task.asignado_a_nombre || task.asignado_a_email}</span>
          )}
          {!task.asignado_a_email && task.rol_asignado && (
            <Badge variant="secondary">{task.rol_asignado}</Badge>
          )}
          {task.fecha_limite && (
            <span className="flex items-center gap-1 text-xs text-slate-500"><Calendar className="w-3 h-3" />{task.fecha_limite}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}