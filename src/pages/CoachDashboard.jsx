import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DashboardButtonConfig from "../components/dashboard/DashboardButtonConfig";
import { useDashboardButtons } from "../components/dashboard/useDashboardButtons";
import { 
  Users, 
  Trophy,
  MessageCircle,
  Sparkles,
  Bell,
  AlertCircle,
  TrendingUp,
  Image,
  FileText,
  Calendar,
  Megaphone
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ContactCard from "../components/ContactCard";
import AlertCenter from "../components/dashboard/AlertCenter";
import SocialLinks from "../components/SocialLinks";
import CoachClassificationsMatchesBanner from "../components/dashboard/CoachClassificationsMatchesBanner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CoachDashboard() {
  const [user, setUser] = useState(null);
  const [myCategories, setMyCategories] = useState([]);
  const [buttonConfig, setButtonConfig] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setMyCategories(currentUser.categorias_entrena || []);
      setButtonConfig(currentUser.dashboard_buttons_config || []);
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

  // Definir TODOS los botones disponibles (SIN chats) - en useMemo
  const availableButtons = React.useMemo(() => [
    { id: 'callups', label: '🎓 Convocatorias', description: 'Gestionar convocatorias', url: createPageUrl('CoachCallups'), icon: Bell, bgColor: 'bg-gradient-to-br from-yellow-600 to-yellow-700' },
    { id: 'attendance', label: '📋 Asistencia', description: 'Asistencia y evaluación', url: createPageUrl('TeamAttendanceEvaluation'), icon: Users, bgColor: 'bg-gradient-to-br from-green-600 to-green-700' },
    { id: 'rosters', label: '🎓 Plantillas', description: 'Gestionar plantillas', url: createPageUrl('TeamRosters'), icon: Users, bgColor: 'bg-gradient-to-br from-blue-600 to-blue-700' },
    { id: 'reports', label: '📊 Reportes', description: 'Reportes y estadísticas', url: createPageUrl('CoachEvaluationReports'), icon: FileText, bgColor: 'bg-gradient-to-br from-purple-600 to-purple-700' },
    { id: 'exercises', label: '📚 Ejercicios', description: 'Biblioteca de ejercicios', url: createPageUrl('ExerciseLibrary'), icon: FileText, bgColor: 'bg-gradient-to-br from-cyan-600 to-cyan-700' },
    { id: 'announcements', label: '📢 Anuncios', description: 'Comunicados del club', url: createPageUrl('Announcements'), icon: Megaphone, bgColor: 'bg-gradient-to-br from-pink-600 to-pink-700' },
    { id: 'gallery', label: '🖼️ Galería', description: 'Fotos y álbumes', url: createPageUrl('Gallery'), icon: Image, bgColor: 'bg-gradient-to-br from-indigo-600 to-indigo-700' },
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

        {/* Banner Clasificaciones + Partidos - Estilo ParentDashboard */}
        <CoachClassificationsMatchesBanner myCategories={myCategories} />

        {/* AlertCenter - Alertas del entrenador */}
        <AlertCenter 
          pendingCallups={pendingCallupResponses}
          pendingMatchObservations={pendingMatchObservations}
          isCoach={true}
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

          {/* Biblioteca Ejercicios */}
          <Link to={createPageUrl("ExerciseLibrary")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-600 to-cyan-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl">
                  <FileText className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg">📚 Biblioteca Ejercicios</h3>
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

        <ContactCard />

      </div>
    </div>
  );
}