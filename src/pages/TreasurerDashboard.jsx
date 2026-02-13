import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import SocialLinks from "../components/SocialLinks";
import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";
import TreasurerAlertCenter from "../components/dashboard/TreasurerAlertCenter";
import ShareFormButton from "../components/players/ShareFormButton";
import ContactCard from "../components/ContactCard";
import DashboardCardSkeleton from "../components/skeletons/DashboardCardSkeleton";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_TREASURER_BUTTONS, DEFAULT_TREASURER_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/TreasurerDashboardButtons";
import { calculatePaymentStats } from "../components/payments/paymentHelpers";
import DesktopDashboardHeader from "../components/dashboard/DesktopDashboardHeader";
import DashboardButtonCard from "../components/dashboard/DashboardButtonCard";
import { CreditCard, Users, Bell } from "lucide-react";

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

  // Sin badges en botones principales - solo en los del banner de chats
  const menuItems = displayButtons;

  if (!user || playersLoading) {
    return (
      <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black">
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
          roleName="Panel Tesorero"
          roleEmoji="💰"
          kpis={[
            { icon: CreditCard, label: "Pagos en revisión (Club)", value: paymentsInReviewTreasurer, color: "from-green-600 to-green-700", sub: paymentsInReviewTreasurer > 0 ? "requieren atención" : null },
            { icon: Users, label: "Mis Jugadores", value: myPlayers.length, color: "from-orange-600 to-orange-700" },
            { icon: Bell, label: "Convocatorias Hijos", value: pendingCallupsParent, color: "from-yellow-600 to-yellow-700", sub: pendingCallupsParent > 0 ? "por confirmar" : null },
            { icon: CreditCard, label: "Pagos Mis Hijos", value: totalPendingPaymentsParent, color: "from-red-600 to-red-700", sub: overduePaymentsCount > 0 ? `${overduePaymentsCount} vencidos` : null },
          ]}
        />

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

        {/* Botones de Acceso Rápido */}
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4 stagger-animation">
          {menuItems.map((item, index) => (
            <DashboardButtonCard key={index} item={item} isExternal={item.url?.startsWith('http')} />
          ))}
        </div>

        {/* Stats Footer - solo móvil */}
        {!playersLoading && (
          <div className="lg:hidden bg-slate-800/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-slate-700/60">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center bg-slate-700/30 rounded-xl py-2">
                <div className="text-lg font-bold text-orange-400">{myPlayers.length}</div>
                <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">Jugadores</div>
              </div>
              <div className="text-center bg-slate-700/30 rounded-xl py-2">
                <div className="text-lg font-bold text-green-400">{paymentsInReviewTreasurer}</div>
                <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">Club</div>
              </div>
              <div className="text-center bg-slate-700/30 rounded-xl py-2">
                <div className="text-lg font-bold text-yellow-400">{pendingCallupsParent}</div>
                <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">Convoc.</div>
              </div>
              <div className="text-center bg-slate-700/30 rounded-xl py-2">
                <div className="text-lg font-bold text-red-400">{totalPendingPaymentsParent}</div>
                <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">Pagos</div>
              </div>
            </div>
          </div>
        )}

        <ContactCard />
      </div>
    </div>
  );
}