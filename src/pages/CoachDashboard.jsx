import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  Trophy,
  MessageCircle,
  Sparkles,
  Bell,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StandingsWidget from "../components/standings/StandingsWidget";
import NextMatchWidget from "../components/dashboard/NextMatchWidget";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CoachDashboard() {
  const [user, setUser] = useState(null);
  const [myCategories, setMyCategories] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setMyCategories(currentUser.categorias_entrena || []);
    };
    fetchUser();
  }, []);

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
  });

  const { data: allStandings = [] } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Clasificacion.list(),
  });

  const { data: allAttendances = [] } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const { data: allMatchObservations = [] } = useQuery({
    queryKey: ['matchObservations'],
    queryFn: () => base44.entities.MatchObservation.list(),
  });

  // Filtrar mis datos
  const myPlayers = useMemo(() => 
    allPlayers.filter(p => myCategories.includes(p.deporte) && p.activo),
    [allPlayers, myCategories]
  );

  const myCallups = useMemo(() => {
    const now = new Date();
    return allCallups.filter(c => 
      c.entrenador_email === user?.email && 
      c.publicada && 
      new Date(c.fecha_partido) >= now &&
      !c.cerrada
    );
  }, [allCallups, user?.email]);

  // Convocatorias pendientes de respuesta
  const pendingCallupResponses = useMemo(() => {
    let count = 0;
    myCallups.forEach(callup => {
      callup.jugadores_convocados?.forEach(jugador => {
        if (jugador.confirmacion === "pendiente") count++;
      });
    });
    return count;
  }, [myCallups]);

  // Observaciones post-partido pendientes
  const pendingMatchObservations = useMemo(() => {
    const now = new Date();
    return myCallups.filter(callup => {
      const matchDate = new Date(callup.fecha_partido);
      if (matchDate > now) return false;
      
      // Calcular fin estimado (2h + 15min)
      if (callup.hora_partido) {
        const [hours, minutes] = callup.hora_partido.split(':').map(Number);
        const matchStart = new Date(matchDate);
        matchStart.setHours(hours, minutes, 0, 0);
        const matchEnd = new Date(matchStart.getTime() + 135 * 60000);
        if (now < matchEnd) return false;
      }
      
      // Verificar si ya existe observación
      const hasObservation = allMatchObservations.some(obs =>
        obs.categoria === callup.categoria &&
        obs.rival === callup.rival &&
        obs.fecha_partido === callup.fecha_partido
      );
      return !hasObservation;
    }).length;
  }, [myCallups, allMatchObservations]);

  // Asistencia promedio
  const attendanceAverage = useMemo(() => {
    const myAttendances = allAttendances.filter(a => 
      myCategories.includes(a.categoria) && a.entrenador_email === user?.email
    );
    if (myAttendances.length === 0) return 0;
    
    const totalPresent = myAttendances.reduce((sum, att) => {
      return sum + att.asistencias.filter(a => a.estado === "presente").length;
    }, 0);
    const totalExpected = myAttendances.reduce((sum, att) => sum + att.asistencias.length, 0);
    
    return totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
  }, [allAttendances, myCategories, user?.email]);

  const stats = useMemo(() => ({
    myPlayers: myPlayers.length,
    pendingResponses: pendingCallupResponses,
    attendanceAvg: attendanceAverage,
    nextMatch: myCallups.length > 0 ? myCallups[0] : null
  }), [myPlayers, pendingCallupResponses, attendanceAverage, myCallups]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        
        {/* Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            🏃 Panel Entrenador
          </h1>
          <p className="text-slate-400 text-sm lg:text-base">
            {user?.full_name} {myCategories.length > 0 && `• ${myCategories.join(", ")}`}
          </p>
        </div>

        {/* Banner de Chats */}
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-900">💬 Mensajes</h3>
                <p className="text-xs text-purple-700">Comunicación</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Link to={createPageUrl("Chatbot")}>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold text-center">🤖 Asistente</p>
                  <p className="text-xs text-indigo-100 text-center">Consulta IA</p>
                </div>
              </Link>

              <Link to={createPageUrl("CoachParentChat")}>
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg">
                  <p className="text-sm font-bold text-center">💬 Familias</p>
                  <p className="text-xs text-green-100 text-center">Mi equipo</p>
                </div>
              </Link>

              <Link to={createPageUrl("CoordinatorChat")}>
                <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg">
                  <p className="text-sm font-bold text-center">🏟️ Coordinador</p>
                  <p className="text-xs text-cyan-100 text-center">Consultas</p>
                </div>
              </Link>

              <Link to={createPageUrl("StaffChat")}>
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg">
                  <p className="text-sm font-bold text-center">💼 Staff</p>
                  <p className="text-xs text-slate-100 text-center">Interno</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Alertas Entrenador */}
        {(pendingCallupResponses > 0 || pendingMatchObservations > 0) && (
          <Card className="border-2 border-red-300 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="font-bold text-red-900">⚠️ Alertas Importantes</h3>
              </div>
              
              <div className="space-y-2">
                {pendingCallupResponses > 0 && (
                  <Link to={createPageUrl("CoachCallups")}>
                    <div className="bg-white rounded-lg p-3 hover:bg-red-50 transition-all border border-red-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-5 h-5 text-red-600" />
                          <p className="font-semibold text-slate-900 text-sm">Convocatorias sin confirmar</p>
                        </div>
                        <Badge className="bg-red-500 text-white">{pendingCallupResponses}</Badge>
                      </div>
                    </div>
                  </Link>
                )}
                
                {pendingMatchObservations > 0 && (
                  <Link to={createPageUrl("CoachStandingsAnalysis")}>
                    <div className="bg-white rounded-lg p-3 hover:bg-orange-50 transition-all border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-orange-600" />
                          <p className="font-semibold text-slate-900 text-sm">Observaciones post-partido pendientes</p>
                        </div>
                        <Badge className="bg-orange-500 text-white">{pendingMatchObservations}</Badge>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner dividido: Clasificación + Próximo Partido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Clasificación de mi equipo */}
          {myCategories.length > 0 && (
            <Card className="border-2 border-green-300 bg-white shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="w-6 h-6 text-green-600" />
                  <h3 className="font-bold text-slate-900">🏆 Mi Clasificación</h3>
                </div>
                <StandingsWidget categoria={myCategories[0]} compact={true} />
              </CardContent>
            </Card>
          )}

          {/* Próximo Partido */}
          {myCategories.length > 0 && (
            <Card className="border-2 border-blue-300 bg-white shadow-lg">
              <CardContent className="p-4">
                <NextMatchWidget categoria={myCategories[0]} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Footer */}
        <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-blue-500 mb-1">
                {stats.myPlayers}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Mi Plantilla</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-green-500 mb-1">
                {stats.attendanceAvg}%
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Asistencia Media</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-yellow-500 mb-1">
                {stats.pendingResponses}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Respuestas Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-orange-500 mb-1">
                {stats.nextMatch ? format(new Date(stats.nextMatch.fecha_partido), "d MMM", { locale: es }) : "-"}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Próximo Partido</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}