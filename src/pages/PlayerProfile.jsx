import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, MapPin, Phone, Mail, Trophy, Clock, TrendingUp, Target, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PlayerProfile() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: player, isLoading } = useQuery({
    queryKey: ['myPlayerProfile', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.find(p => p.email_jugador === user?.email) || null;
    },
    enabled: !!user?.email,
  });

  const { data: schedules } = useQuery({
    queryKey: ['mySchedules', player?.deporte],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    enabled: !!player?.deporte,
    select: (data) => data.filter(s => s.categoria === player?.deporte && s.activo),
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list('-fecha_evaluacion'),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
  });

  const myEvaluations = player ? evaluations.filter(e => 
    e.jugador_id === player.id && e.visible_para_padres
  ) : [];

  const myAttendances = player ? attendances.filter(att => 
    att.asistencias.some(a => a.jugador_id === player.id)
  ) : [];

  const myCallups = player ? callups.filter(c => 
    c.jugadores_convocados?.some(j => j.jugador_id === player.id)
  ) : [];

  // Calculate attendance stats
  let presente = 0, ausente = 0, justificado = 0;
  myAttendances.forEach(att => {
    const record = att.asistencias.find(a => a.jugador_id === player?.id);
    if (record) {
      if (record.estado === "presente") presente++;
      else if (record.estado === "ausente") ausente++;
      else if (record.estado === "justificado") justificado++;
    }
  });

  const totalAttendances = presente + ausente + justificado;
  const attendancePercentage = totalAttendances > 0 ? ((presente / totalAttendances) * 100).toFixed(0) : 0;

  // Evaluation trends
  const evaluationTrend = myEvaluations.slice(0, 6).reverse().map(e => ({
    fecha: format(new Date(e.fecha_evaluacion), "dd/MM", { locale: es }),
    Promedio: ((e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5).toFixed(1),
    Técnica: e.tecnica,
    Táctica: e.tactica,
    Física: e.fisica,
    Actitud: e.actitud,
    Equipo: e.trabajo_equipo
  }));

  // Latest evaluation radar
  const latestEval = myEvaluations[0];
  const radarData = latestEval ? [
    { skill: "Técnica", value: latestEval.tecnica },
    { skill: "Táctica", value: latestEval.tactica },
    { skill: "Física", value: latestEval.fisica },
    { skill: "Actitud", value: latestEval.actitud },
    { skill: "Equipo", value: latestEval.trabajo_equipo }
  ] : [];

  // Monthly attendance data
  const monthlyAttendance = {};
  myAttendances.forEach(att => {
    const month = att.fecha.substring(0, 7);
    if (!monthlyAttendance[month]) {
      monthlyAttendance[month] = { presente: 0, ausente: 0, justificado: 0 };
    }
    const record = att.asistencias.find(a => a.jugador_id === player?.id);
    if (record) {
      if (record.estado === "presente") monthlyAttendance[month].presente++;
      else if (record.estado === "ausente") monthlyAttendance[month].ausente++;
      else if (record.estado === "justificado") monthlyAttendance[month].justificado++;
    }
  });

  const attendanceChartData = Object.keys(monthlyAttendance).slice(-6).map(month => ({
    mes: month.substring(5),
    Presente: monthlyAttendance[month].presente,
    Ausente: monthlyAttendance[month].ausente,
    Justificado: monthlyAttendance[month].justificado
  }));

  // Callup stats
  const confirmedCallups = myCallups.filter(c => {
    const myConfirmation = c.jugadores_convocados?.find(j => j.jugador_id === player?.id);
    return myConfirmation?.confirmacion === "asistire";
  }).length;

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
        <p className="text-slate-600 mt-1">Estadísticas y progreso</p>
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
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
            <div className="text-3xl font-bold text-green-900">{attendancePercentage}%</div>
            <div className="text-sm text-green-700">Asistencia</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <Target className="w-8 h-8 text-blue-600 mb-2" />
            <div className="text-3xl font-bold text-blue-900">{presente}</div>
            <div className="text-sm text-blue-700">Entrenamientos</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <Award className="w-8 h-8 text-purple-600 mb-2" />
            <div className="text-3xl font-bold text-purple-900">{myEvaluations.length}</div>
            <div className="text-sm text-purple-700">Evaluaciones</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <Trophy className="w-8 h-8 text-orange-600 mb-2" />
            <div className="text-3xl font-bold text-orange-900">{confirmedCallups}</div>
            <div className="text-sm text-orange-700">Convocatorias</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evaluation Trend */}
        {evaluationTrend.length > 0 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">📈 Evolución de Evaluaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evaluationTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" style={{ fontSize: '12px' }} />
                  <YAxis domain={[0, 5]} style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Promedio" stroke="#f97316" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Radar Chart - Latest Evaluation */}
        {radarData.length > 0 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">⭐ Última Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis domain={[0, 5]} style={{ fontSize: '10px' }} />
                  <Radar name="Habilidades" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Attendance Chart */}
      {attendanceChartData.length > 0 && (
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">📊 Asistencia Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Presente" fill="#16a34a" />
                <Bar dataKey="Ausente" fill="#dc2626" />
                <Bar dataKey="Justificado" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}