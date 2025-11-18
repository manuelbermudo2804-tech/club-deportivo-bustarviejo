import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Calendar, Info, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import ContactCard from "../components/ContactCard";

const DIAS_ORDEN = {
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5
};

const UBICACION_MAPS_URL = "https://www.google.com/maps?q=40.856169,-3.724407";

export default function ParentTrainingSchedules() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: async () => {
      const allSchedules = await base44.entities.TrainingSchedule.list();
      return allSchedules.filter(s => s.activo);
    },
    initialData: [],
  });

  // Obtener categorías únicas de mis jugadores
  const myCategories = [...new Set(players.map(p => p.deporte))];

  // Filtrar horarios solo de las categorías de mis jugadores
  const mySchedules = schedules.filter(s => myCategories.includes(s.categoria));

  // Agrupar horarios por categoría
  const schedulesByCategory = mySchedules.reduce((acc, schedule) => {
    if (!acc[schedule.categoria]) {
      acc[schedule.categoria] = [];
    }
    acc[schedule.categoria].push(schedule);
    return acc;
  }, {});

  // Ordenar horarios dentro de cada categoría por día
  Object.keys(schedulesByCategory).forEach(categoria => {
    schedulesByCategory[categoria].sort((a, b) => DIAS_ORDEN[a.dia_semana] - DIAS_ORDEN[b.dia_semana]);
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Horarios de Entrenamientos</h1>
        <p className="text-slate-600 mt-1">Consulta los horarios de entrenamientos de tus jugadores</p>
      </div>

      {/* Ubicación del Campo */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <MapPin className="w-6 h-6 text-green-700 mt-1" />
              <div>
                <p className="text-sm text-green-800 mb-1">📍 Ubicación de Entrenamientos:</p>
                <p className="text-lg font-bold text-green-900">Campo Municipal de Bustarviejo</p>
                <p className="text-sm text-green-700 mt-1">Todos los entrenamientos se realizan en esta ubicación</p>
              </div>
            </div>
            <a
              href={UBICACION_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-green-600 hover:bg-green-700 shadow-lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver en Google Maps
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>ℹ️ Información:</strong> Aquí puedes ver los horarios de entrenamientos de las categorías en las que participan tus jugadores.
        </AlertDescription>
      </Alert>

      {/* Players Summary */}
      {players.length > 0 && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300">
          <CardHeader>
            <CardTitle className="text-lg text-orange-900">Tus Jugadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {players.map(player => (
                <Badge key={player.id} className="bg-orange-600 text-white">
                  {player.nombre} - {player.deporte}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedules */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : players.length === 0 ? (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No tienes jugadores registrados</p>
            <p className="text-sm text-slate-400 mt-2">Registra un jugador para ver sus horarios de entrenamientos</p>
          </CardContent>
        </Card>
      ) : Object.keys(schedulesByCategory).length === 0 ? (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay horarios disponibles</p>
            <p className="text-sm text-slate-400 mt-2">Los horarios de entrenamientos aún no han sido configurados para las categorías de tus jugadores</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(schedulesByCategory).sort().map(categoria => {
            // Encontrar jugadores de esta categoría
            const playersInCategory = players.filter(p => p.deporte === categoria);
            
            return (
              <Card key={categoria} className="border-none shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b-2 border-orange-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl text-orange-900 flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5" />
                        {categoria}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {playersInCategory.map(player => (
                          <Badge key={player.id} variant="outline" className="text-orange-700 border-orange-300">
                            {player.nombre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedulesByCategory[categoria].map(schedule => (
                      <div
                        key={schedule.id}
                        className="border-2 border-orange-200 rounded-lg p-4 bg-gradient-to-br from-white to-orange-50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-orange-600 text-white">
                            {schedule.dia_semana}
                          </Badge>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock className="w-5 h-5 text-orange-600" />
                            <span className="font-bold text-lg">
                              {schedule.hora_inicio} - {schedule.hora_fin}
                            </span>
                          </div>

                          <a
                            href={UBICACION_MAPS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 text-slate-600 bg-green-50 rounded-lg p-2 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-xs font-medium">{schedule.ubicacion}</span>
                            </div>
                            <ExternalLink className="w-3 h-3 text-green-600 flex-shrink-0" />
                          </a>

                          {schedule.notas && (
                            <div className="mt-2 pt-2 border-t border-orange-200 bg-blue-50 rounded-lg p-2">
                              <p className="text-xs text-blue-800">
                                <strong>📝 Nota:</strong> {schedule.notas}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ContactCard />
    </div>
  );
}