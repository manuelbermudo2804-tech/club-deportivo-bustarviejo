import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Trophy, CreditCard, Star, Award, MessageCircle, Calendar, 
  User, CheckCircle2, Clock, AlertCircle, ChevronRight,
  MapPin, Users, Megaphone, Image, FileText, Heart, Bell, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AchievementsBadges from "../components/dashboard/AchievementsBadges";

export default function PlayerDashboard() {
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

  // Obtener ficha del jugador vinculada
  const { data: player, isLoading: loadingPlayer } = useQuery({
    queryKey: ['myPlayerProfile', user?.player_id],
    queryFn: async () => {
      if (user?.player_id) {
        const players = await base44.entities.Player.list();
        return players.find(p => p.id === user.player_id);
      }
      // Si no tiene player_id, buscar por email
      const players = await base44.entities.Player.list();
      return players.find(p => p.email_padre === user?.email && p.es_mayor_edad);
    },
    enabled: !!user,
  });

  // Convocatorias del jugador
  const { data: callups } = useQuery({
    queryKey: ['playerCallups', player?.id],
    queryFn: async () => {
      const allCallups = await base44.entities.Convocatoria.list('-fecha_partido');
      const today = new Date().toISOString().split('T')[0];
      return allCallups.filter(c => 
        c.publicada && 
        c.fecha_partido >= today &&
        c.jugadores_convocados?.some(j => j.jugador_id === player?.id)
      ).slice(0, 5);
    },
    enabled: !!player?.id,
    initialData: [],
  });

  // Pagos del jugador
  const { data: payments } = useQuery({
    queryKey: ['playerPayments', player?.id],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      return allPayments.filter(p => p.jugador_id === player?.id);
    },
    enabled: !!player?.id,
    initialData: [],
  });

  // Evaluaciones del jugador
  const { data: evaluations } = useQuery({
    queryKey: ['playerEvaluations', player?.id],
    queryFn: async () => {
      const allEvals = await base44.entities.PlayerEvaluation.list('-fecha_evaluacion');
      return allEvals.filter(e => e.jugador_id === player?.id && e.visible_para_padres).slice(0, 3);
    },
    enabled: !!player?.id,
    initialData: [],
  });

  // Asistencias para logros
  const { data: attendances } = useQuery({
    queryKey: ['playerAttendances'],
    queryFn: () => base44.entities.Attendance.list('-fecha'),
    initialData: [],
  });

  // Mensajes sin leer
  const { data: unreadMessages } = useQuery({
    queryKey: ['playerUnreadMessages', player?.deporte],
    queryFn: async () => {
      const messages = await base44.entities.ChatMessage.list('-created_date');
      return messages.filter(m => 
        m.tipo === "admin_a_grupo" && 
        (m.grupo_id === player?.deporte || m.deporte === player?.deporte) &&
        !m.leido
      ).slice(0, 5);
    },
    enabled: !!player?.deporte,
    initialData: [],
  });

  // Anuncios importantes
  const { data: announcements } = useQuery({
    queryKey: ['playerAnnouncements', player?.deporte],
    queryFn: async () => {
      const all = await base44.entities.Announcement.list('-created_date');
      const today = new Date().toISOString().split('T')[0];
      return all.filter(a => 
        a.publicado && 
        (!a.fecha_expiracion || a.fecha_expiracion >= today) &&
        (a.destinatarios_tipo === "Todos" || a.destinatarios_tipo === player?.deporte)
      ).slice(0, 3);
    },
    enabled: !!player,
    initialData: [],
  });

  // Calcular estadísticas de pagos
  const paymentStats = {
    pagados: payments.filter(p => p.estado === "Pagado").length,
    pendientes: payments.filter(p => p.estado === "Pendiente").length,
    enRevision: payments.filter(p => p.estado === "En revisión").length,
  };

  // Calcular próxima convocatoria pendiente
  const pendingCallups = callups.filter(c => {
    const myConfirm = c.jugadores_convocados?.find(j => j.jugador_id === player?.id);
    return myConfirm?.confirmacion === "pendiente";
  });

  if (loadingPlayer) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-500">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-6">
        <Card className="border-none shadow-lg bg-orange-50">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-orange-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Perfil no encontrado</h2>
            <p className="text-slate-600">
              No se encontró tu ficha de jugador vinculada. Contacta con el administrador del club.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header con foto y datos del jugador */}
      <div className="bg-gradient-to-r from-orange-600 to-green-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          {player.foto_url ? (
            <img 
              src={player.foto_url} 
              alt={player.nombre}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold">¡Hola, {player.nombre.split(' ')[0]}!</h1>
            <p className="text-white/80 mt-1">{player.deporte}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-white/30">
                {player.posicion || "Sin posición"}
              </Badge>
              {player.lesionado && (
                <Badge className="bg-red-500 text-white">🤕 Lesionado</Badge>
              )}
              {player.sancionado && (
                <Badge className="bg-yellow-500 text-white">⚠️ Sancionado</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas urgentes */}
      {pendingCallups.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50 shadow-lg animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900">¡Tienes {pendingCallups.length} convocatoria{pendingCallups.length > 1 ? 's' : ''} pendiente{pendingCallups.length > 1 ? 's' : ''}!</h3>
                <p className="text-sm text-red-700">Confirma tu asistencia lo antes posible</p>
              </div>
              <Link to={createPageUrl("ParentCallups")}>
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  Confirmar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        
        {/* Próximas Convocatorias */}
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <Trophy className="w-5 h-5 text-orange-600" />
                Próximos Partidos
              </span>
              <Link to={createPageUrl("ParentCallups")}>
                <Button variant="ghost" size="sm" className="text-orange-600">
                  Ver todos <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {callups.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No hay convocatorias próximas</p>
              </div>
            ) : (
              callups.map(callup => {
                const myConfirm = callup.jugadores_convocados?.find(j => j.jugador_id === player?.id);
                const confirmColors = {
                  pendiente: "bg-yellow-100 text-yellow-800",
                  asistire: "bg-green-100 text-green-800",
                  no_asistire: "bg-red-100 text-red-800",
                  duda: "bg-orange-100 text-orange-800"
                };
                const confirmLabels = {
                  pendiente: "⏳ Pendiente",
                  asistire: "✅ Confirmado",
                  no_asistire: "❌ No asiste",
                  duda: "❓ Duda"
                };
                
                return (
                  <div key={callup.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{callup.titulo}</p>
                        <p className="text-sm text-slate-600">
                          vs {callup.rival || "Rival"} • {callup.local_visitante}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(callup.fecha_partido), "EEEE d MMM", { locale: es })}
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          {callup.hora_partido}
                        </div>
                        {callup.ubicacion && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {callup.ubicacion}
                          </div>
                        )}
                      </div>
                      <Badge className={confirmColors[myConfirm?.confirmacion || "pendiente"]}>
                        {confirmLabels[myConfirm?.confirmacion || "pendiente"]}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Estado de Pagos */}
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-green-600" />
                Estado de Pagos
              </span>
              <Link to={createPageUrl("ParentPayments")}>
                <Button variant="ghost" size="sm" className="text-green-600">
                  Ver detalles <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-600">{paymentStats.pagados}</p>
                <p className="text-xs text-green-700">Pagados</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">{paymentStats.enRevision}</p>
                <p className="text-xs text-orange-700">En revisión</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
                <p className="text-2xl font-bold text-red-600">{paymentStats.pendientes}</p>
                <p className="text-xs text-red-700">Pendientes</p>
              </div>
            </div>
            
            {paymentStats.pendientes > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Tienes <strong>{paymentStats.pendientes}</strong> pago{paymentStats.pendientes > 1 ? 's' : ''} pendiente{paymentStats.pendientes > 1 ? 's' : ''}
                </p>
              </div>
            )}
            
            {paymentStats.pendientes === 0 && paymentStats.enRevision === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  ¡Todos los pagos al día! 🎉
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Evaluaciones */}
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-yellow-500" />
              Evaluaciones del Entrenador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {evaluations.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Star className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No hay evaluaciones disponibles</p>
              </div>
            ) : (
              evaluations.map(evaluation => (
                <div key={evaluation.id} className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">
                      {format(new Date(evaluation.fecha_evaluacion), "d MMM yyyy", { locale: es })}
                    </p>
                    <p className="text-xs text-slate-500">Por: {evaluation.entrenador_nombre}</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div>
                      <p className="font-bold text-lg text-blue-600">{evaluation.tecnica}</p>
                      <p className="text-slate-500">Técnica</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-600">{evaluation.tactica}</p>
                      <p className="text-slate-500">Táctica</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-orange-600">{evaluation.fisica}</p>
                      <p className="text-slate-500">Física</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-purple-600">{evaluation.actitud}</p>
                      <p className="text-slate-500">Actitud</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-pink-600">{evaluation.trabajo_equipo}</p>
                      <p className="text-slate-500">Equipo</p>
                    </div>
                  </div>
                  {evaluation.observaciones && (
                    <p className="text-sm text-slate-700 mt-2 pt-2 border-t border-yellow-200">
                      💬 {evaluation.observaciones}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Anuncios del Equipo */}
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 text-pink-600" />
                Anuncios del Equipo
              </span>
              <Link to={createPageUrl("Announcements")}>
                <Button variant="ghost" size="sm" className="text-pink-600">
                  Ver todos <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Megaphone className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No hay anuncios nuevos</p>
              </div>
            ) : (
              announcements.map(announcement => (
                <div key={announcement.id} className={`p-3 rounded-xl border ${
                  announcement.prioridad === "Urgente" ? "bg-red-50 border-red-200" :
                  announcement.prioridad === "Importante" ? "bg-orange-50 border-orange-200" :
                  "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {announcement.prioridad === "Urgente" ? "🚨" :
                       announcement.prioridad === "Importante" ? "⚠️" : "📢"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{announcement.titulo}</p>
                      <p className="text-sm text-slate-600 line-clamp-2">{announcement.contenido}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(announcement.created_date), "d MMM", { locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logros e Insignias */}
      <Card className="border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="w-5 h-5 text-purple-600" />
            Mis Logros e Insignias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AchievementsBadges 
            player={player} 
            attendances={attendances}
            evaluations={evaluations}
          />
        </CardContent>
      </Card>

      {/* Menu completo reflejado en botones grandes */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to={createPageUrl("Chatbot")} className="group">
          <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <MessageCircle className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">🤖 Asistente Virtual</h3>
            </div>
          </div>
        </Link>

        <Link to={createPageUrl("ParentCallups")} className="group">
          <div className="relative bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <Bell className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">🏆 Convocatorias</h3>
              {pendingCallups.length > 0 && (
                <Badge className="mt-2 bg-red-500 text-white animate-pulse">
                  {pendingCallups.length} pendientes
                </Badge>
              )}
            </div>
          </div>
        </Link>

        <Link to={createPageUrl("ParentPayments")} className="group">
          <div className="relative bg-gradient-to-br from-green-500 to-green-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <CreditCard className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">💳 Mis Pagos</h3>
              {paymentStats.pendientes > 0 && (
                <Badge className="mt-2 bg-red-500 text-white">
                  {paymentStats.pendientes} pendientes
                </Badge>
              )}
            </div>
          </div>
        </Link>



        <Link to={createPageUrl("CalendarAndSchedules")} className="group">
          <div className="relative bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <Calendar className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">📅 Calendario</h3>
            </div>
          </div>
        </Link>

        <Link to={createPageUrl("ParentEventRSVP")} className="group">
          <div className="relative bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <Calendar className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">🎉 Eventos Club</h3>
            </div>
          </div>
        </Link>

        <Link to={createPageUrl("Announcements")} className="group">
          <div className="relative bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <Megaphone className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">📢 Anuncios</h3>
            </div>
          </div>
        </Link>

        <Link to={createPageUrl("Gallery")} className="group">
          <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <Image className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">🖼️ Galería</h3>
            </div>
          </div>
        </Link>

        <Link to={createPageUrl("Surveys")} className="group">
          <div className="relative bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <FileText className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">📋 Encuestas</h3>
            </div>
          </div>
        </Link>

        <Link to={createPageUrl("ClubMembership")} className="group">
          <div className="relative bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <Heart className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">🎫 Hacerse Socio</h3>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}