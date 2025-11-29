import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DESTINATARIO_LABELS = {
  todos: "Todos",
  padres: "Padres",
  entrenadores: "Entrenadores",
  administradores: "Admins",
  categoria: "Categoría"
};

const PRIORIDAD_COLORS = {
  normal: "bg-blue-100 text-blue-800",
  importante: "bg-orange-100 text-orange-800",
  urgente: "bg-red-100 text-red-800"
};

export default function PushNotificationCard({ notification }) {
  return (
    <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{notification.icono || "📢"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900 truncate">{notification.titulo}</h3>
              <Badge className={PRIORIDAD_COLORS[notification.prioridad] || PRIORIDAD_COLORS.normal}>
                {notification.prioridad}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notification.mensaje}</p>
            
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>
                  {notification.tipo_destinatario === "categoria" 
                    ? notification.categoria_destino 
                    : DESTINATARIO_LABELS[notification.tipo_destinatario] || "Todos"}
                </span>
              </div>
              
              {notification.enlace_destino && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  <span>{notification.enlace_destino}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {notification.fecha_envio 
                    ? format(new Date(notification.fecha_envio), "d MMM yyyy, HH:mm", { locale: es })
                    : "Pendiente"}
                </span>
              </div>
              
              {notification.destinatarios_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  {notification.destinatarios_count} destinatarios
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}