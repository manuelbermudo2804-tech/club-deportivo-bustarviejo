import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DashboardButtonConfig from "../components/dashboard/DashboardButtonConfig";
import { useDashboardButtons } from "../components/dashboard/useDashboardButtons";
import { 
  Users, 
  Calendar, 
  Trophy,
  MessageCircle,
  Sparkles,
  Bell,
  AlertCircle,
  Image,
  FileText,
  Megaphone
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ContactCard from "../components/ContactCard";
import AlertCenter from "../components/dashboard/AlertCenter";
import SocialLinks from "../components/SocialLinks";
import CoordinatorClassificationsMatchesBanner from "../components/dashboard/CoordinatorClassificationsMatchesBanner";

export default function CoordinatorDashboard() {
  const [user, setUser] = useState(null);
  const [buttonConfig, setButtonConfig] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setButtonConfig(currentUser.dashboard_buttons_config || []);
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

  // Definir TODOS los botones disponibles (SIN chats) - basados en el menú lateral
  const availableButtons = React.useMemo(() => [
    // 6 PRINCIPALES por defecto
    { id: 'callups', label: '🎓 Convocatorias', description: 'Ver convocatorias', url: createPageUrl('CoachCallups'), icon: Bell, bgColor: 'bg-gradient-to-br from-yellow-600 to-yellow-700' },
    { id: 'attendance', label: '📋 Asistencia', description: 'Asistencia y evaluación', url: createPageUrl('TeamAttendanceEvaluation'), icon: CheckCircle2, bgColor: 'bg-gradient-to-br from-green-600 to-green-700' },
    { id: 'rosters', label: '🎓 Plantillas', description: 'Gestionar plantillas', url: createPageUrl('TeamRosters'), icon: Users, bgColor: 'bg-gradient-to-br from-blue-600 to-blue-700' },
    { id: 'reports', label: '📊 Reportes', description: 'Reportes entrenadores', url: createPageUrl('CoachEvaluationReports'), icon: Star, bgColor: 'bg-gradient-to-br from-purple-600 to-purple-700' },
    { id: 'tactics', label: '🎯 Pizarra', description: 'Pizarra táctica', url: createPageUrl('TacticsBoard'), icon: Trophy, bgColor: 'bg-gradient-to-br from-slate-600 to-slate-700' },
    { id: 'calendar', label: '📅 Calendario', description: 'Horarios y partidos', url: createPageUrl('CalendarAndSchedules'), icon: Calendar, bgColor: 'bg-gradient-to-br from-purple-600 to-purple-700' },
    // Resto
    { id: 'announcements', label: '📢 Anuncios', description: 'Comunicados del club', url: createPageUrl('Announcements'), icon: Megaphone, bgColor: 'bg-gradient-to-br from-pink-600 to-pink-700' },
    { id: 'events', label: '🎉 Eventos', description: 'Eventos del club', url: createPageUrl('ParentEventRSVP'), icon: Calendar, bgColor: 'bg-gradient-to-br from-cyan-600 to-cyan-700' },
    { id: 'gallery', label: '🖼️ Galería', description: 'Fotos y álbumes', url: createPageUrl('Gallery'), icon: Image, bgColor: 'bg-gradient-to-br from-indigo-600 to-indigo-700' },
    { id: 'surveys', label: '📋 Encuestas', description: 'Participar', url: createPageUrl('Surveys'), icon: FileText, bgColor: 'bg-gradient-to-br from-purple-600 to-purple-700' },
    { id: 'standings', label: '📊 Clasificaciones', description: 'Ver clasificaciones', url: createPageUrl('Clasificaciones'), icon: BarChart3, bgColor: 'bg-gradient-to-br from-blue-600 to-cyan-700' },
  ], []);

  // Aplicar configuración del usuario
  const displayedButtons = useDashboardButtons(availableButtons, buttonConfig);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />
        
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
            
            <div className="grid grid-cols-3 gap-2">
              <Link to={createPageUrl("Chatbot")} className="flex-1">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col justify-center">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold text-center mb-1">🤖 Asistente</p>
                  <p className="text-xs text-indigo-100 text-center">Consulta IA</p>
                </div>
              </Link>

              <Link to={createPageUrl("FamilyChats")} className="flex-1">
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col justify-center">
                  {unreadFamilyMessages > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      <span className="text-white text-xs font-bold">{unreadFamilyMessages}</span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-center mb-1">💬 Familias</p>
                  <p className="text-xs text-green-100 text-center">Coordinador + Entrenador</p>
                </div>
              </Link>

              <Link to={createPageUrl("StaffChat")} className="flex-1">
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                  <p className="text-sm font-bold text-center mb-1">💼 Staff</p>
                  <p className="text-xs text-slate-100 text-center">Interno</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Banner Clasificaciones + Partidos - Estilo ParentDashboard */}
        <CoordinatorClassificationsMatchesBanner />

        {/* AlertCenter - Alertas profesionales del coordinador */}
        <AlertCenter 
          pendingCallups={pendingCallupResponses}
          pendingSurveys={activeSurveys}
          pendingMatchObservations={pendingMatchObservations}
          upcomingEvents={upcomingEvents.length}
          isCoordinator={true}
        />

        {/* Botón Personalizar Dashboard */}
        <div className="flex justify-center">
          <DashboardButtonConfig
            availableButtons={availableButtons}
            currentConfig={buttonConfig}
            onSave={setButtonConfig}
          />
        </div>

        {/* GRID DE BOTONES CENTRALES - MENÚ PRINCIPAL */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {displayedButtons.map((button) => (
            <Link key={button.id} to={button.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${button.bgColor.replace('bg-gradient-to-br', '')} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl ${button.bgColor} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl`}>
                    <button.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg">{button.label}</h3>
                </div>
              </div>
            </Link>
          ))}
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