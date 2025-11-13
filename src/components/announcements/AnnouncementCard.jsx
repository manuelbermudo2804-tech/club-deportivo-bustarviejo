import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Edit, Mail, Pin, Clock, Sparkles } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

export default function AnnouncementCard({ announcement, onEdit, isAdmin }) {
  const priorityConfig = {
    Urgente: {
      gradient: "from-red-600 to-red-700",
      icon: "🚨",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    Importante: {
      gradient: "from-orange-600 to-orange-700",
      icon: "⚠️",
      textColor: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    Normal: {
      gradient: "from-blue-600 to-blue-700",
      icon: "ℹ️",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    }
  };

  const config = priorityConfig[announcement.prioridad] || priorityConfig.Normal;

  // Verificar si es nuevo (menos de 48 horas)
  const isNew = announcement.fecha_publicacion 
    ? differenceInHours(new Date(), new Date(announcement.fecha_publicacion)) < 48
    : false;

  // Verificar si está próximo a expirar (menos de 3 días)
  const isExpiringSoon = announcement.fecha_expiracion
    ? differenceInHours(new Date(announcement.fecha_expiracion), new Date()) < 72 && 
      differenceInHours(new Date(announcement.fecha_expiracion), new Date()) > 0
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative"
    >
      <Card className={`border-2 ${config.borderColor} ${config.bgColor} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden`}>
        {/* Pin badge */}
        {announcement.destacado && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-yellow-500 text-white shadow-lg">
              <Pin className="w-3 h-3 mr-1" />
              Anclado
            </Badge>
          </div>
        )}

        {/* NEW badge */}
        {isNew && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg animate-pulse">
              <Sparkles className="w-3 h-3 mr-1" />
              NUEVO
            </Badge>
          </div>
        )}

        {/* Expiring soon badge */}
        {isExpiringSoon && (
          <div className="absolute top-12 right-3 z-10">
            <Badge className="bg-orange-500 text-white shadow-lg text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Expira pronto
            </Badge>
          </div>
        )}

        {/* Header con gradiente */}
        <div className={`bg-gradient-to-r ${config.gradient} p-4`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="text-4xl">{config.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-white/20 text-white text-xs">
                    {announcement.prioridad}
                  </Badge>
                  {announcement.email_enviado && (
                    <Badge className="bg-white/20 text-white text-xs">
                      <Mail className="w-3 h-3 mr-1" />
                      Email enviado
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl text-white leading-tight">
                  {announcement.titulo}
                </CardTitle>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            {/* Contenido */}
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {announcement.contenido}
            </p>

            {/* Metadatos */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
              <Badge variant="outline" className="text-xs">
                {announcement.destinatarios_tipo === "Categoría Específica" 
                  ? `${announcement.categoria_destino}` 
                  : announcement.destinatarios_tipo}
              </Badge>
              
              {announcement.fecha_publicacion && (
                <Badge variant="outline" className="text-xs">
                  📅 {format(new Date(announcement.fecha_publicacion), "d MMM yyyy, HH:mm", { locale: es })}
                </Badge>
              )}

              {announcement.fecha_expiracion && (
                <Badge variant="outline" className="text-xs bg-orange-50 border-orange-300 text-orange-700">
                  ⏰ Expira: {format(new Date(announcement.fecha_expiracion), "d MMM yyyy", { locale: es })}
                </Badge>
              )}
            </div>

            {/* Botón de edición (solo admin) */}
            {isAdmin && onEdit && (
              <div className="pt-3">
                <Button
                  onClick={() => onEdit(announcement)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Anuncio
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}