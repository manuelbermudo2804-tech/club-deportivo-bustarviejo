import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import SocialLinks from "../components/SocialLinks";
import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";
import AlertCenter from "../components/dashboard/AlertCenter";
import TreasurerDashboardButtons from "../components/dashboard/TreasurerDashboardButtons";
import ContactCard from "../components/ContactCard";
import DashboardCardSkeleton from "../components/skeletons/DashboardCardSkeleton";

export default function TreasurerDashboard() {
  const [user, setUser] = useState(null);
  const [myPlayersSports, setMyPlayersSports] = useState([]);

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
    queryKey: ['payments', user?.email],
    queryFn: () => base44.entities.Payment.list('-created_date', 100),
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
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations', user?.email],
    queryFn: async () => {
      const allConvs = await base44.entities.CoordinatorConversation.list();
      return allConvs.filter(c => c.padre_email === user?.email);
    },
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  const { data: adminConversations = [] } = useQuery({
    queryKey: ['adminConversationsParent', user?.email],
    queryFn: async () => {
      const allConvs = await base44.entities.AdminConversation.list();
      return allConvs.filter(c => c.padre_email === user?.email && !c.resuelta);
    },
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
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
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    enabled: !!user && myPlayers.length > 0,
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrdersHome'],
    queryFn: () => base44.entities.ClothingOrder.list('-created_date'),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30000,
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
  let pendingPaymentsParent = 0;
  let paymentsInReviewParent = 0;
  let overduePaymentsParent = 0;
  
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

  const currentSeason = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  })();

  const normalizeSeason = (season) => {
    if (!season) return currentSeason;
    return season.replace(/-/g, '/');
  };

  const myPayments = allPayments.filter(p => 
    myPlayerIds.includes(p.jugador_id) && 
    p.is_deleted !== true &&
    normalizeSeason(p.temporada) === normalizeSeason(currentSeason)
  );

  const now = new Date();
  myPayments.forEach(payment => {
    if (payment.estado === "Pendiente") {
      const mes = payment.mes;
      const year = parseInt(currentSeason.split('/')[0]);
      let vencimiento;
      
      if (mes === "Junio") vencimiento = new Date(year, 5, 30);
      else if (mes === "Septiembre") vencimiento = new Date(year, 8, 15);
      else if (mes === "Diciembre") vencimiento = new Date(year, 11, 15);
      
      if (vencimiento && now >= vencimiento) {
        overduePaymentsParent++;
      } else {
        pendingPaymentsParent++;
      }
    } else if (payment.estado === "En revisión") {
      paymentsInReviewParent++;
    }
  });

  // Stats de TESORERO (todos los pagos del club)
  const paymentsInReviewTreasurer = allPayments.filter(p => 
    p.estado === "En revisión" && 
    p.is_deleted !== true &&
    p.reconciliado_banco !== true
  ).length;

  const pendingClothingOrders = clothingOrders.filter(o => 
    o.estado === "Pendiente" || o.estado === "En revisión"
  ).length;

  const pendingLotteryOrders = lotteryOrders.filter(o => !o.pagado).length;

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

  const totalPendingPaymentsParent = pendingPaymentsParent + paymentsInReviewParent + overduePaymentsParent;

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
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />

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
                  <p className="text-xs text-purple-700">
                    {(unreadPrivateMessages + unreadCoordinatorMessages + unreadCoachMessages) > 0 
                      ? `${unreadPrivateMessages + unreadCoordinatorMessages + unreadCoachMessages} mensaje${(unreadPrivateMessages + unreadCoordinatorMessages + unreadCoachMessages) > 1 ? 's' : ''} nuevo${(unreadPrivateMessages + unreadCoordinatorMessages + unreadCoachMessages) > 1 ? 's' : ''}`
                      : 'Chats con el club'}
                  </p>
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
                    {unreadPrivateMessages > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{unreadPrivateMessages}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold mb-1 text-center">🔔 Mensajes</p>
                    <p className="text-xs text-purple-100 leading-tight text-center">Del Club</p>
                  </div>
                </Link>

                <Link to={createPageUrl("ParentCoordinatorChat")} className="relative flex-1">
                  <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                    {unreadCoordinatorMessages > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{unreadCoordinatorMessages}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold mb-1 text-center">🏟️ Coordinador</p>
                    <p className="text-xs text-cyan-100 leading-tight text-center">Consultas deportivas</p>
                  </div>
                </Link>
                
                <Link to={createPageUrl("ParentCoachChat")} className="relative flex-1">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                    {unreadCoachMessages > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{unreadCoachMessages}</span>
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

        {/* Alert Center con 2 columnas */}
        {playersLoading ? (
          <DashboardCardSkeleton />
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Columna Izquierda - Tareas como Padre */}
            <div>
              <h2 className="text-lg font-bold text-white mb-3">👨‍👩‍👧 Mis Tareas como Padre</h2>
              <AlertCenter 
                pendingCallups={pendingCallupsParent}
                pendingPayments={pendingPaymentsParent}
                paymentsInReview={paymentsInReviewParent}
                overduePayments={overduePaymentsParent}
                pendingSignatures={pendingSignaturesParent}
                unreadPrivateMessages={unreadPrivateMessages}
                unreadCoordinatorMessages={unreadCoordinatorMessages}
                unreadAdminMessages={unreadAdminMessages}
                hasActiveAdminChat={hasActiveAdminChat}
                isAdmin={false}
                isCoach={false}
                isParent={true}
                userEmail={user?.email}
                userSports={myPlayersSports}
              />
            </div>

            {/* Columna Derecha - Tareas como Tesorero */}
            <div>
              <h2 className="text-lg font-bold text-white mb-3">💰 Mis Tareas como Tesorero</h2>
              <AlertCenter 
                paymentsInReview={paymentsInReviewTreasurer}
                pendingClothingOrders={pendingClothingOrders}
                pendingLotteryOrders={pendingLotteryOrders}
                pendingMemberRequests={pendingMemberRequests}
                isAdmin={false}
                isCoach={false}
                isParent={false}
                isTreasurer={true}
                userEmail={user?.email}
                userSports={[]}
              />
            </div>
          </div>
        )}

        {/* Botones de Acceso Rápido */}
        <TreasurerDashboardButtons />

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
                  {overduePaymentsParent > 0 && `${overduePaymentsParent} vencidos`}
                  {overduePaymentsParent > 0 && (pendingPaymentsParent > 0 || paymentsInReviewParent > 0) && ' • '}
                  {pendingPaymentsParent > 0 && `${pendingPaymentsParent} pendientes`}
                  {pendingPaymentsParent > 0 && paymentsInReviewParent > 0 && ' • '}
                  {paymentsInReviewParent > 0 && `${paymentsInReviewParent} en revisión`}
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