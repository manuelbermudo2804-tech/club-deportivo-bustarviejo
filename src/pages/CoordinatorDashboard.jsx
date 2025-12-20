import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  Calendar, 
  Trophy,
  MessageCircle,
  Sparkles,
  Bell,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StandingsWidget from "../components/standings/StandingsWidget";
import ContactCard from "../components/ContactCard";
import AlertCenter from "../components/dashboard/AlertCenter";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CoordinatorDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Fetch data
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
  });

  const { data: allStandings = [] } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Clasificacion.list(),
  });

  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations'],
    queryFn: () => base44.entities.CoordinatorConversation.list(),
  });

  const { data: allSurveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-created_date', 10),
  });

  const { data: allMatchObservations = [] } = useQuery({
    queryKey: ['matchObservations'],
    queryFn: () => base44.entities.MatchObservation.list(),
  });

  // Mensajes no leídos de familias
  const unreadFamilyMessages = useMemo(() => 
    coordinatorConversations.reduce((sum, conv) => sum + (conv.no_leidos_coordinador || 0), 0),
    [coordinatorConversations]
  );

  // Convocatorias pendientes de respuesta
  const pendingCallupResponses = useMemo(() => {
    let count = 0;
    allCallups.forEach(callup => {
      if (!callup.publicada || callup.cerrada) return;
      callup.jugadores_convocados?.forEach(j => {
        if (j.confirmacion === "pendiente") count++;
      });
    });
    return count;
  }, [allCallups]);

  // Observaciones post-partido pendientes
  const pendingMatchObservations = useMemo(() => {
    const now = new Date();
    return allCallups.filter(callup => {
      if (!callup.publicada || callup.cerrada) return false;
      const matchDate = new Date(callup.fecha_partido);
      if (matchDate > now) return false;
      
      if (callup.hora_partido) {
        const [hours, minutes] = callup.hora_partido.split(':').map(Number);
        const matchStart = new Date(matchDate);
        matchStart.setHours(hours, minutes, 0, 0);
        const matchEnd = new Date(matchStart.getTime() + 135 * 60000);
        if (now < matchEnd) return false;
      }
      
      const hasObservation = allMatchObservations.some(obs =>
        obs.categoria === callup.categoria &&
        obs.rival === callup.rival &&
        obs.fecha_partido === callup.fecha_partido
      );
      return !hasObservation;
    }).length;
  }, [allCallups, allMatchObservations]);

  // Encuestas activas
  const activeSurveys = useMemo(() => 
    allSurveys.filter(s => s.activa && new Date(s.fecha_fin) >= new Date()).length,
    [allSurveys]
  );

  // Stats globales
  const stats = useMemo(() => {
    const activePlayers = allPlayers.filter(p => p.activo === true);
    const categories = [...new Set(activePlayers.map(p => p.deporte))].filter(Boolean);
    
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingEvents = allEvents.filter(e => {
      const eventDate = new Date(e.fecha);
      return eventDate >= now && eventDate <= in7Days && e.publicado;
    });

    return {
      totalPlayers: activePlayers.length,
      categories: categories.length,
      upcomingEvents: upcomingEvents.length
    };
  }, [allPlayers, allEvents]);

  // Próximos eventos
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return allEvents
      .filter(e => new Date(e.fecha) >= now && e.publicado)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(0, 5);
  }, [allEvents]);

  // Próximas convocatorias
  const upcomingCallups = useMemo(() => {
    const now = new Date();
    return allCallups
      .filter(c => new Date(c.fecha_partido) >= now && c.publicada)
      .sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido))
      .slice(0, 5);
  }, [allCallups]);

  // Clasificaciones por categoría (última jornada)
  const standingsByCategory = useMemo(() => {
    const byCategory = {};
    allStandings.forEach(s => {
      if (!byCategory[s.categoria]) {
        byCategory[s.categoria] = [];
      }
      byCategory[s.categoria].push(s);
    });
    
    // Ordenar y obtener solo última jornada
    Object.keys(byCategory).forEach(cat => {
      const maxJornada = Math.max(...byCategory[cat].map(s => s.jornada));
      byCategory[cat] = byCategory[cat]
        .filter(s => s.jornada === maxJornada)
        .sort((a, b) => a.posicion - b.posicion)
        .slice(0, 5); // Top 5
    });
    
    return byCategory;
  }, [allStandings]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        
        {/* Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            🎓 Panel Coordinador Deportivo
          </h1>
          <p className="text-slate-400 text-sm lg:text-base">
            {user?.full_name} - Vista global del club
          </p>
        </div>

        {/* Banner de Chats - IDÉNTICO A PARENTDASHBOARD */}
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-900">💬 Mensajes</h3>
                <p className="text-xs text-purple-700">
                  {unreadFamilyMessages > 0 
                    ? `${unreadFamilyMessages} mensaje${unreadFamilyMessages > 1 ? 's' : ''} nuevo${unreadFamilyMessages > 1 ? 's' : ''}`
                    : 'Comunicación'}
                </p>
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

              <Link to={createPageUrl("FamilyChats")}>
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative">
                  {unreadFamilyMessages > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      <span className="text-white text-xs font-bold">{unreadFamilyMessages}</span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-center">💬 Familias</p>
                  <p className="text-xs text-green-100 text-center">Todas</p>
                </div>
              </Link>

              <Link to={createPageUrl("CoordinatorChat")}>
                <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg">
                  <p className="text-sm font-bold text-center">🏟️ Coordinador</p>
                  <p className="text-xs text-cyan-100 text-center">Mi chat</p>
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

        {/* AlertCenter - Alertas profesionales del coordinador */}
        <AlertCenter 
          pendingCallups={pendingCallupResponses}
          pendingSurveys={activeSurveys}
          pendingMatchObservations={pendingMatchObservations}
          upcomingEvents={upcomingEvents.length}
          isCoordinator={true}
        />

        {/* GRID DE BOTONES CENTRALES - MENÚ PRINCIPAL */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {/* Convocatorias */}
          <Link to={createPageUrl("CoachCallups")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-yellow-600 to-yellow-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <Bell className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">🎓 Convocatorias</h3>
              </div>
            </div>
          </Link>

          {/* Asistencia y Evaluación */}
          <Link to={createPageUrl("TeamAttendanceEvaluation")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-green-600 to-green-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <Users className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">📋 Asistencia y Evaluación</h3>
              </div>
            </div>
          </Link>

          {/* Plantillas */}
          <Link to={createPageUrl("TeamRosters")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-600 to-blue-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <Users className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">🎓 Plantillas</h3>
              </div>
            </div>
          </Link>

          {/* Reportes */}
          <Link to={createPageUrl("CoachEvaluationReports")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-600 to-purple-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <FileText className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">📊 Reportes</h3>
              </div>
            </div>
          </Link>

          {/* Pizarra Táctica */}
          <Link to={createPageUrl("TacticsBoard")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-slate-600 to-slate-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <Trophy className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">🎯 Pizarra Táctica</h3>
              </div>
            </div>
          </Link>

          {/* Calendario */}
          <Link to={createPageUrl("CalendarAndSchedules")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-600 to-purple-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <Calendar className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">📅 Calendario</h3>
              </div>
            </div>
          </Link>

          {/* Anuncios */}
          <Link to={createPageUrl("Announcements")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-pink-600 to-pink-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-pink-600 to-pink-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <Megaphone className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">📢 Anuncios</h3>
              </div>
            </div>
          </Link>

          {/* Eventos Club */}
          <Link to={createPageUrl("ParentEventRSVP")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-600 to-cyan-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <Calendar className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">🎉 Eventos Club</h3>
              </div>
            </div>
          </Link>

          {/* Galería */}
          <Link to={createPageUrl("Gallery")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-600 to-indigo-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <Image className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">🖼️ Galería</h3>
              </div>
            </div>
          </Link>
        </div>

        {/* Banner dividido: Clasificaciones (izq) + Calendario (der) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Clasificaciones del Club */}
          <Card className="border-2 border-green-300 bg-white shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-bold text-slate-900">🏆 Clasificaciones</h3>
                  <p className="text-xs text-slate-600">Top 5 por categoría</p>
                </div>
              </div>

              {Object.keys(standingsByCategory).length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {Object.entries(standingsByCategory).map(([categoria, standings]) => (
                    <div key={categoria}>
                      <StandingsWidget 
                        categoria={categoria}
                        compact={true}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">No hay clasificaciones</p>
              )}
            </CardContent>
          </Card>

          {/* Calendario Unificado */}
          <div className="space-y-4">
            {/* Próximos Eventos */}
            <Card className="border-2 border-orange-300 bg-white shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-6 h-6 text-orange-600" />
                  <h3 className="font-bold text-slate-900">📅 Próximos Eventos</h3>
                </div>

                {upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingEvents.map(event => (
                      <div key={event.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 text-sm">{event.titulo}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              📍 {event.destinatario_categoria || "Todos"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-orange-600">
                              {format(new Date(event.fecha), "d MMM", { locale: es })}
                            </p>
                            {event.hora && (
                              <p className="text-xs text-slate-500">{event.hora}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No hay eventos próximos</p>
                )}
              </CardContent>
            </Card>

            {/* Próximas Convocatorias */}
            <Card className="border-2 border-blue-300 bg-white shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-6 h-6 text-blue-600" />
                  <h3 className="font-bold text-slate-900">🎓 Convocatorias</h3>
                </div>

                {upcomingCallups.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingCallups.map(callup => (
                      <div key={callup.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 text-sm">{callup.titulo}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              📍 {callup.categoria}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-blue-600">
                              {format(new Date(callup.fecha_partido), "d MMM", { locale: es })}
                            </p>
                            {callup.hora_partido && (
                              <p className="text-xs text-slate-500">{callup.hora_partido}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No hay convocatorias</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-blue-500 mb-1">
                {stats.totalPlayers}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Jugadores Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-green-500 mb-1">
                {stats.categories}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Categorías</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-orange-500 mb-1">
                {stats.upcomingEvents}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Eventos 7 días</div>
            </div>
          </div>
        </div>

        <ContactCard />

      </div>
    </div>
  );
}