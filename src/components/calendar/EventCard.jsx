import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, MapPin, Clock, Calendar, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function EventCard({ event, onEdit, isAdmin }) {
  const typeIcons = {
    "Partido": "⚽",
    "Entrenamiento": "🏃",
    "Reunión": "👥",
    "Torneo": "🏆",
    "Inicio Temporada": "🎯",
    "Otro": "📅"
  };

  const colorClasses = {
    orange: "from-orange-500 to-orange-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600",
    purple: "from-purple-500 to-purple-600",
    yellow: "from-yellow-500 to-yellow-600"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border shadow-md bg-white">
        <div className={`h-2 bg-gradient-to-r ${colorClasses[event.color]}`}></div>
        
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xl">{typeIcons[event.tipo] || "📅"}</span>
                {event.importante && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1 leading-tight">
                {event.titulo}
              </h3>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {event.tipo}
                </Badge>
                {event.categoria !== "Todas" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {event.categoria}
                  </Badge>
                )}
              </div>
            </div>
            {isAdmin && onEdit && (
              <Button
                onClick={() => onEdit(event)}
                variant="ghost"
                size="icon"
                className="hover:bg-orange-50 h-7 w-7"
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </div>

          {event.descripcion && (
            <p className="text-xs text-slate-600 line-clamp-2">
              {event.descripcion}
            </p>
          )}

          <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Calendar className="w-3 h-3 text-orange-600 flex-shrink-0" />
              <span className="font-medium">
                {format(new Date(event.fecha + 'T00:00:00'), "dd MMM yyyy", { locale: es })}
              </span>
            </div>
            
            {event.hora && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3 h-3 text-orange-600 flex-shrink-0" />
                <span>{event.hora}</span>
              </div>
            )}

            {event.ubicacion && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3 h-3 text-orange-600 flex-shrink-0" />
                <span className="truncate">{event.ubicacion}</span>
              </div>
            )}

            {event.tipo === "Partido" && event.rival && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-500 mb-0.5">Rival</p>
                    <p className="font-bold text-slate-900 text-xs truncate">{event.rival}</p>
                  </div>
                  {event.local_visitante && (
                    <Badge className={`${event.local_visitante === "Local" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"} text-[10px] px-1.5 py-0`}>
                      {event.local_visitante === "Local" ? "🏠" : "✈️"}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}