import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  MessageCircle, Users, Calendar, BarChart3, ShieldAlert, FileText,
  Sparkles, Trophy, CheckCircle2, Target, Image, Megaphone, Heart,
  Award, Bell, UserCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ContactCard from "../components/ContactCard";
import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";

export default function CoordinatorDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations'],
    queryFn: () => base44.entities.CoordinatorConversation.list(),
    enabled: !!user,
  });

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

  const stats = useMemo(() => {
    const unreadChats = coordinatorConversations.filter(c => !c.resuelta && c.no_leidos_coordinador > 0).length;
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingMatches = callups.filter(c => c.publicada && c.fecha_partido >= today && !c.cerrada).length;
    
    // Partidos sin observación (TODOS los equipos)
    const now = new Date();
    const matchesNeedingObservation = callups.filter(c => {
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

    const activePlayers = players.filter(p => p.activo).length;
    
    const categoriesCount = [...new Set(players.filter(p => p.activo).map(p => p.deporte))].length;

    return {
      unreadChats,
      upcomingMatches,
      matchesNeedingObservation,
      activePlayers,
      categoriesCount
    };
  }, [coordinatorConversations, callups, players, matchObservations]);

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
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl lg:text-2xl font-bold">¡Hola, {user.full_name?.split(' ')[0]}!</h1>
              <p className="text-cyan-100 text-sm">🎓 Coordinador Deportivo</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {stats.categoriesCount} Categorías
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {stats.activePlayers} Jugadores
                </Badge>
              </div>
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
            
            <div className="grid grid-cols-3 gap-2">
              <Link to={createPageUrl("Chatbot")}>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold text-center">🤖 Asistente</p>
                  <p className="text-xs text-indigo-100 text-center">Consulta IA</p>
                </div>
              </Link>

              <Link to={createPageUrl("CoordinatorChat")}>
                <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative">
                  {stats.unreadChats > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      <span className="text-white text-xs font-bold">{stats.unreadChats}</span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-center">🏟️ Coordinador</p>
                  <p className="text-xs text-cyan-100 text-center">Familias</p>
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

        {/* Clasificaciones y Partidos */}
        <ClassificationsAndMatchesBanner players={players.filter(p => p.activo)} />

        {/* Alertas */}
        {(stats.unreadChats > 0 || stats.matchesNeedingObservation > 0) && (
          <div className="space-y-2">
            {stats.unreadChats > 0 && (
              <Link to={createPageUrl("FamilyChats")}>
                <Card className="border-2 border-red-300 bg-red-50 hover:scale-105 transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-6 h-6 text-red-600 animate-pulse" />
                      <div className="flex-1">
                        <h3 className="font-bold text-red-900 text-sm">Chats Sin Resolver</h3>
                        <p className="text-xs text-red-700">{stats.unreadChats} conversaciones requieren atención</p>
                      </div>
                      <Badge className="bg-red-600">{stats.unreadChats}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {stats.matchesNeedingObservation > 0 && (
              <Link to={createPageUrl("CoachStandingsAnalysis")}>
                <Card className="border-2 border-yellow-300 bg-yellow-50 hover:scale-105 transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-6 h-6 text-yellow-600 animate-pulse" />
                      <div className="flex-1">
                        <h3 className="font-bold text-yellow-900 text-sm">Partidos sin Observar</h3>
                        <p className="text-xs text-yellow-700">{stats.matchesNeedingObservation} partido(s) sin observación</p>
                      </div>
                      <Badge className="bg-yellow-600">{stats.matchesNeedingObservation}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-3 text-center">
              <Trophy className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-700">{stats.categoriesCount}</p>
              <p className="text-[10px] text-orange-600">Categorías</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-3 text-center">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-700">{stats.activePlayers}</p>
              <p className="text-[10px] text-blue-600">Jugadores</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-3 text-center">
              <Bell className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{stats.upcomingMatches}</p>
              <p className="text-[10px] text-green-600">Partidos</p>
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
          <Link to={createPageUrl("FamilyChats")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-green-600 to-green-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <MessageCircle className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">💬 Chats Familias</h3>
                {stats.unreadChats > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                    <p className="text-white text-[10px] lg:text-xs font-semibold">
                      {stats.unreadChats} sin leer
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("CoachStandingsAnalysis")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-600 to-purple-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
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

          <Link to={createPageUrl("CoachCallups")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-yellow-600 to-yellow-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Bell className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🎓 Convocatorias</h3>
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

          <Link to={createPageUrl("EventManagement")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-600 to-indigo-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Calendar className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🎉 Eventos</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("CoachEvaluationReports")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-600 to-blue-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Award className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📊 Reportes</h3>
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

          <Link to={createPageUrl("Surveys")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-red-600 to-red-700 opacity-30 blur-2xl group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <FileText className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📋 Encuestas</h3>
              </div>
            </div>
          </Link>
        </div>

        <ContactCard />
      </div>
    </div>
  );
}