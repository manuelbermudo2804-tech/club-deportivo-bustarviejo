import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import SocialLinks from "../components/SocialLinks";
import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";
import CaptacionShareBanner from "../components/dashboard/CaptacionShareBanner";
import TreasurerAlertCenter from "../components/dashboard/TreasurerAlertCenter";
import ContactCard from "../components/ContactCard";
import DashboardCardSkeleton from "../components/skeletons/DashboardCardSkeleton";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_TREASURER_BUTTONS, DEFAULT_TREASURER_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/TreasurerDashboardButtons";
import { calculatePaymentStats } from "../components/payments/paymentHelpers";

import { useUnifiedNotifications } from "../components/notifications/useUnifiedNotifications";

export default function TreasurerDashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [myPlayersSports, setMyPlayersSports] = useState([]);
  const [loteriaVisible, setLoteriaVisible] = useState(false);
  const { notifications } = useUnifiedNotifications(user);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        console.log('✅ [TreasurerDashboard] Usuario cargado:', currentUser.email);
        setUser(currentUser);
      } catch (error) {
        console.error("❌ [TreasurerDashboard] Error fetching user:", error);
        base44.auth.logout('https://app.cdbustarviejo.com');
      }
    };
    fetchUser();
  }, []);

  const { data: allPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.list();
      return players;
    },
    staleTime: 300000,
    enabled: !!user,
  });

  const myPlayers = allPlayers.filter(p => 
    (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo === true
  );

  useEffect(() => {
    if (user && myPlayers.length > 0) {
      const sports = [...new Set(myPlayers.map(p => p.deporte))];
      setMyPlayersSports(sports);
    }
  }, [user?.email, myPlayers.length]);

  const { data: allPayments = [] } = useQuery({
    queryKey: ['paymentsAll', user?.email],
    queryFn: () => base44.entities.Payment.list('-created_date', 200),
    staleTime: 60000,
    enabled: !!user,
  });

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callups', user?.email],
    queryFn: () => base44.entities.Convocatoria.list('-created_date', 50),
    staleTime: 300000,
    enabled: !!user && myPlayers.length > 0,
  });

  const today = new Date().toISOString().split('T')[0];
  const callups = allCallups.filter(c => c.publicada && c.fecha_partido >= today && !c.cerrada);

  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversationsParent', user?.email],
    queryFn: async () => {
      const allConvs = await base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha', 30);
      return allConvs.filter(c => c.participante_familia_email === user?.email);
    },
    staleTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations', user?.email],
    queryFn: async () => {
      const allConvs = await base44.entities.CoordinatorConversation.list();
      return allConvs.filter(c => c.padre_email === user?.email);
    },
    staleTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: adminConversations = [] } = useQuery({
    queryKey: ['adminConversationsParent', user?.email],
    queryFn: async () => {
      const allConvs = await base44.entities.AdminConversation.list();
      return allConvs.filter(c => c.padre_email === user?.email && !c.resuelta);
    },
    staleTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', user?.email],
    queryFn: async () => {
      if (!myPlayers || myPlayers.length === 0) return [];
      const sports = [...new Set(myPlayers.map(p => p.deporte))];
      const allMsgs = await base44.entities.ChatMessage.list('-created_date', 50);
      return allMsgs.filter(m => sports.includes(m.deporte) || m.grupo_id === "Coordinación Deportiva");
    },
    staleTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: !!user && myPlayers.length > 0,
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrdersHome'],
    queryFn: () => base44.entities.ClothingOrder.list('-created_date'),
    staleTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: lotteryOrders = [] } = useQuery({
    queryKey: ['lotteryOrdersHome'],
    queryFn: () => base44.entities.LotteryOrder.list('-created_date'),
    staleTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user,
  });

  const { data: clubMembers = [] } = useQuery({
    queryKey: ['clubMembersHome'],
    queryFn: () => base44.entities.ClubMember.list('-created_date'),
    staleTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!user,
  });

  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasonConfigs', user?.email],
    queryFn: () => base44.entities.SeasonConfig.list(),
    staleTime: 600000,
    enabled: !!user,
  });

  const activeSeason = seasonConfigs.find(s => s.activa) || null;

  useEffect(() => {
    if (activeSeason) {
      setLoteriaVisible(activeSeason.loteria_navidad_abierta === true);
    }
  }, [activeSeason]);

  // Cargar configuración de botones del usuario
  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "treasurer"
      });
      return configs;
    },
    staleTime: 600000,
    enabled: !!user,
  });

  const userButtonConfig = buttonConfigs[0];

  // Mutation para guardar configuración
  const saveButtonConfigMutation = useMutation({
    mutationFn: async (selectedButtonIds) => {
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: selectedButtonIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "treasurer",
          selected_buttons: selectedButtonIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
      toast.success("✅ Configuración guardada");
    },
  });

  // Calcular estadísticas
  const myPlayerIds = myPlayers.map(p => p.id);

  // Calcular edad helper
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  // Stats de PADRE
  let pendingCallupsParent = 0;
  let pendingSignaturesParent = 0;
  
  callups.forEach(callup => {
    callup.jugadores_convocados?.forEach(jugador => {
      if (myPlayerIds.includes(jugador.jugador_id) && jugador.confirmacion === "pendiente") {
        pendingCallupsParent++;
      }
    });
  });

  myPlayers.forEach(player => {
    const hasEnlaceJugador = !!player.enlace_firma_jugador;
    const hasEnlaceTutor = !!player.enlace_firma_tutor;
    const firmaJugadorOk = player.firma_jugador_completada === true;
    const firmaTutorOk = player.firma_tutor_completada === true;
    const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
    
    if (hasEnlaceJugador && !firmaJugadorOk) pendingSignaturesParent++;
    if (hasEnlaceTutor && !firmaTutorOk && !esMayorDeEdad) pendingSignaturesParent++;
  });

  // USAR HELPER CENTRALIZADO para pagos
  const { pendingPayments: pagosPendientesNoVencidos, overduePayments: overduePaymentsCount, paymentsInReview: pagosEnRevisionNoVencidos } = calculatePaymentStats(allPayments, myPlayerIds);

  // Stats de TESORERO (todos los pagos del club)
  const paymentsInReviewTreasurer = allPayments.filter(p => 
    p.estado === "En revisión" && 
    p.is_deleted !== true &&
    p.reconciliado_banco !== true
  ).length;

  const pendingClothingOrders = clothingOrders.filter(o => 
    o.estado === "Pendiente" || o.estado === "En revisión"
  ).length;

  const seasonName = activeSeason?.temporada ? activeSeason.temporada.replace(/-/g,'/') : null;
  const pendingLotteryOrders = lotteryOrders.filter(o => {
    const orderSeason = (o.temporada || '').replace(/-/g,'/');
    return !o.pagado && (!seasonName || orderSeason === seasonName);
  }).length;

  const pendingMemberRequests = clubMembers.filter(m => 
    m.estado_pago === "En revisión" || m.estado_pago === "Pendiente"
  ).length;

  // Mensajes sin leer
  const unreadPrivateMessages = privateConversations.reduce((count, conv) => 
    count + (conv.no_leidos_familia || 0), 0
  );

  const unreadCoordinatorMessages = coordinatorConversations.reduce((count, conv) => 
    count + (conv.no_leidos_padre || 0), 0
  );

  const unreadAdminMessages = adminConversations.reduce((count, conv) => 
    count + (conv.no_leidos_padre || 0), 0
  );
  const hasActiveAdminChat = adminConversations.length > 0;

  const unreadCoachMessages = messages.filter(m => {
    if (m.tipo === "entrenador_a_grupo" && !m.leido) return true;
    if (m.destinatario_email === user?.email && !m.leido) return true;
    return false;
  }).length;

  const totalPendingPaymentsParent = pagosPendientesNoVencidos + pagosEnRevisionNoVencidos + overduePaymentsCount;

  // Determinar qué botones mostrar según configuración del usuario
  const selectedButtonIds = userButtonConfig?.selected_buttons || DEFAULT_TREASURER_BUTTONS;

  // Filtrar botones disponibles (excluir condicionales si no aplican)
  const availableButtons = ALL_TREASURER_BUTTONS.filter(button => {
    if (button.conditional) {
      if (button.conditionKey === "loteriaVisible") return loteriaVisible;
      if (button.conditionKey === "hasPlayers") return myPlayers.length > 0;
      return false;
    }
    return true;
  });

  // Obtener botones a mostrar en el orden seleccionado
  const displayButtons = selectedButtonIds
    .map(id => availableButtons.find(b => b.id === id))
    .filter(Boolean);

  // Añadir badges dinámicos
  const menuItems = displayButtons.map(item => {
    const updated = { ...item };
    
    if (item.id === "pagos_club" && paymentsInReviewTreasurer > 0) {
      updated.badge = paymentsInReviewTreasurer;
      updated.badgeLabel = "en revisión";
    }
    if (item.id === "pedidos_ropa" && pendingClothingOrders > 0) {
      updated.badge = pendingClothingOrders;
      updated.badgeLabel = "pendientes";
    }
    if (item.id === "loteria" && pendingLotteryOrders > 0) {
      updated.badge = pendingLotteryOrders;
      updated.badgeLabel = "sin pagar";
    }
    if (item.id === "socios" && pendingMemberRequests > 0) {
      updated.badge = pendingMemberRequests;
      updated.badgeLabel = "pendientes";
    }
    if (item.id === "mis_jugadores" && myPlayers.length > 0) {
      updated.badge = myPlayers.length;
      updated.badgeLabel = "registrados";
    }
    if (item.id === "pagos_hijos" && totalPendingPaymentsParent > 0) {
      updated.badge = totalPendingPaymentsParent;
      updated.badgeLabel = "pendientes";
    }
    
    return updated;
  });

  if (!user || playersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div className="px-4 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-3"></div>
              <p className="text-white text-sm">Cargando dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">

      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6 pb-28">
        <SocialLinks />
        <CaptacionShareBanner link="https://alta-socio.vercel.app/jugadores.html" />

        {/* Banner de Chats - Igual que ParentDashboard */}
        {playersLoading ? (
          <DashboardCardSkeleton />
        ) : myPlayers.length > 0 && (
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
                  <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center relative">
                    {(notifications?.unreadSystemMessages || 0) > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{notifications.unreadSystemMessages}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold mb-1 text-center">🔔 Mensajes</p>
                    <p className="text-xs text-purple-100 leading-tight text-center">Del Club</p>
                  </div>
                </Link>

                <Link to={createPageUrl("ParentCoordinatorChat")} className="relative flex-1">
                  <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center relative">
                    {(notifications?.unreadCoordinatorMessages || 0) > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{notifications.unreadCoordinatorMessages}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold mb-1 text-center">🏟️ Coordinador</p>
                    <p className="text-xs text-cyan-100 leading-tight text-center">Consultas deportivas</p>
                  </div>
                </Link>
                
                <Link to={createPageUrl("ParentCoachChat")} className="relative flex-1">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center relative">
                    {(notifications?.unreadCoachMessages || 0) > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{notifications.unreadCoachMessages}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold mb-1 text-center">⚽ Entrenador</p>
                    <p className="text-xs text-blue-100 leading-tight text-center">Chat del equipo</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widget Clasificaciones y Próximo Partido */}
        {!playersLoading && myPlayers.length > 0 && (
          <ClassificationsAndMatchesBanner userEmail={user?.email} myPlayers={myPlayers} />
        )}

        {/* Alert Center unificado con 2 columnas (Padre | Tesorero) */}
        {playersLoading ? (
          <DashboardCardSkeleton />
        ) : (
          <TreasurerAlertCenter
            pendingCallupsParent={pendingCallupsParent}
            pendingPaymentsParent={pagosPendientesNoVencidos}
            paymentsInReviewParent={pagosEnRevisionNoVencidos}
            overduePaymentsParent={overduePaymentsCount}
            pendingSignaturesParent={pendingSignaturesParent}
            unreadPrivateMessages={0}
            unreadCoordinatorMessages={0}
            unreadAdminMessages={0}
            hasActiveAdminChat={false}
            myPlayersSports={myPlayersSports}
            userEmail={user?.email}
            paymentsInReviewTreasurer={paymentsInReviewTreasurer}
            pendingClothingOrders={pendingClothingOrders}
            pendingLotteryOrders={pendingLotteryOrders}
            pendingMemberRequests={pendingMemberRequests}
          />
        )}

        {/* Botón de configuración de dashboard */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={availableButtons}
            selectedButtonIds={selectedButtonIds}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_TREASURER_BUTTONS}
            panelName="Panel Tesorero"
          />
        </div>

        {/* Botones de Acceso Rápido - Aspecto ParentDashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {menuItems.map((item, index) => (
            <Link key={index} to={createPageUrl(item.url.replace('/', ''))} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
                
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce transition-all duration-300`}>
                    <item.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white transition-transform duration-300" />
                  </div>
                  
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">
                    {item.title}
                  </h3>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full badge-pulse">
                      <p className="text-white text-[10px] lg:text-xs font-semibold">
                        {item.badge} {item.badgeLabel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Estadísticas del Footer */}
        {playersLoading ? (
          <DashboardCardSkeleton />
        ) : (
          <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="text-center">
                <div className="text-2xl lg:text-4xl font-bold text-orange-500 mb-1">
                  {myPlayers.length}
                </div>
                <div className="text-slate-400 text-[10px] lg:text-sm">Mis Jugadores</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-4xl font-bold text-red-500 mb-1">
                  {totalPendingPaymentsParent}
                </div>
                <div className="text-slate-400 text-[10px] lg:text-sm">Pagos Mis Hijos</div>
                <div className="text-slate-500 text-[8px] lg:text-[10px] mt-1">
                  {overduePaymentsCount > 0 && `${overduePaymentsCount} vencidos`}
                  {overduePaymentsCount > 0 && (pagosPendientesNoVencidos > 0 || pagosEnRevisionNoVencidos > 0) && ' • '}
                  {pagosPendientesNoVencidos > 0 && `${pagosPendientesNoVencidos} pendientes`}
                  {pagosPendientesNoVencidos > 0 && pagosEnRevisionNoVencidos > 0 && ' • '}
                  {pagosEnRevisionNoVencidos > 0 && `${pagosEnRevisionNoVencidos} en revisión`}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-4xl font-bold text-yellow-500 mb-1">
                  {pendingCallupsParent}
                </div>
                <div className="text-slate-400 text-[10px] lg:text-sm">Convocatorias</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-4xl font-bold text-green-500 mb-1">
                  {paymentsInReviewTreasurer}
                </div>
                <div className="text-slate-400 text-[10px] lg:text-sm">Pagos Club</div>
                <div className="text-slate-500 text-[8px] lg:text-[10px] mt-1">en revisión</div>
              </div>
            </div>
          </div>
        )}

        <ContactCard />
      </div>
    </div>
  );
}