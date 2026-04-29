import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
import PlayerFormWizard from "../components/players/PlayerFormWizard";
import InscriptionPaymentFlow from "../components/inscriptions/InscriptionPaymentFlow";
import InscriptionSuccessScreen from "../components/inscriptions/InscriptionSuccessScreen";
import ContactCard from "../components/ContactCard";
import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";
import PlayerRenewalBanner from "../components/renewals/PlayerRenewalBanner";
import ShareFormButton from "../components/players/ShareFormButton";
import SocialLinks from "../components/SocialLinks";
import DesktopDashboardHeader from "../components/dashboard/DesktopDashboardHeader";
import DashboardButtonCard from "../components/dashboard/DashboardButtonCard";

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

      } catch (error) {
        console.error("[PlayerDashboard] Auth error:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, []);

  // Obtener ficha del jugador vinculada - OPTIMIZADO
  const { data: player, isLoading: loadingPlayer, isFetched: playerFetched } = useQuery({
    queryKey: ['myPlayerProfile', user?.player_id, user?.email],
    queryFn: async () => {
      if (!user) return null;
      // Fast path: si ya tenemos player_id, buscar directamente
      if (user.player_id) {
        try {
          const byId = await base44.entities.Player.filter({ id: user.player_id }, '-updated_date', 1);
          if (byId?.[0]) return byId[0];
        } catch {}
      }
      // Fallback: buscar por email
      const candidates = await base44.entities.Player.filter({ 
        $or: [
          { email_jugador: user.email }, 
          { email_padre: user.email }, 
          { email_tutor_2: user.email }
        ] 
      }, '-updated_date', 1);
      const found = candidates?.[0] || null;
      if (found && !user.player_id) { 
        base44.auth.updateMe({ player_id: found.id }).catch(() => {}); 
      }
      return found;
    },
    enabled: !!user,
    retry: 1,
    staleTime: 60000,
    gcTime: 5 * 60000,
  });

  // Mostrar "Crear perfil" solo cuando la query ya terminó y no encontró nada
  // NO auto-abrir el formulario — mostrar dashboard con banner para evitar confusión
  useEffect(() => {
    if (playerFetched && !player) {
      setAllowCreatePrompt(true);
      // Si viene desde el onboarding con ?registro=1, abrir el wizard automáticamente
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('registro') === '1') {
          setShowCreateProfile(true);
          // Limpiar el query param para que no se reabra al refrescar
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, '', cleanUrl);
        }
      } catch {}
    } else {
      setAllowCreatePrompt(false);
    }
  }, [playerFetched, player]);
  // Convocatorias del jugador - OPTIMIZADO: menos datos
  const { data: callups } = useQuery({
    queryKey: ['playerCallups', player?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const convs = await base44.entities.Convocatoria.filter({ publicada: true, cerrada: false }, '-fecha_partido', 10);
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

  // Asistencias para logros - LAZY: solo cargar las últimas 20
  const { data: attendances } = useQuery({
    queryKey: ['playerAttendances', player?.deporte],
    queryFn: async () => {
      if (!player?.deporte) return [];
      return await base44.entities.Attendance.filter({ categoria: player?.deporte }, '-fecha', 20);
    },
    enabled: !!player?.deporte,
    staleTime: 600000,
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
    staleTime: 300000,
    initialData: null,
  });

  // Configuración de categorías - solo si se necesita crear perfil
  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 600000,
    enabled: showCreateProfile || showPaymentFlow,
  });

  // Compañeros de equipo - DESACTIVADO para mejorar rendimiento (no se usa en la UI)
  const teammates = [];

  // Pedidos de ropa del jugador
  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['playerClothingOrders', player?.id],
    queryFn: async () => {
      return await base44.entities.ClothingOrder.filter({ jugador_id: player?.id }, '-created_date', 5);
    },
    enabled: !!player?.id,
    staleTime: 600000,
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

  if (loadingPlayer) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-500">Cargando tu ficha de jugador...</p>
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

  // Formulario de inscripción +18 — renderizado vía PORTAL al body
  // (evita problemas de z-index/transform de ancestros como el Layout)
  const inscriptionFormPortal = (!player && allowCreatePrompt && showCreateProfile && !showPaymentFlow)
    ? createPortal(
        <div
          className="fixed inset-0 bg-slate-50 overflow-y-auto"
          style={{ zIndex: 9999, paddingBottom: '100px' }}
        >
          <div className="sticky top-0 bg-orange-600 text-white px-4 py-3 shadow-md flex items-center justify-between" style={{ zIndex: 10 }}>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <h2 className="font-bold">Mi Inscripción</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setShowCreateProfile(false)}
            >
              Salir
            </Button>
          </div>
          <div className="p-3 lg:p-6 max-w-5xl mx-auto">
            <PlayerFormWizard
              player={null}
              allPlayers={[]}
              isParent={false}
              isAdultPlayerSelfRegistration={true}
              isSubmitting={isCreatingProfile}
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
            />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <div className="lg:hidden flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SocialLinks />
            <Link to={createPageUrl("Chatbot")}>
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800">
                <Sparkles className="w-4 h-4 mr-1" />
                🤖 IA
              </Button>
            </Link>
          </div>
          <ShareFormButton />
        </div>

        <DesktopDashboardHeader
          user={user}
          roleName="Panel Jugador"
          roleEmoji="⚽"
          subtitle={player?.categoria_principal || player?.deporte}
          kpis={[
            { icon: CheckCircle2, label: "Pagos OK", value: paymentStats.pagados, color: "from-green-600 to-green-700" },
            { icon: CreditCard, label: "Pagos Pendientes", value: paymentStats.pendientes + paymentStats.vencidos, color: "from-red-600 to-red-700", sub: paymentStats.vencidos > 0 ? `${paymentStats.vencidos} vencidos` : null },
            { icon: Bell, label: "Convocatorias", value: pendingCallups.length, color: "from-yellow-600 to-yellow-700", sub: pendingCallups.length > 0 ? "por confirmar" : null },
            { icon: Award, label: "Racha", value: `🔥 ${attendanceStreak}`, color: "from-purple-600 to-purple-700" },
          ]}
        />

        {/* Banner: el jugador +18 aún no ha completado su inscripción */}
        {!player && allowCreatePrompt && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 lg:p-5 shadow-lg border-2 border-amber-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-start gap-3 flex-1">
                <AlertCircle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-bold text-base">⚠️ Tu inscripción está pendiente</p>
                  <p className="text-white/90 text-sm mt-1">
                    Para poder ser convocado y acceder a todas las funciones del club, completa tu ficha de jugador.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowCreateProfile(true)}
                className="bg-white text-orange-700 hover:bg-amber-50 font-bold w-full sm:w-auto flex-shrink-0"
                size="lg"
              >
                Completar ahora →
              </Button>
            </div>
          </div>
        )}

        {/* Banner de renovación para jugadores +18 */}
        <PlayerRenewalBanner player={player} seasonConfig={seasonConfig} />

        {/* Banner Clasificaciones y Mis Convocatorias */}
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
          hasActiveAdminChat={false}
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
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4 stagger-animation">
          {(userButtonConfig?.selected_buttons || DEFAULT_PLAYER_BUTTONS)
            .map(id => ALL_PLAYER_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .map((item, index) => {
              let extraBadge = null;
              if (item.id === "convocatorias" && pendingCallups.length > 0) extraBadge = { value: pendingCallups.length, label: "pendientes" };
              if (item.id === "firmas" && pendingSignatures > 0) extraBadge = { value: pendingSignatures, label: "pendientes" };
              if (item.id === "pagos" && paymentStats.pendientes > 0) extraBadge = { value: paymentStats.pendientes, label: "pendientes" };
              if (item.id === "ropa" && clothingOrders.filter(o => o.estado !== "Entregado").length > 0) extraBadge = { value: clothingOrders.filter(o => o.estado !== "Entregado").length, label: "activos" };
              return <DashboardButtonCard key={index} item={item} extraBadge={extraBadge} />;
            })}
        </div>

        {/* Stats footer - solo móvil */}
        <div className="lg:hidden bg-slate-800/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-slate-700/60">
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center bg-slate-700/30 rounded-xl py-2">
              <div className="text-lg font-bold text-green-400">{paymentStats.pagados}</div>
              <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">Pagos OK</div>
            </div>
            <div className="text-center bg-slate-700/30 rounded-xl py-2">
              <div className="text-lg font-bold text-red-400">{paymentStats.pendientes + paymentStats.vencidos}</div>
              <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">Pendiente</div>
            </div>
            <div className="text-center bg-slate-700/30 rounded-xl py-2">
              <div className="text-lg font-bold text-yellow-400">{pendingCallups.length}</div>
              <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">Convoc.</div>
            </div>
            <div className="text-center bg-slate-700/30 rounded-xl py-2">
              <div className="text-lg font-bold text-purple-400">{attendanceStreak}</div>
              <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">🔥 Racha</div>
            </div>
          </div>
        </div>

        <ContactCard />
      </div>

      {/* Portal del formulario de inscripción +18 (fuera del Layout) */}
      {inscriptionFormPortal}

      {/* Dialog Editar Perfil - Modal amplio para móvil */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto p-3 lg:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-600" />
              Editar Mi Perfil
            </DialogTitle>
          </DialogHeader>
          <PlayerFormWizard
            player={player}
            allPlayers={player ? [player] : []}
            isParent={false}
            isAdultPlayerSelfRegistration={true}
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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}