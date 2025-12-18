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
  MapPin, Users, Megaphone, Image, FileText, Heart, Bell, Sparkles, ShieldAlert, Clover, Edit, FileSignature, ShoppingBag
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AchievementsBadges from "../components/dashboard/AchievementsBadges";
import AlertCenter from "../components/dashboard/AlertCenter";
import PlayerForm from "../components/players/PlayerForm";
import InscriptionPaymentFlow from "../components/inscriptions/InscriptionPaymentFlow";
import InscriptionSuccessScreen from "../components/inscriptions/InscriptionSuccessScreen";
import ContactCard from "../components/ContactCard";

export default function PlayerDashboard() {
  const [user, setUser] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [pendingPlayerData, setPendingPlayerData] = useState(null);
  const [showInscriptionSuccess, setShowInscriptionSuccess] = useState(false);
  const [inscriptionSuccessData, setInscriptionSuccessData] = useState(null);
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

  // Configuración de categorías
  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 300000,
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

  // Compañeros de equipo
  const { data: teammates = [] } = useQuery({
    queryKey: ['teammates', player?.deporte],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.deporte === player?.deporte && 
        p.activo === true &&
        p.id !== player?.id
      ).slice(0, 12);
    },
    enabled: !!player?.deporte,
    initialData: [],
  });

  // Pedidos de ropa del jugador
  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['playerClothingOrders', player?.id],
    queryFn: async () => {
      const orders = await base44.entities.ClothingOrder.list('-created_date');
      return orders.filter(o => o.jugador_id === player?.id);
    },
    enabled: !!player?.id,
    initialData: [],
  });

  // Evaluaciones del jugador
  const { data: evaluations = [] } = useQuery({
    queryKey: ['playerEvaluations', player?.id],
    queryFn: async () => {
      const evals = await base44.entities.PlayerEvaluation.list('-fecha_evaluacion');
      return evals.filter(e => e.jugador_id === player?.id);
    },
    enabled: !!player?.id,
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

  // Calcular firmas pendientes
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  let pendingSignatures = 0;
  if (player?.enlace_firma_jugador && !player?.firma_jugador_completada) pendingSignatures++;
  const esMayorDeEdad = calcularEdad(player?.fecha_nacimiento) >= 18;
  if (player?.enlace_firma_tutor && !player?.firma_tutor_completada && !esMayorDeEdad) pendingSignatures++;

  // Próximo partido (convocatoria más cercana)
  const nextMatch = callups.length > 0 ? callups[0] : null;

  // Calcular racha de asistencias
  const myAttendances = attendances.filter(a => 
    a.categoria === player?.deporte &&
    a.asistencias?.some(asist => asist.jugador_id === player?.id && asist.estado === "presente")
  );
  const attendanceStreak = myAttendances.slice(0, 10).length; // Últimas 10 asistencias

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

  // Flujo de pago para nueva inscripción de jugador +18
  if (showPaymentFlow && pendingPlayerData) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
        <div className="max-w-2xl w-full my-8">
          <InscriptionPaymentFlow
            playerData={pendingPlayerData}
            seasonConfig={seasonConfig}
            categoryConfigs={categoryConfigs}
            descuentoHermano={0}
            onContinue={async (paymentsData) => {
              try {
                console.log('📝 [PlayerDashboard] Creando perfil de jugador con pagos...');
                const newPlayer = await base44.entities.Player.create(pendingPlayerData);
                
                // Crear pagos
                if (paymentsData?.payments) {
                  for (const payment of paymentsData.payments) {
                    await base44.entities.Payment.create({
                      ...payment,
                      jugador_id: newPlayer.id,
                      jugador_nombre: newPlayer.nombre
                    });
                  }
                }
                
                await base44.auth.updateMe({ player_id: newPlayer.id });
                
                // Mostrar pantalla de éxito
                setInscriptionSuccessData({
                  player: newPlayer,
                  tipoPago: paymentsData.tipoPago,
                  cuotasGeneradas: paymentsData.payments,
                  descuentoHermano: 0
                });
                setShowPaymentFlow(false);
                setShowInscriptionSuccess(true);
              } catch (error) {
                console.error('❌ Error creating player profile:', error);
                toast.error("Error al crear el perfil");
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Pantalla de éxito inscripción
  if (showInscriptionSuccess && inscriptionSuccessData) {
    return (
      <InscriptionSuccessScreen
        player={inscriptionSuccessData.player}
        tipoPago={inscriptionSuccessData.tipoPago}
        cuotasGeneradas={inscriptionSuccessData.cuotasGeneradas}
        descuentoHermano={0}
        onClose={() => {
          setShowInscriptionSuccess(false);
          window.location.reload();
        }}
      />
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
            {showCreateProfile && !showPaymentFlow ? (
              <PlayerForm
                player={null}
                onSubmit={(playerData) => {
                  // Guardar datos y mostrar flujo de pago
                  setPendingPlayerData({
                    ...playerData,
                    es_mayor_edad: true,
                    email_jugador: user.email,
                    email_padre: user.email,
                    acceso_jugador_autorizado: true,
                    activo: true,
                    tipo_inscripcion: "Nueva Inscripción",
                    tiene_descuento_hermano: false,
                    descuento_aplicado: 0,
                    _descuentoCalculado: 0
                  });
                  setShowCreateProfile(false);
                  setShowPaymentFlow(true);
                }}
                onCancel={() => setShowCreateProfile(false)}
                isAdultPlayerSelfRegistration={true}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        {/* Header con foto y datos del jugador - similar a la imagen */}
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
              <h1 className="text-xl lg:text-3xl font-bold">¡Hola, {player.nombre.split(' ')[0]}!</h1>
              <p className="text-white/90 text-sm lg:text-base">{player.deporte}</p>
              {player.posicion && player.posicion !== "Sin asignar" && (
                <Badge className="bg-white/20 text-white border-white/30 text-xs mt-2">
                  {player.posicion}
                </Badge>
              )}
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
              <p className="text-xs text-white/80 mb-2 font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Horarios de Entrenamiento
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {schedules.map((schedule, idx) => (
                  <div key={idx} className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <p className="text-sm font-bold">{schedule.dia_semana}</p>
                    <p className="text-xs text-white/80 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {schedule.hora_inicio} - {schedule.hora_fin}
                    </p>
                    {schedule.ubicacion && (
                      <p className="text-xs text-white/70 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {schedule.ubicacion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Banner de Chats */}
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-900">💬 Mensajes</h3>
                <p className="text-xs text-purple-700">Chats con el club</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Link to={createPageUrl("Chatbot")} className="relative flex-1">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold mb-1 text-center">🤖 Asistente</p>
                  <p className="text-xs text-indigo-100 leading-tight text-center">Consulta IA</p>
                </div>
              </Link>

              <Link to={createPageUrl("ParentSystemMessages")} className="relative flex-1">
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                  <p className="text-sm font-bold mb-1 text-center">🔔 Mensajes</p>
                  <p className="text-xs text-purple-100 leading-tight text-center">Del Club</p>
                </div>
              </Link>

              <Link to={createPageUrl("ParentCoordinatorChat")} className="relative flex-1">
                <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                  <p className="text-sm font-bold mb-1 text-center">🏟️ Coordinador</p>
                  <p className="text-xs text-cyan-100 leading-tight text-center">Deportivo</p>
                </div>
              </Link>
              
              <Link to={createPageUrl("ParentCoachChat")} className="relative flex-1">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                  <p className="text-sm font-bold mb-1 text-center">⚽ Entrenador</p>
                  <p className="text-xs text-blue-100 leading-tight text-center">Mi equipo</p>
                </div>
              </Link>
            </div>

            {adminConversation && (
              <Link to={createPageUrl("ParentAdminChat")} className="mt-2 block">
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg">
                  <p className="text-sm font-bold text-center">🛡️ Chat Administrador (Activo)</p>
                </div>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Logros e Insignias - Movido arriba */}
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-900">🏆 Mis Logros</h3>
                <p className="text-xs text-purple-700">
                  {attendanceStreak > 0 ? `🔥 Racha: ${attendanceStreak} asistencias` : 'Sigue entrenando'}
                </p>
              </div>
            </div>
            <AchievementsBadges 
              player={player} 
              attendances={attendances}
              evaluations={evaluations}
            />
          </CardContent>
        </Card>

        {/* Countdown al próximo partido */}
        {nextMatch && (
          <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 mb-1">⏰ Próximo Partido</h3>
                  <p className="text-sm font-bold text-slate-900">{nextMatch.titulo}</p>
                  <p className="text-xs text-slate-600">vs {nextMatch.rival} • {nextMatch.local_visitante}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(nextMatch.fecha_partido), "EEEE d MMM", { locale: es })} • {nextMatch.hora_partido}
                  </div>
                  {nextMatch.ubicacion && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {nextMatch.ubicacion}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mi Equipo - Compañeros */}
        {teammates.length > 0 && (
          <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900">👥 Mi Equipo</h3>
                  <p className="text-xs text-blue-700">{teammates.length} compañeros en {player.deporte}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-6 gap-2">
                {teammates.slice(0, 12).map(teammate => (
                  <div key={teammate.id} className="text-center">
                    {teammate.foto_url ? (
                      <img 
                        src={teammate.foto_url} 
                        alt={teammate.nombre}
                        className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-blue-400 mx-auto mb-1"
                      />
                    ) : (
                      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-blue-200 flex items-center justify-center mx-auto mb-1">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <p className="text-[8px] lg:text-[10px] text-slate-700 font-medium truncate">
                      {teammate.nombre.split(' ')[0]}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alertas Importantes */}
        {(pendingSignatures > 0 || pendingCallups.length > 0) && (
          <div className="space-y-2">
            {pendingSignatures > 0 && (
              <Link to={createPageUrl("FederationSignatures")}>
                <Card className="border-2 border-red-300 bg-red-50 shadow-lg hover:scale-105 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <FileSignature className="w-6 h-6 text-red-600 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-red-900">¡Firmas Pendientes!</h3>
                        <p className="text-sm text-red-700">{pendingSignatures} firma{pendingSignatures > 1 ? 's' : ''} de federación pendiente{pendingSignatures > 1 ? 's' : ''}</p>
                      </div>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        Firmar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {pendingCallups.length > 0 && (
              <Link to={createPageUrl("ParentCallups")}>
                <Card className="border-2 border-yellow-300 bg-yellow-50 shadow-lg hover:scale-105 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Bell className="w-6 h-6 text-yellow-600 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-yellow-900">¡Convocatorias Pendientes!</h3>
                        <p className="text-sm text-yellow-700">{pendingCallups.length} confirmación{pendingCallups.length > 1 ? 'es' : ''} pendiente{pendingCallups.length > 1 ? 's' : ''}</p>
                      </div>
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                        Confirmar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}

        {/* Centro de Alertas */}
        <AlertCenter 
          pendingCallups={pendingCallups.length}
          pendingSignatures={pendingSignatures}
          pendingPayments={payments.filter(p => p.estado === "Pendiente").length}
          paymentsInReview={payments.filter(p => p.estado === "En revisión").length}
          unreadCoordinatorMessages={0}
          unreadCoachMessages={0}
          unreadPrivateMessages={0}
          hasActiveAdminChat={!!adminConversation}
          isParent={true}
          userEmail={user?.email}
          userSports={player?.deporte ? [player.deporte] : []}
        />

        {/* Banner Hazte Socio */}
        <Link to={createPageUrl("ClubMembership")}>
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-pink-400">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold text-lg">🎉 ¡Hazte Socio!</p>
                <p className="text-pink-100 text-xs">Invita a familiares y amigos • Solo 25€/temporada</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-sm font-bold">→</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Lotería si está visible */}
        {seasonConfig?.loteria_navidad_abierta && (
          <Link to={createPageUrl("ParentLottery")}>
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-green-500">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                  <Clover className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold text-base">🍀 Lotería de Navidad</p>
                  <p className="text-green-100 text-xs">Compra décimos del club 🎄</p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Grid de botones principales */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          <Link to={createPageUrl("FederationSignatures")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-yellow-600 to-orange-600 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <FileSignature className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🖊️ Firmas Federación</h3>
                {pendingSignatures > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                    <p className="text-white text-[10px] lg:text-xs font-semibold">
                      {pendingSignatures} pendientes
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("ParentCallups")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-600 to-blue-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Bell className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🏆 Convocatorias</h3>
                {pendingCallups.length > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                    <p className="text-white text-[10px] lg:text-xs font-semibold">
                      {pendingCallups.length} pendientes
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("ParentPayments")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-green-600 to-green-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <CreditCard className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">💳 Mis Pagos</h3>
                {paymentStats.pendientes > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                    <p className="text-white text-[10px] lg:text-xs font-semibold">
                      {paymentStats.pendientes} pendientes
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("CalendarAndSchedules")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-600 to-purple-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Calendar className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📅 Calendario</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("ParentEventRSVP")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-600 to-cyan-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Calendar className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🎉 Eventos Club</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("Announcements")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-pink-600 to-pink-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-pink-600 to-pink-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Megaphone className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📢 Anuncios</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("Gallery")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-600 to-indigo-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <Image className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🖼️ Galería</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("Surveys")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-violet-600 to-violet-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <FileText className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">📋 Encuestas</h3>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("ClothingOrders")} className="group">
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-red-600 to-red-700 opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
              <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                <div className="w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce">
                  <ShoppingBag className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">🛍️ Pedidos Ropa</h3>
                {clothingOrders.filter(o => o.estado !== "Entregado").length > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                    <p className="text-white text-[10px] lg:text-xs font-semibold">
                      {clothingOrders.filter(o => o.estado !== "Entregado").length} activos
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Stats footer */}
        <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-green-500 mb-1">
                {paymentStats.pagados}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Pagos OK</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-red-500 mb-1">
                {paymentStats.pendientes}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-yellow-500 mb-1">
                {pendingCallups.length}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Convocatorias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-purple-500 mb-1">
                {attendanceStreak}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">🔥 Racha</div>
            </div>
          </div>
        </div>

        <ContactCard />
      </div>

      {/* Dialog Editar Perfil - Sin flujo de pago */}
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
                queryClient.invalidateQueries({ queryKey: ['myPlayerProfile'] });
              } catch (error) {
                toast.error("Error al actualizar el perfil");
              }
            }}
            onCancel={() => setShowEditProfile(false)}
            isAdultPlayerSelfRegistration={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}