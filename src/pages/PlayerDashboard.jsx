import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Trophy, CreditCard, Star, Award, MessageCircle, Calendar, 
  User, CheckCircle2, Clock, AlertCircle, ChevronRight,
  MapPin, Users, Megaphone, Image, FileText, Heart, Bell, Sparkles, ShieldAlert, Clover, Edit
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AchievementsBadges from "../components/dashboard/AchievementsBadges";
import AlertCenter from "../components/dashboard/AlertCenter";
import PlayerForm from "../components/players/PlayerForm";

export default function PlayerDashboard() {
  const [user, setUser] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        console.log('👤 [PlayerDashboard] Usuario cargado:', currentUser.email);
      } catch (error) {
        console.error("❌ [PlayerDashboard] Error fetching user:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, []);

  // Obtener ficha del jugador vinculada
  const { data: player, isLoading: loadingPlayer, error: playerError } = useQuery({
    queryKey: ['myPlayerProfile', user?.player_id, user?.email],
    queryFn: async () => {
      console.log('🔍 [PlayerDashboard] Buscando jugador para:', user?.email, 'player_id:', user?.player_id);
      
      try {
        const players = await base44.entities.Player.list();
        console.log('📋 [PlayerDashboard] Total de jugadores en BD:', players.length);
        
        let found = null;
        
        if (user?.player_id) {
          found = players.find(p => p.id === user.player_id);
          console.log('🔍 [PlayerDashboard] Búsqueda por player_id:', found ? `✅ ${found.nombre}` : '❌ No encontrado');
        }
        
        if (!found) {
          // Buscar por email en múltiples campos
          found = players.find(p => 
            (p.email_padre === user?.email || 
             p.email_tutor_2 === user?.email ||
             p.email_jugador === user?.email) && 
            p.activo === true
          );
          console.log('🔍 [PlayerDashboard] Búsqueda por email:', found ? `✅ ${found.nombre}` : '❌ No encontrado');
          
          // Si lo encontramos, actualizar el user con el player_id para futuras cargas
          if (found && !user.player_id) {
            console.log('🔗 [PlayerDashboard] Vinculando player_id al usuario');
            await base44.auth.updateMe({ player_id: found.id });
          }
        }
        
        if (!found) {
          console.log('❌ [PlayerDashboard] No se encontró jugador para:', user?.email);
        }
        
        return found || null;
      } catch (error) {
        console.error('❌ [PlayerDashboard] Error buscando jugador:', error);
        return null;
      }
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000, // 30 segundos
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
      return allPayments.filter(p => 
        p.jugador_id === player?.id && 
        p.is_deleted !== true
      );
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

  // Horarios de entrenamiento
  const { data: schedules } = useQuery({
    queryKey: ['playerSchedules', player?.deporte],
    queryFn: async () => {
      const allSchedules = await base44.entities.TrainingSchedule.list();
      return allSchedules.filter(s => 
        s.activo && 
        s.categoria === player?.deporte
      ).sort((a, b) => {
        const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
        return dias.indexOf(a.dia_semana) - dias.indexOf(b.dia_semana);
      });
    },
    enabled: !!player?.deporte,
    initialData: [],
  });

  // Configuración de temporada
  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    initialData: null,
  });

  // Conversación con admin (si existe)
  const { data: adminConversation } = useQuery({
    queryKey: ['playerAdminConversation', user?.email],
    queryFn: async () => {
      const convs = await base44.entities.AdminConversation.filter({ 
        padre_email: user?.email,
        resuelta: false
      });
      return convs[0] || null;
    },
    enabled: !!user?.email,
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
    pagados: (payments || []).filter(p => p.estado === "Pagado").length,
    pendientes: (payments || []).filter(p => p.estado === "Pendiente").length,
    enRevision: (payments || []).filter(p => p.estado === "En revisión").length,
  };

  // Calcular próxima convocatoria pendiente
  const pendingCallups = callups.filter(c => {
    const myConfirm = c.jugadores_convocados?.find(j => j.jugador_id === player?.id);
    return myConfirm?.confirmacion === "pendiente";
  });

  if (!user || loadingPlayer) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <User className="w-16 h-16 text-orange-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Completa tu Perfil de Jugador</h2>
              <p className="text-slate-600">
                Para acceder al panel de jugador, necesitas completar tu ficha de registro.
              </p>
            </div>
            {showCreateProfile ? (
              <PlayerForm
                player={null}
                onSubmit={async (playerData) => {
                  try {
                    console.log('📝 [PlayerDashboard] Creando perfil de jugador...');
                    const newPlayer = await base44.entities.Player.create({
                      ...playerData,
                      es_mayor_edad: true,
                      email_jugador: user.email,
                      email_padre: user.email,
                      acceso_jugador_autorizado: true,
                      activo: true,
                      tipo_inscripcion: "Nueva Inscripción"
                    });
                    
                    await base44.auth.updateMe({ player_id: newPlayer.id });
                    
                    toast.success("✅ Perfil creado correctamente");
                    queryClient.invalidateQueries({ queryKey: ['myPlayerProfile'] });
                    window.location.reload();
                  } catch (error) {
                    console.error('❌ Error creating player profile:', error);
                    toast.error("Error al crear el perfil");
                  }
                }}
                onCancel={() => setShowCreateProfile(false)}
                isPlayerSelfEdit={true}
              />
            ) : (
              <div className="text-center space-y-4">
                <Button 
                  onClick={() => setShowCreateProfile(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                  size="lg"
                >
                  Crear Mi Perfil
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = createPageUrl('Home')}
                >
                  Volver al inicio
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header con foto y datos del jugador */}
      <div className="bg-gradient-to-r from-orange-600 to-green-600 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
        <div className="flex items-start gap-3 lg:gap-4 mb-4">
          {player.foto_url ? (
            <img 
              src={player.foto_url} 
              alt={player.nombre}
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-full object-cover border-4 border-white shadow-lg flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-3xl font-bold truncate">¡Hola, {player.nombre.split(' ')[0]}!</h1>
            <p className="text-white/80 text-sm lg:text-base">{player.deporte}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className="bg-white/20 text-white border-white/30 text-xs">
                {player.posicion || "Sin posición"}
              </Badge>
              {player.lesionado && (
                <Badge className="bg-red-500 text-white text-xs">🤕 Lesionado</Badge>
              )}
              {player.sancionado && (
                <Badge className="bg-yellow-500 text-white text-xs">⚠️ Sancionado</Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEditProfile(true)}
            className="text-white hover:bg-white/20 flex-shrink-0"
          >
            <User className="w-4 h-4" />
          </Button>
        </div>

        {/* Horarios de Entrenamiento */}
        {schedules && schedules.length > 0 && (
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xs text-white/70 mb-2 font-semibold">📅 Horarios de Entrenamiento</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {schedules.map((schedule, idx) => (
                <div key={idx} className="bg-white/10 rounded-lg p-2">
                  <p className="text-sm font-bold">{schedule.dia_semana}</p>
                  <p className="text-xs text-white/80">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {schedule.hora_inicio} - {schedule.hora_fin}
                  </p>
                  {schedule.ubicacion && (
                    <p className="text-xs text-white/70 truncate">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {schedule.ubicacion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pestañas de Mensajería - Compactas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <Link to={createPageUrl("Chatbot")} className="group">
          <Card className="border-none shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="font-semibold text-slate-900 text-xs">Asistente</p>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("ParentCoordinatorChat")} className="group">
          <Card className="border-none shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-5 h-5 text-cyan-600" />
              </div>
              <p className="font-semibold text-slate-900 text-xs">Coordinador</p>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("ParentCoachChat")} className="group">
          <Card className="border-none shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-semibold text-slate-900 text-xs">Entrenador</p>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("ParentSystemMessages")} className="group">
          <Card className="border-none shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <p className="font-semibold text-slate-900 text-xs">Mensajes Club</p>
            </CardContent>
          </Card>
        </Link>

        {adminConversation && (
          <Link to={createPageUrl("ParentAdminChat")} className="group">
            <Card className="border-none shadow-md hover:shadow-lg transition-all border-2 border-red-300">
              <CardContent className="p-3 text-center">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
                </div>
                <p className="font-semibold text-slate-900 text-xs">Admin</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Centro de Alertas */}
      <AlertCenter 
        user={user}
        players={player ? [player] : []}
        isPlayer={true}
      />

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
            evaluations={[]}
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

        {seasonConfig?.loteria_navidad_abierta && (
          <Link to={createPageUrl("ParentLottery")} className="group">
            <div className="relative bg-gradient-to-br from-green-600 to-green-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
              <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
                <Clover className="w-12 h-12 text-white mb-3" />
                <h3 className="text-white font-bold text-center text-base">🍀 Lotería Navidad</h3>
                <Badge className="mt-2 bg-yellow-400 text-green-900">
                  Compra décimos
                </Badge>
              </div>
            </div>
          </Link>
        )}

        <Link to={createPageUrl("ClubMembership")} className="group">
          <div className="relative bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <div className="p-6 flex flex-col items-center justify-center min-h-[140px]">
              <Heart className="w-12 h-12 text-white mb-3" />
              <h3 className="text-white font-bold text-center text-base">🎫 Hacerse Socio</h3>
              <Badge className="mt-2 bg-white text-rose-600 text-xs">
                Solo 25€/temporada
              </Badge>
            </div>
          </div>
        </Link>
      </div>

      {/* Dialog Editar Perfil */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-600" />
              Editar Mi Perfil
            </DialogTitle>
          </DialogHeader>
          <PlayerForm
            player={player}
            onSubmit={async (data) => {
              try {
                await base44.entities.Player.update(player.id, data);
                toast.success("✅ Perfil actualizado correctamente");
                setShowEditProfile(false);
                window.location.reload();
              } catch (error) {
                toast.error("Error al actualizar el perfil");
              }
            }}
            onCancel={() => setShowEditProfile(false)}
            isPlayerSelfEdit={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}