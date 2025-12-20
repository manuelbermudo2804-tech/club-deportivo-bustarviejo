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
import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";

export default function PlayerDashboard() {
  const [user, setUser] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [pendingPlayerData, setPendingPlayerData] = useState(null);
  const [showInscriptionSuccess, setShowInscriptionSuccess] = useState(false);
  const [inscriptionSuccessData, setInscriptionSuccessData] = useState(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
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

  // Calcular estadísticas de pagos con separación de vencidos
  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };
  
  const currentSeason = getCurrentSeason();
  const now = new Date();
  
  let pagosPendientesNoVencidos = 0;
  let pagosEnRevisionNoVencidos = 0;
  let overduePaymentsCount = 0;
  
  (payments || []).forEach(payment => {
    if (payment.estado === "Pagado") return; // Ignorar pagados
    
    // Calcular fecha límite según mes
    const [year1] = currentSeason.split('/').map(y => parseInt(y));
    let deadlineDate;
    if (payment.mes === "Junio") deadlineDate = new Date(year1, 5, 30);
    else if (payment.mes === "Septiembre") deadlineDate = new Date(year1, 8, 15);
    else if (payment.mes === "Diciembre") deadlineDate = new Date(year1, 11, 15);
    
    const isOverdue = deadlineDate && now >= deadlineDate;
    
    if (payment.estado === "Pendiente") {
      if (isOverdue) {
        overduePaymentsCount++;
      } else {
        pagosPendientesNoVencidos++;
      }
    } else if (payment.estado === "En revisión") {
      if (isOverdue) {
        overduePaymentsCount++;
      } else {
        pagosEnRevisionNoVencidos++;
      }
    }
  });
  
  const paymentStats = {
    pagados: (payments || []).filter(p => p.estado === "Pagado").length,
    pendientes: pagosPendientesNoVencidos,
    enRevision: pagosEnRevisionNoVencidos,
    vencidos: overduePaymentsCount
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
              // Prevenir doble-submit
              if (isCreatingProfile) {
                console.log('⚠️ [PlayerDashboard] Creación ya en proceso - ignorando');
                return;
              }
              
              setIsCreatingProfile(true);
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
                setIsCreatingProfile(false);
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
    if (showCreateProfile && !showPaymentFlow) {
      return (
        <div className="p-2 lg:p-6">
          <div className="max-w-5xl mx-auto">
            <PlayerForm
              player={null}
              onSubmit={(playerData) => {
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
          </div>
        </div>
      );
    }

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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-4 text-white shadow-xl">
        <div className="flex items-center gap-3">
          {player.foto_url ? (
            <img 
              src={player.foto_url} 
              alt={player.nombre}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{player.nombre}</h1>
            <p className="text-white/90 text-sm truncate">{player.deporte}</p>
          </div>
        </div>
      </div>

      {/* Banner de Chats */}
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-purple-900">💬 Mensajes</h3>
              <p className="text-xs text-purple-700">Comunicación</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Link to={createPageUrl("Chatbot")}>
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center relative">
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <p className="text-sm font-bold text-center mb-1">🤖 Asistente</p>
                <p className="text-xs text-indigo-100 text-center">Consulta IA</p>
              </div>
            </Link>

            <Link to={createPageUrl("ParentCoordinatorChat")}>
              <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                <p className="text-sm font-bold text-center mb-1">🏟️ Coordinador</p>
                <p className="text-xs text-cyan-100 text-center">Deportivo</p>
              </div>
            </Link>
            
            <Link to={createPageUrl("ParentCoachChat")}>
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                <p className="text-sm font-bold text-center mb-1">⚽ Entrenador</p>
                <p className="text-xs text-blue-100 text-center">Mi equipo</p>
              </div>
            </Link>

            {adminConversation && (
              <Link to={createPageUrl("ParentAdminChat")}>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                  <p className="text-sm font-bold text-center mb-1">🛡️ Administrador</p>
                  <p className="text-xs text-red-100 text-center">Chat activo</p>
                </div>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Banner Clasificaciones y Próximo Partido */}
      <ClassificationsAndMatchesBanner 
        userEmail={user?.email} 
        myPlayers={player ? [player] : []} 
      />



      {/* Banner Clasificaciones y Próximo Partido */}
      <ClassificationsAndMatchesBanner 
        userEmail={user?.email} 
        myPlayers={player ? [player] : []} 
      />

      {/* Botones Principales */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={createPageUrl("CalendarAndSchedules")}>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
            <p className="text-base font-bold text-center mb-1">📅 Calendario</p>
            <p className="text-xs text-purple-100 text-center">Partidos y entrenamientos</p>
          </div>
        </Link>

        <Link to={createPageUrl("ParentEventRSVP")}>
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
            <p className="text-base font-bold text-center mb-1">🎉 Eventos Club</p>
            <p className="text-xs text-green-100 text-center">RSVP</p>
          </div>
        </Link>

        <Link to={createPageUrl("Announcements")}>
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-4 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
            <p className="text-base font-bold text-center mb-1">📢 Anuncios</p>
            <p className="text-xs text-orange-100 text-center">Comunicados</p>
          </div>
        </Link>

        <Link to={createPageUrl("Gallery")}>
          <div className="bg-gradient-to-br from-pink-600 to-pink-700 rounded-xl p-4 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
            <p className="text-base font-bold text-center mb-1">🖼️ Galería</p>
            <p className="text-xs text-pink-100 text-center">Fotos</p>
          </div>
        </Link>

        <Link to={createPageUrl("Surveys")}>
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
            <p className="text-base font-bold text-center mb-1">📋 Encuestas</p>
            <p className="text-xs text-teal-100 text-center">Opina</p>
          </div>
        </Link>

        <Link to={createPageUrl("ParentDocuments")}>
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-4 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
            <p className="text-base font-bold text-center mb-1">📄 Documentos</p>
            <p className="text-xs text-slate-100 text-center">Archivos</p>
          </div>
        </Link>
      </div>

      {/* ¡Todo al día! o Alertas */}
      {pendingCallups.length === 0 && pendingSignatures === 0 && paymentStats.pendientes === 0 && paymentStats.vencidos === 0 ? (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-green-100 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="text-5xl mb-2">✅</div>
            <h3 className="text-xl font-bold text-green-900 mb-1">¡Todo al día!</h3>
            <p className="text-sm text-green-700">No tienes tareas pendientes</p>
          </CardContent>
        </Card>
      ) : (
        <AlertCenter 
          pendingCallups={pendingCallups.length}
          pendingSignatures={pendingSignatures}
          pendingPayments={pagosPendientesNoVencidos}
          paymentsInReview={pagosEnRevisionNoVencidos}
          overduePayments={overduePaymentsCount}
          unreadCoordinatorMessages={0}
          unreadCoachMessages={0}
          unreadPrivateMessages={0}
          hasActiveAdminChat={!!adminConversation}
          isParent={true}
          userEmail={user?.email}
          userSports={player?.deporte ? [player.deporte] : []}
        />
      )}

        <ContactCard />
      </div>

      {/* Dialog Editar Perfil - Modal amplio para móvil */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto p-3 lg:p-6">
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