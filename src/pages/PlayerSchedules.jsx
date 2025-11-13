import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerSchedules() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: player } = useQuery({
    queryKey: ['myPlayerProfile', user?.jugador_id],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.find(p => p.id === user?.jugador_id) || null;
    },
    enabled: !!user?.jugador_id,
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['mySchedules', player?.deporte],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    enabled: !!player?.deporte,
    select: (data) => data.filter(s => s.categoria === player?.deporte && s.activo),
  });

  const dayOrder = { "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4, "Viernes": 5 };
  const dayColors = {
    "Lunes": "from-blue-600 to-blue-700",
    "Martes": "from-green-600 to-green-700",
    "Miércoles": "from-orange-600 to-orange-700",
    "Jueves": "from-purple-600 to-purple-700",
    "Viernes": "from-pink-600 to-pink-700"
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mis Horarios</h1>
        <p className="text-slate-600 mt-1">Entrenamientos de {player?.deporte}</p>
      </div>

      {/* Info Card */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-orange-600 to-orange-700 text-white">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-orange-100 text-sm mb-1">📍 Ubicación</p>
              <p className="font-bold text-lg">
                Polideportivo Municipal de Bustarviejo
              </p>
              <a
                href="https://maps.google.com/?q=Polideportivo+Bustarviejo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-100 hover:text-white underline mt-1 inline-block"
              >
                Ver en Google Maps →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horarios */}
      {schedules && schedules.length > 0 ? (
        <div className="grid gap-4">
          {schedules.sort((a, b) => dayOrder[a.dia_semana] - dayOrder[b.dia_semana]).map((schedule) => (
            <Card key={schedule.id} className="border-none shadow-lg overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${dayColors[schedule.dia_semana]}`}></div>
              <CardContent className="py-6">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${dayColors[schedule.dia_semana]} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                    {schedule.dia_semana.substring(0, 1)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{schedule.dia_semana}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="font-semibold">
                          {schedule.hora_inicio} - {schedule.hora_fin}
                        </span>
                      </div>
                      {schedule.ubicacion && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-orange-600" />
                          <span className="text-sm">{schedule.ubicacion}</span>
                        </div>
                      )}
                      {schedule.notas && (
                        <p className="text-sm text-slate-500 mt-2 pl-6">{schedule.notas}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-none shadow-lg">
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay horarios disponibles</p>
            <p className="text-sm text-slate-400 mt-2">
              Los horarios se publicarán próximamente
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recordatorio */}
      <Card className="border-none shadow-lg bg-green-50 border-2 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">💪</span>
            </div>
            <div>
              <p className="font-bold text-green-900 mb-1">Recuerda</p>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ Llega 10 minutos antes del entrenamiento</li>
                <li>✅ Trae tu equipación completa</li>
                <li>✅ Hidratación y actitud positiva</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}