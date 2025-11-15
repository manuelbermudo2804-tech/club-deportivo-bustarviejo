import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import { format, isSameDay, addDays } from "date-fns";
import { es } from "date-fns/locale";

export default function UpcomingEvents({ events, myPlayers }) {
  const myCategories = myPlayers.map(p => p.deporte);
  const today = new Date();
  const nextWeek = addDays(today, 7);

  const relevantEvents = events.filter(e => {
    const eventDate = new Date(e.fecha);
    return (
      e.publicado &&
      eventDate >= today &&
      eventDate <= nextWeek &&
      (e.deporte === "Todos" || myCategories.includes(e.deporte))
    );
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).slice(0, 3);

  const typeEmojis = {
    "Partido": "⚽",
    "Entrenamiento": "🏃",
    "Reunión": "👥",
    "Torneo": "🏆",
    "Inicio Temporada": "🎉",
    "Gestion Club": "📋",
    "Pago": "💳",
    "Inscripción": "📝",
    "Pedido Ropa": "👕",
    "Fiesta Club": "🎊",
    "Fin Temporada": "🏁"
  };

  const typeColors = {
    "Partido": "bg-green-100 text-green-700",
    "Entrenamiento": "bg-blue-100 text-blue-700",
    "Reunión": "bg-purple-100 text-purple-700",
    "Torneo": "bg-orange-100 text-orange-700",
    "Pago": "bg-red-100 text-red-700",
    "Fiesta Club": "bg-pink-100 text-pink-700"
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
          <Calendar className="w-4 h-4" />
          Próximos Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {relevantEvents.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No hay eventos próximos esta semana
          </div>
        ) : (
          <div className="space-y-2">
            {relevantEvents.map(event => {
              const eventDate = new Date(event.fecha);
              const isToday = isSameDay(eventDate, today);

              return (
                <div key={event.id} className={`p-3 rounded-lg border ${isToday ? 'bg-orange-50 border-orange-300' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className={`${typeColors[event.tipo] || "bg-slate-100 text-slate-700"} text-xs`}>
                      <span className="mr-1">{typeEmojis[event.tipo]}</span>
                      {event.tipo}
                    </Badge>
                    {isToday && (
                      <Badge className="bg-red-500 text-white animate-pulse text-xs">
                        HOY
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{event.titulo}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(eventDate, "dd MMM", { locale: es })}
                    </div>
                    {event.hora && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.hora}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}