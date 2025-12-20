import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Bell, CheckCircle2, BarChart3, Users, FileSignature, Calendar, 
  Megaphone, Image, FileText, BookOpen, Target, Clock, Trophy,
  MessageCircle, Sparkles, ShieldAlert, UserCircle, Heart
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AlertCenter from "../components/dashboard/AlertCenter";
import ContactCard from "../components/ContactCard";
import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";

export default function CoachDashboard() {
  const [user, setUser] = useState(null);
  const [myCategories, setMyCategories] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setMyCategories(currentUser?.categorias_entrena || []);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: callups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    enabled: !!user,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user,
  });

  const { data: matchObservations = [] } = useQuery({
    queryKey: ['matchObservations'],
    queryFn: () => base44.entities.MatchObservation.list(),
    enabled: !!user,
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list('-fecha'),
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const myCallups = callups.filter(c => 
      myCategories.includes(c.categoria) && c.publicada
    );
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingCallups = myCallups.filter(c => c.fecha_partido >= today && !c.cerrada);
    
    const pendingResponses = upcomingCallups.reduce((sum, c) => {
      return sum + (c.jugadores_convocados?.filter(j => j.confirmacion === "pendiente").length || 0);
    }, 0);

    // Partidos sin observación
    const now = new Date();
    const matchesNeedingObservation = myCallups.filter(c => {
      if (!c.publicada) return false;
      
      const matchDate = new Date(c.fecha_partido);
      if (matchDate > now) return false;
      
      if (c.hora_partido) {
        const [hours, minutes] = c.hora_partido.split(':').map(Number);
        const matchStart = new Date(matchDate);
        matchStart.setHours(hours, minutes, 0, 0);
        const matchEnd = new Date(matchStart.getTime() + 135 * 60000);
        if (now < matchEnd) return false;
      } else {
        const nextDay = new Date(matchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        if (now < nextDay) return false;
      }

      return !matchObservations.some(obs =>
        obs.categoria === c.categoria &&
        obs.rival === c.rival &&
        obs.fecha_partido === c.fecha_partido
      );
    }).length;

    // Mis jugadores (de MIS categorías)
    const myPlayers = players.filter(p => myCategories.includes(p.deporte) && p.activo);
    
    // Asistencia promedio últimos 5 entrenamientos
    const myRecentAttendances = attendances
      .filter(a => myCategories.includes(a.categoria))
      .slice(0, 5);
    
    const avgAttendance = myRecentAttendances.length > 0
      ? myRecentAttendances.reduce((sum, a) => {
          const present = a.asistencias?.filter(asist => asist.estado === "presente").length || 0;
          const total = a.asistencias?.length || 1;
          return sum + (present / total);
        }, 0) / myRecentAttendances.length
      : 0;

    return {
      upcomingMatches: upcomingCallups.length,
      pendingResponses,
      matchesNeedingObservation,
      myPlayers: myPlayers.length,
      avgAttendance: (avgAttendance * 100).toFixed(0)
    };
  }, [callups, myCategories, matchObservations, players, attendances]);

  // Próximo partido de MIS equipos
  const nextMatch = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return callups
      .filter(c => myCategories.includes(c.categoria) && c.publicada && c.fecha_partido >= today)
      .sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido))[0];
  }, [callups, myCategories]);

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        {/* Header con rol */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl lg:text-2xl font-bold">¡Hola, {user.full_name?.split(' ')[0]}!</h1>
              <p className="text-blue-100 text-sm">🏃 Entrenador</p>
              {myCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {myCategories.map(cat => (
                    <Badge key={cat} className="bg-white/20 text-white border-white/30 text-xs">
                      {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Banner Chats */}
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
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
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
                  <p className="text-sm font-bold text-center">⚽ Familias</p>
                  <p className="text-xs text-green-100 text-center">Chat padres</p>
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

        {/* Clasificaciones y Partidos - Widget compacto */}
        <ClassificationsAndMatchesBanner players={players.filter(p => myCategories.includes(p.deporte) && p.activo)} />

        {/* Alertas Urgentes */}
        {(stats.pendingResponses > 0 || stats.matchesNeedingObservation > 0) && (
          <div className="space-y-2">
            {stats.pendingResponses > 0 && (
              <Link to={createPageUrl("CoachCallups")}>
                <Card className="border-2 border-yellow-300 bg-yellow-50 hover:scale-105 transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Bell className="w-6 h-6 text-yellow-600 animate-pulse" />
                      <div className="flex-1">
                        <h3 className="font-bold text-yellow-900 text-sm">Respuestas Pendientes</h3>
                        <p className="text-xs text-yellow-700">{stats.pendingResponses} jugadores sin confirmar</p>
                      </div>
                      <Badge className="bg-yellow-600">{stats.pendingResponses}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {stats.matchesNeedingObservation > 0 && (
              <Link to={createPageUrl("CoachStandingsAnalysis")}>
                <Card className="border-2 border-red-300 bg-red-50 hover:scale-105 transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-6 h-6 text-red-600 animate-pulse" />
                      <div className="flex-1">
                        <h3 className="font-bold text-red-900 text-sm">Partidos sin Observación</h3>
                        <p className="text-xs text-red-700">{stats.matchesNeedingObservation} partido(s) requieren observación</p>
                      </div>
                      <Badge className="bg-red-600">{stats.matchesNeedingObservation}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}

        {/* Próximo partido */}
        {nextMatch && (
          <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-green-100 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-6 h-6 text-green-600" />
                <h3 className="font-bold text-green-900">⚽ Próximo Partido</h3>
              </div>
              <p className="font-bold text-slate-900">{nextMatch.titulo}</p>
              <p className="text-sm text-slate-600">vs {nextMatch.rival} • {nextMatch.local_visitante}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <Calendar className="w-3 h-3" />
                {new Date(nextMatch.fecha_partido).toLocaleDateString('es-ES')} • {nextMatch.hora_partido}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-3 text-center">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-700">{stats.myPlayers}</p>
              <p className="text-[10px] text-blue-600">Jugadores</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{stats.avgAttendance}%</p>
              <p className="text-[10px] text-green-600">Asistencia</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-3 text-center">
              <Trophy className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-700">{stats.upcomingMatches}</p>
              <p className="text-[10px] text-orange-600">Partidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Banner Hazte Socio */}
        <Link to={createPageUrl("ClubMembership")}>
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-2xl p-4 shadow-xl hover:scale-105 transition-all border-2 border-pink-400">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">🎉 ¡Hazte Socio!</p>
                <p className="text-pink-100 text-xs">Invita a familiares y amigos • Solo 25€/temporada</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Grid acciones principales */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          <Link to={createPageUrl("CoachCallups")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-yellow-600 to-yellow-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Bell className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🎓 Convocatorias</h3>
                {stats.pendingResponses > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                    <p className="text-white text-[10px] lg:text-xs font-semibold">
                      {stats.pendingResponses} respuestas
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("TeamAttendanceEvaluation")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-green-600 to-green-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <CheckCircle2 className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📋 Asistencia</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("CoachStandingsAnalysis")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-red-600 to-red-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <BarChart3 className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📊 Clasificaciones</h3>
                {stats.matchesNeedingObservation > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                    <p className="text-white text-[10px] lg:text-xs font-semibold">
                      {stats.matchesNeedingObservation} observaciones
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("TeamRosters")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-600 to-blue-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Users className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🎓 Plantillas</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("ExerciseLibrary")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-600 to-cyan-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <BookOpen className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📚 Ejercicios</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("TacticsBoard")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-600 to-purple-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Target className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🎯 Pizarra</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("CalendarAndSchedules")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-600 to-indigo-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Calendar className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📅 Calendario</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("Announcements")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-pink-600 to-pink-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-pink-600 to-pink-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Megaphone className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📢 Anuncios</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("Gallery")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-violet-600 to-violet-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Image className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🖼️ Galería</h3>
              </div>
            </div>
          </Link>
        </div>

        <ContactCard />
      </div>
    </div>
  );
}