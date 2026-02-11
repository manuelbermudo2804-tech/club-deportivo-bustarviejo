import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_PLAYER_BUTTONS, DEFAULT_PLAYER_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/PlayerDashboardButtons";
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
import ShareFormButton from "../components/players/ShareFormButton";

export default function PlayerDashboard() {
  const [user, setUser] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [pendingPlayerData, setPendingPlayerData] = useState(null);
  const [showInscriptionSuccess, setShowInscriptionSuccess] = useState(false);
  const [inscriptionSuccessData, setInscriptionSuccessData] = useState(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [allowCreatePrompt, setAllowCreatePrompt] = useState(false);
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
      if (!user) return null;
      try {
        const conditions = [];
        if (user.player_id) conditions.push({ id: user.player_id });
        conditions.push({ email_jugador: user.email }, { email_padre: user.email }, { email_tutor_2: user.email });
        const candidates = await base44.entities.Player.filter({ $or: conditions }, '-updated_date', 1);
        const found = candidates?.[0] || null;
        if (found && !user.player_id) { await base44.auth.updateMe({ player_id: found.id }); }
        return found;
      } catch (_) { return null; }
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000, // 30 segundos
  });

  useEffect(() => {
    if (loadingPlayer) { setAllowCreatePrompt(false); return; }
    if (!player) {
      const t = setTimeout(() => setAllowCreatePrompt(true), 3000);
      return () => clearTimeout(t);
    } else {
      setAllowCreatePrompt(false);
    }
  }, [loadingPlayer, player]);
  // Convocatorias del jugador
  const { data: callups } = useQuery({
    queryKey: ['playerCallups', player?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const convs = await base44.entities.Convocatoria.filter({ publicada: true, cerrada: false }, '-fecha_partido', 30);
      return convs
        .filter(c => c.fecha_partido >= today && c.jugadores_convocados?.some(j => j.jugador_id === player?.id))
        .slice(0, 5);
    },
    enabled: !!player?.id,
    staleTime: 120000,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  // Pagos del jugador
  const { data: payments } = useQuery({
    queryKey: ['playerPayments', player?.id],
    queryFn: async () => {
      return await base44.entities.Payment.filter(
        { jugador_id: player?.id, is_deleted: false },
        '-created_date',
        50
      );
    },
    enabled: !!player?.id,
    staleTime: 300000,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  // Asistencias para logros
  const { data: attendances } = useQuery({
    queryKey: ['playerAttendances', player?.deporte],
    queryFn: async () => {
      if (!player?.deporte) return [];
      return await base44.entities.Attendance.filter({ categoria: player?.deporte }, '-fecha', 100);
    },
    enabled: !!player?.deporte,
    staleTime: 300000,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  // Horarios de entrenamiento
  const { data: schedules } = useQuery({
    queryKey: ['playerSchedules', player?.deporte],
    queryFn: async () => {
      const filtered = await base44.entities.TrainingSchedule.filter({ activo: true, categoria: player?.deporte }, '-dia_semana', 20);
      const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
      return filtered.sort((a, b) => dias.indexOf(a.dia_semana) - dias.indexOf(b.dia_semana));
    },
    enabled: !!player?.deporte,
    staleTime: 300000,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  // Configuración de temporada
  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      return configs?.[0] || null;
    },
    initialData: null,
  });

  // Configuración de categorías
  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 300000,
  });

  // Conversación con admin (si existe - para AlertCenter)
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

  // Anuncios importantes
  const { data: announcements } = useQuery({
    queryKey: ['playerAnnouncements', player?.deporte],
    queryFn: async () => {
      const all = await base44.entities.Announcement.list('-created_date', 30);
      const today = new Date().toISOString().split('T')[0];
      return all.filter(a => 
        a.publicado && 
        (!a.fecha_expiracion || a.fecha_expiracion >= today) &&
        (a.destinatarios_tipo === "Todos" || a.destinatarios_tipo === player?.deporte)
      ).slice(0, 3);
    },
    enabled: !!player,
    staleTime: 300000,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  // Compañeros de equipo
  const { data: teammates = [] } = useQuery({
    queryKey: ['teammates', player?.deporte],
    queryFn: async () => {
      const mates = await base44.entities.Player.filter({ deporte: player?.deporte, activo: true }, '-created_date', 60);
      return mates.filter(p => p.id !== player?.id).slice(0, 12);
    },
    enabled: !!player?.deporte,
    staleTime: 300000,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  // Pedidos de ropa del jugador
  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['playerClothingOrders', player?.id],
    queryFn: async () => {
      return await base44.entities.ClothingOrder.filter({ jugador_id: player?.id }, '-created_date', 20);
    },
    enabled: !!player?.id,
    staleTime: 300000,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  // Evaluaciones del jugador
  const { data: evaluations = [] } = useQuery({
    queryKey: ['playerEvaluations', player?.id],
    queryFn: async () => {
      return await base44.entities.PlayerEvaluation.filter({ jugador_id: player?.id }, '-fecha_evaluacion', 20);
    },
    enabled: !!player?.id,
    staleTime: 300000,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "player"
      });
      return configs;
    },
    staleTime: 600000,
    enabled: !!user,
  });

  const userButtonConfig = buttonConfigs[0];
  const loteriaVisible = seasonConfig?.loteria_navidad_abierta === true;

  const saveButtonConfigMutation = useMutation({
    mutationFn: async (selectedButtonIds) => {
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: selectedButtonIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "player",
          selected_buttons: selectedButtonIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
      toast.success("✅ Configuración guardada");
    },
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
    if (!allowCreatePrompt) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
            <p className="text-slate-500">Buscando tu ficha...</p>
          </div>
        </div>
      );
    }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Chatbot")}>
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800">
                <Sparkles className="w-4 h-4 mr-1" />
                🤖 IA
              </Button>
            </Link>
            <Link to={createPageUrl("FamilyChatsHub")}>
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <MessageCircle className="w-4 h-4 mr-1" />
                💬 Chats
              </Button>
            </Link>
          </div>
          <ShareFormButton />
        </div>

        {/* Banner Clasificaciones y Próximo Partido */}
        <ClassificationsAndMatchesBanner 
          userEmail={user?.email} 
          myPlayers={player ? [player] : []} 
        />

        {/* Centro de Alertas */}
        <AlertCenter 
          pendingCallups={pendingCallups.length}
          pendingSignatures={pendingSignatures}
          pendingPayments={pagosPendientesNoVencidos}
          paymentsInReview={pagosEnRevisionNoVencidos}
          overduePayments={overduePaymentsCount}
          hasActiveAdminChat={!!adminConversation}
          isParent={true}
          userEmail={user?.email}
          userSports={player?.deporte ? [player.deporte] : []}
        />

        {/* Banner Hazte Socio */}
        <Link to={createPageUrl("ClubMembership")}>
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-xl p-3 shadow-lg transition-all hover:scale-105 active:scale-95 border border-pink-400">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white font-bold text-sm">❤️ Hazte Socio • 25€/temporada</p>
              </div>
              <span className="text-white text-lg">→</span>
            </div>
          </div>
        </Link>

        {/* Lotería si está visible */}
        {seasonConfig?.loteria_navidad_abierta && (
          <Link to={createPageUrl("ParentLottery")}>
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-3 shadow-lg transition-all hover:scale-105 active:scale-95 border border-green-500">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clover className="w-5 h-5 text-white flex-shrink-0" />
                  <p className="text-white font-bold text-sm">🍀 Lotería Navidad • 28720</p>
                </div>
                <span className="text-white text-lg">→</span>
              </div>
            </div>
          </Link>
        )}

        {/* Botón personalizar */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={ALL_PLAYER_BUTTONS}
            selectedButtonIds={userButtonConfig?.selected_buttons || DEFAULT_PLAYER_BUTTONS}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_PLAYER_BUTTONS}
            panelName="Panel Jugador"
          />
        </div>

        {/* Grid de botones principales */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {(userButtonConfig?.selected_buttons || DEFAULT_PLAYER_BUTTONS)
            .map(id => ALL_PLAYER_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce transition-all duration-300`}>
                    <item.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white transition-transform duration-300" />
                  </div>
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">{item.title}</h3>
                  {item.id === "convocatorias" && pendingCallups.length > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                      <p className="text-white text-[10px] lg:text-xs font-semibold">
                        {pendingCallups.length} pendientes
                      </p>
                    </div>
                  )}
                  {item.id === "firmas" && pendingSignatures > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                      <p className="text-white text-[10px] lg:text-xs font-semibold">
                        {pendingSignatures} pendientes
                      </p>
                    </div>
                  )}
                  {item.id === "pagos" && paymentStats.pendientes > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                      <p className="text-white text-[10px] lg:text-xs font-semibold">
                        {paymentStats.pendientes} pendientes
                      </p>
                    </div>
                  )}
                  {item.id === "ropa" && clothingOrders.filter(o => o.estado !== "Entregado").length > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <p className="text-white text-[10px] lg:text-xs font-semibold">
                        {clothingOrders.filter(o => o.estado !== "Entregado").length} activos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
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
                {paymentStats.pendientes + paymentStats.enRevision + paymentStats.vencidos}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Pagos Total</div>
              <div className="text-slate-500 text-[8px] lg:text-[10px] mt-1">
                {paymentStats.vencidos > 0 && `${paymentStats.vencidos} vencidos`}
                {paymentStats.vencidos > 0 && (paymentStats.pendientes > 0 || paymentStats.enRevision > 0) && ' • '}
                {paymentStats.pendientes > 0 && `${paymentStats.pendientes} pendientes`}
                {paymentStats.pendientes > 0 && paymentStats.enRevision > 0 && ' • '}
                {paymentStats.enRevision > 0 && `${paymentStats.enRevision} revisión`}
              </div>
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