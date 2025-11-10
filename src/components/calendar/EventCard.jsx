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
    orange: "from-orange-500 to-orange-700 border-orange-200",
    blue: "from-blue-500 to-blue-700 border-blue-200",
    green: "from-green-500 to-green-700 border-green-200",
    red: "from-red-500 to-red-700 border-red-200",
    purple: "from-purple-500 to-purple-700 border-purple-200",
    yellow: "from-yellow-500 to-yellow-700 border-yellow-200"
  };

  const sportIcons = {
    "Fútbol": "⚽",
    "Baloncesto": "🏀",
    "Paddle": "🎾",
    "Todos": "🏃"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 shadow-lg bg-white">
        <div className={`h-3 bg-gradient-to-r ${colorClasses[event.color]}`}></div>
        
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{typeIcons[event.tipo] || "📅"}</span>
                {event.importante && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {event.titulo}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {event.tipo}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {sportIcons[event.deporte]} {event.deporte}
                </Badge>
                {event.categoria !== "Todas" && (
                  <Badge variant="outline" className="text-xs">
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
                className="hover:bg-orange-50"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>

          {event.descripcion && (
            <p className="text-sm text-slate-600 line-clamp-2">
              {event.descripcion}
            </p>
          )}

          <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span className="font-medium">
                {format(new Date(event.fecha + 'T00:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            </div>
            
            {event.hora && (
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>{event.hora}</span>
              </div>
            )}

            {event.ubicacion && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span>{event.ubicacion}</span>
              </div>
            )}

            {event.tipo === "Partido" && event.rival && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Rival</p>
                    <p className="font-bold text-slate-900">{event.rival}</p>
                  </div>
                  {event.local_visitante && (
                    <Badge className={event.local_visitante === "Local" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                      {event.local_visitante === "Local" ? "🏠" : "✈️"} {event.local_visitante}
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