import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Users, Mail } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AnnouncementCard({ announcement, onEdit, isAdmin }) {
  const priorityConfig = {
    "Normal": {
      icon: "ℹ️",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      bgGradient: "from-blue-500 to-blue-700"
    },
    "Importante": {
      icon: "⚠️",
      color: "bg-orange-100 text-orange-700 border-orange-200",
      bgGradient: "from-orange-500 to-orange-700"
    },
    "Urgente": {
      icon: "🚨",
      color: "bg-red-100 text-red-700 border-red-200",
      bgGradient: "from-red-500 to-red-700"
    }
  };

  const recipientConfig = {
    "Todos": { icon: "👥", label: "Todos" },
    "Fútbol": { icon: "⚽", label: "Fútbol" },
    "Baloncesto": { icon: "🏀", label: "Baloncesto" },
    "Categoría Específica": { icon: "🎯", label: announcement.categoria_destino }
  };

  const config = priorityConfig[announcement.prioridad] || priorityConfig["Normal"];
  const recipient = recipientConfig[announcement.destinatarios_tipo];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 shadow-lg bg-white">
        <div className={`h-3 bg-gradient-to-r ${config.bgGradient}`}></div>
        
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl">{config.icon}</span>
                <Badge className={config.color}>
                  {announcement.prioridad}
                </Badge>
                {announcement.enviar_email && (
                  <Badge variant="outline" className="text-xs">
                    <Mail className="w-3 h-3 mr-1" />
                    Email enviado
                  </Badge>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {announcement.titulo}
              </h3>
              
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mb-3">
                {announcement.contenido}
              </p>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {recipient.icon} {recipient.label}
                </Badge>
                <Badge variant="outline" className="text-xs text-slate-500">
                  {format(new Date(announcement.fecha_publicacion || announcement.created_date), "d 'de' MMMM, HH:mm", { locale: es })}
                </Badge>
              </div>
            </div>

            {isAdmin && onEdit && (
              <Button
                onClick={() => onEdit(announcement)}
                variant="ghost"
                size="icon"
                className="hover:bg-orange-50"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}