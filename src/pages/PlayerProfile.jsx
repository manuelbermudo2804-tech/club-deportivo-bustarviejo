import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, MapPin, Phone, Mail, Trophy, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerProfile() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: player, isLoading } = useQuery({
    queryKey: ['myPlayerProfile', user?.jugador_id],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.find(p => p.id === user?.jugador_id) || null;
    },
    enabled: !!user?.jugador_id,
  });

  const { data: schedules } = useQuery({
    queryKey: ['mySchedules', player?.deporte],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    enabled: !!player?.deporte,
    select: (data) => data.filter(s => s.categoria === player?.deporte && s.activo),
  });

  const sportEmojis = {
    "Fútbol Pre-Benjamín (Mixto)": "⚽",
    "Fútbol Benjamín (Mixto)": "⚽",
    "Fútbol Alevín (Mixto)": "⚽",
    "Fútbol Infantil (Mixto)": "⚽",
    "Fútbol Cadete": "⚽",
    "Fútbol Juvenil": "⚽",
    "Fútbol Aficionado": "⚽",
    "Fútbol Femenino": "⚽",
    "Baloncesto (Mixto)": "🏀"
  };

  const dayOrder = { "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4, "Viernes": 5 };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No se encontró tu perfil</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="text-slate-600 mt-1">Información de tu ficha de jugador</p>
      </div>

      {/* Card Principal */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-6">
            {player.foto_url ? (
              <img
                src={player.foto_url}
                alt={player.nombre}
                className="w-32 h-32 rounded-2xl object-cover border-4 border-orange-200 shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center border-4 border-orange-200 shadow-lg">
                <User className="w-16 h-16 text-white" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{player.nombre}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-orange-600 text-white text-base px-4 py-1">
                  <span className="mr-2">{sportEmojis[player.deporte]}</span>
                  {player.deporte}
                </Badge>
                {player.activo && (
                  <Badge className="bg-green-600 text-white">
                    Activo
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs text-slate-500">Fecha de Nacimiento</p>
                <p className="font-semibold text-slate-900">
                  {new Date(player.fecha_nacimiento).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Trophy className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs text-slate-500">Tipo de Inscripción</p>
                <p className="font-semibold text-slate-900">{player.tipo_inscripcion}</p>
              </div>
            </div>

            {player.telefono && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Phone className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-xs text-slate-500">Teléfono de Contacto</p>
                  <p className="font-semibold text-slate-900">{player.telefono}</p>
                </div>
              </div>
            )}

            {player.email_jugador && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Mail className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-xs text-slate-500">Mi Email</p>
                  <p className="font-semibold text-slate-900 text-sm">{player.email_jugador}</p>
                </div>
              </div>
            )}
          </div>

          {player.direccion && (
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Dirección</p>
                <p className="font-semibold text-slate-900">{player.direccion}</p>
              </div>
            </div>
          )}

          {player.observaciones && (
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <p className="text-sm text-slate-700">{player.observaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horarios de Entrenamiento */}
      {schedules && schedules.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-orange-600" />
              Mis Horarios de Entrenamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedules.sort((a, b) => dayOrder[a.dia_semana] - dayOrder[b.dia_semana]).map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold shadow-lg">
                      {schedule.dia_semana.substring(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{schedule.dia_semana}</p>
                      <p className="text-sm text-slate-600">
                        {schedule.hora_inicio} - {schedule.hora_fin}
                      </p>
                      {schedule.ubicacion && (
                        <p className="text-xs text-slate-500 mt-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {schedule.ubicacion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-green-800 leading-relaxed">
              <strong>¡Sigue trabajando duro!</strong><br />
              Cada entrenamiento te acerca más a tus objetivos. 💪⚽
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}