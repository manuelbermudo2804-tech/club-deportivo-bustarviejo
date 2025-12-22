import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, MapPin, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AgendaView({ items, onItemClick }) {
  const groupedByDate = items.reduce((acc, item) => {
    const date = item.fecha || item.fecha_partido;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort();

  const getItemColor = (item) => {
    if (item.tipo === 'convocatoria') return 'border-purple-300 bg-purple-50';
    if (item.tipo === 'entrenamiento') return 'border-blue-300 bg-blue-50';
    if (item.tipo === 'Partido') return 'border-green-300 bg-green-50';
    return 'border-orange-300 bg-orange-50';
  };

  const getItemIcon = (item) => {
    if (item.tipo === 'convocatoria') return '🎯';
    if (item.tipo === 'entrenamiento') return '🏃';
    if (item.tipo === 'Partido') return '⚽';
    return '📅';
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  return (
    <div className="space-y-6">
      {sortedDates.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No hay eventos programados</p>
          </CardContent>
        </Card>
      ) : (
        sortedDates.map(date => (
          <div key={date} className="space-y-3">
            <div className={`flex items-center gap-3 sticky top-0 bg-slate-50 py-2 px-3 rounded-lg border ${isToday(date) ? 'border-orange-400 bg-orange-50' : 'border-slate-200'}`}>
              <Calendar className={`w-5 h-5 ${isToday(date) ? 'text-orange-600' : 'text-slate-600'}`} />
              <div>
                <h3 className={`font-bold ${isToday(date) ? 'text-orange-900' : 'text-slate-900'}`}>
                  {format(new Date(date + 'T00:00:00'), 'EEEE d MMMM yyyy', { locale: es })}
                </h3>
                {isToday(date) && (
                  <Badge className="bg-orange-600 text-white text-xs">Hoy</Badge>
                )}
              </div>
              <Badge variant="outline" className="ml-auto">
                {groupedByDate[date].length} {groupedByDate[date].length === 1 ? 'evento' : 'eventos'}
              </Badge>
            </div>

            <div className="space-y-2">
              {groupedByDate[date]
                .sort((a, b) => {
                  const timeA = a.hora || a.hora_partido || '00:00';
                  const timeB = b.hora || b.hora_partido || '00:00';
                  return timeA.localeCompare(timeB);
                })
                .map(item => (
                  <Card 
                    key={item.id} 
                    className={`${getItemColor(item)} border-2 cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => onItemClick && onItemClick(item)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getItemIcon(item)}</div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-slate-900 text-lg">
                              {item.titulo}
                            </h4>
                            {item.importante && (
                              <Badge className="bg-red-500 text-white">Importante</Badge>
                            )}
                          </div>

                          <div className="space-y-1 text-sm text-slate-600">
                            {(item.hora || item.hora_partido) && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {item.hora_concentracion && `Concentración: ${item.hora_concentracion} • `}
                                  {item.hora || item.hora_partido}
                                  {item.hora_fin && ` - ${item.hora_fin}`}
                                </span>
                              </div>
                            )}

                            {item.ubicacion && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{item.ubicacion}</span>
                              </div>
                            )}

                            {item.rival && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>vs {item.rival}</span>
                                {item.local_visitante && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.local_visitante}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {item.categoria && (
                              <Badge className="bg-slate-600 text-white mt-2">
                                {item.categoria}
                              </Badge>
                            )}

                            {item.deporte && item.deporte !== 'Todos' && (
                              <Badge className="bg-blue-600 text-white mt-2">
                                {item.deporte}
                              </Badge>
                            )}
                          </div>

                          {item.descripcion && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                              {item.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}