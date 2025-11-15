import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function UpcomingMatches({ callups }) {
  const today = new Date().toISOString().split('T')[0];
  
  // Filtrar convocatorias futuras de tipo partido
  const upcomingMatches = callups
    .filter(c => 
      c.publicada && 
      !c.cerrada && 
      c.fecha_partido >= today &&
      (c.tipo === "Partido" || c.tipo === "Amistoso" || c.tipo === "Torneo")
    )
    .sort((a, b) => a.fecha_partido.localeCompare(b.fecha_partido))
    .slice(0, 5);

  if (upcomingMatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Próximos Partidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay partidos próximos programados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          Próximos Partidos ({upcomingMatches.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingMatches.map((match) => (
            <div 
              key={match.id}
              className="p-4 border-2 border-slate-200 rounded-lg hover:border-orange-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className="bg-slate-900 text-white text-xs">
                      {match.categoria}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {match.tipo}
                    </Badge>
                    {match.local_visitante && (
                      <Badge 
                        className={`text-xs ${
                          match.local_visitante === "Local" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {match.local_visitante}
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-bold text-lg">{match.titulo}</h4>
                  {match.rival && (
                    <p className="text-slate-600 text-sm">vs {match.rival}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">
                    {format(new Date(match.fecha_partido), "EEEE, d 'de' MMMM", { locale: es })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>
                    Partido: <strong>{match.hora_partido}</strong>
                    {match.hora_concentracion && (
                      <span className="text-xs text-slate-500 ml-2">
                        • Concentración: {match.hora_concentracion}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>{match.ubicacion}</span>
                </div>
              </div>

              {match.jugadores_convocados && match.jugadores_convocados.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    {match.jugadores_convocados.length} jugador{match.jugadores_convocados.length !== 1 ? 'es' : ''} convocado{match.jugadores_convocados.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}