import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Pin, Clock, Trash2 } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

export default function AnnouncementCard({ announcement, onEdit, onDelete, isAdmin }) {
  const priorityConfig = {
    Urgente: {
      gradient: "from-red-600 to-red-700",
      icon: "🚨",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    Importante: {
      gradient: "from-orange-600 to-orange-700",
      icon: "⚠️",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    Normal: {
      gradient: "from-blue-600 to-blue-700",
      icon: "ℹ️",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    }
  };

  const config = priorityConfig[announcement.prioridad] || priorityConfig.Normal;

  const isNew = announcement.fecha_publicacion 
    ? differenceInHours(new Date(), new Date(announcement.fecha_publicacion)) < 48
    : false;

  const isExpiringSoon = announcement.fecha_expiracion
    ? differenceInHours(new Date(announcement.fecha_expiracion), new Date()) < 72 && 
      differenceInHours(new Date(announcement.fecha_expiracion), new Date()) > 0
    : false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <Card className={`border ${config.borderColor} ${config.bgColor} shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden`}>
        {announcement.destacado && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-yellow-500 text-white text-xs">
              <Pin className="w-3 h-3 mr-1" />
            </Badge>
          </div>
        )}

        {isNew && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-green-600 text-white text-xs">
              NUEVO
            </Badge>
          </div>
        )}

        <div className={`bg-gradient-to-r ${config.gradient} p-3`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <span className="text-2xl">{config.icon}</span>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white leading-tight">
                  {announcement.titulo}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-3">
          <p className="text-sm text-slate-700 mb-2 leading-relaxed whitespace-pre-wrap line-clamp-3">
            {announcement.contenido}
          </p>

          <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-200">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {announcement.destinatarios_tipo}
            </Badge>
            
            {announcement.fecha_publicacion && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {format(new Date(announcement.fecha_publicacion), "dd MMM", { locale: es })}
              </Badge>
            )}

            {isExpiringSoon && (
              <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">
                <Clock className="w-2 h-2 mr-1" />
                Expira pronto
              </Badge>
            )}
          </div>

          {isAdmin && (onEdit || onDelete) && (
            <div className="flex gap-2 mt-2">
              {onEdit && (
                <Button
                  onClick={() => onEdit(announcement)}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
              )}
              {onDelete && (
                <Button
                  onClick={() => onDelete(announcement)}
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}