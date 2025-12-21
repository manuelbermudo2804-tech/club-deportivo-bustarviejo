import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, Bell, Sparkles } from "lucide-react";

import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";
import AlertCenter from "../components/dashboard/AlertCenter";
import TreasurerDashboardButtons from "../components/dashboard/TreasurerDashboardButtons";

export default function TreasurerDashboard() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Obtener jugadores del tesorero (sus hijos)
      const allPlayers = await base44.entities.Player.list();
      const myPlayersList = allPlayers.filter(p => 
        (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email) && 
        p.activo === true
      );
      setMyPlayers(myPlayersList);
    };
    fetchUser();
  }, []);

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    enabled: !!user,
  });

  const { data: callups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    enabled: !!user,
  });

  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversations'],
    queryFn: () => base44.entities.PrivateConversation.list(),
    enabled: !!user,
  });

  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations'],
    queryFn: () => base44.entities.CoordinatorConversation.list(),
    enabled: !!user,
  });

  const { data: adminConversations = [] } = useQuery({
    queryKey: ['adminConversations'],
    queryFn: () => base44.entities.AdminConversation.list(),
    enabled: !!user,
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrders'],
    queryFn: () => base44.entities.ClothingOrder.list(),
    enabled: !!user,
  });

  const { data: lotteryOrders = [] } = useQuery({
    queryKey: ['lotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list(),
    enabled: !!user,
  });

  const { data: clubMembers = [] } = useQuery({
    queryKey: ['clubMembers'],
    queryFn: () => base44.entities.ClubMember.list(),
    enabled: !!user,
  });

  // Calcular estadísticas
  const myPlayerIds = myPlayers.map(p => p.id);
  const myPlayersSports = [...new Set(myPlayers.map(p => p.deporte))];

  // Stats de PADRE
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  let pendingCallupsParent = 0;
  let pendingSignaturesParent = 0;
  let pendingPaymentsParent = 0;
  let overduePaymentsParent = 0;

  const today = new Date().toISOString().split('T')[0];
  
  callups.forEach(callup => {
    if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
      callup.jugadores_convocados?.forEach(jugador => {
        if (myPlayerIds.includes(jugador.jugador_id) && jugador.confirmacion === "pendiente") {
          pendingCallupsParent++;
        }
      });
    }
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

  const myPayments = payments.filter(p => 
    myPlayerIds.includes(p.jugador_id) && 
    p.is_deleted !== true &&
    normalizeSeason(p.temporada) === normalizeSeason(currentSeason)
  );

  pendingPaymentsParent = myPayments.filter(p => p.estado === "Pendiente").length;

  const now = new Date();
  myPayments.forEach(payment => {
    if (payment.estado !== "Pagado") {
      const mes = payment.mes;
      const year = parseInt(currentSeason.split('/')[0]);
      let vencimiento;
      
      if (mes === "Junio") {
        vencimiento = new Date(year, 5, 30);
      } else if (mes === "Septiembre") {
        vencimiento = new Date(year, 8, 15);
      } else if (mes === "Diciembre") {
        vencimiento = new Date(year, 11, 15);
      }
      
      if (vencimiento && now >= vencimiento) {
        overduePaymentsParent++;
      }
    }
  });

  // Stats de TESORERO
  const paymentsInReviewTreasurer = payments.filter(p => 
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
  let unreadPrivateMessages = 0;
  let unreadCoordinatorMessages = 0;
  let unreadAdminMessages = 0;
  let hasActiveAdminChat = false;

  if (user) {
    privateConversations.forEach(conv => {
      if (conv.participante_familia_email === user.email) {
        unreadPrivateMessages += (conv.no_leidos_familia || 0);
      }
    });

    coordinatorConversations.forEach(conv => {
      if (conv.padre_email === user.email) {
        unreadCoordinatorMessages += (conv.no_leidos_padre || 0);
      }
    });

    const myAdminConv = adminConversations.find(c => 
      c.padre_email === user.email && !c.resuelta
    );
    if (myAdminConv) {
      hasActiveAdminChat = true;
      unreadAdminMessages = myAdminConv.no_leidos_padre || 0;
    }
  }

  if (!user) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">💰 Panel de Tesorero</h1>
        <p className="text-slate-600 text-sm lg:text-base">Gestión financiera del club y tareas familiares</p>
      </div>

      {/* Widget Clasificaciones y Próximo Partido */}
      {myPlayers.length > 0 && (
        <ClassificationsAndMatchesBanner players={myPlayers} />
      )}

      {/* Botones de Chat - Igual que padres */}
      <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200">
        <p className="text-slate-900 text-sm font-semibold mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-orange-600" />
          💬 Mensajería
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Asistente Virtual */}
          <Link to={createPageUrl("Chatbot")} className="relative">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <p className="text-sm font-bold text-center">🤖 Asistente</p>
              <p className="text-xs text-indigo-100 text-center mt-0.5">Consulta IA</p>
            </div>
          </Link>

          {/* Mensajes del Club */}
          <Link to={createPageUrl("ParentSystemMessages")} className="relative">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
              {unreadPrivateMessages > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  <span className="text-white text-xs font-bold">{unreadPrivateMessages}</span>
                </div>
              )}
              <p className="text-sm font-bold text-center">🔔 Mensajes</p>
              <p className="text-xs text-purple-100 text-center mt-0.5">Del Club</p>
            </div>
          </Link>

          {/* Chat Coordinador */}
          <Link to={createPageUrl("ParentCoordinatorChat")} className="relative">
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
              {unreadCoordinatorMessages > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  <span className="text-white text-xs font-bold">{unreadCoordinatorMessages}</span>
                </div>
              )}
              <p className="text-sm font-bold text-center">💬 Coordinador</p>
              <p className="text-xs text-cyan-100 text-center mt-0.5">Chat familiar</p>
            </div>
          </Link>

          {/* Chat Entrenador */}
          <Link to={createPageUrl("ParentCoachChat")} className="relative">
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
              <p className="text-sm font-bold text-center">⚽ Entrenador</p>
              <p className="text-xs text-green-100 text-center mt-0.5">Chat familiar</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Alert Center con 2 columnas */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Columna Izquierda - Tareas como Padre */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">👨‍👩‍👧 Mis Tareas como Padre</h2>
          <AlertCenter 
            pendingCallups={pendingCallupsParent}
            pendingPayments={pendingPaymentsParent}
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
          <h2 className="text-lg font-bold text-slate-900 mb-3">💰 Mis Tareas como Tesorero</h2>
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

      {/* Botones de Acceso Rápido */}
      <TreasurerDashboardButtons />
    </div>
  );
}