import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Bell, MessageCircle, CreditCard, Image, Megaphone, Clock, ShoppingBag, FileText, Award, AlertCircle, Clover, Heart, FileSignature, Euro, Share2, Sparkles, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import SocialLinks from "../components/SocialLinks";
import AlertCenter from "../components/dashboard/AlertCenter";
import ContactCard from "../components/ContactCard";
import { usePageTutorial } from "../components/tutorials/useTutorial";
import DashboardCardSkeleton from "../components/skeletons/DashboardCardSkeleton";
import RenewalStatusWidget from "../components/renewals/RenewalStatusWidget";
import ClassificationsAndMatchesBanner from "../components/dashboard/ClassificationsAndMatchesBanner";
import CaptacionShareBanner from "../components/dashboard/CaptacionShareBanner";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_PARENT_BUTTONS, DEFAULT_PARENT_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/ParentDashboardButtons";
import { calculatePaymentStats } from "../components/payments/paymentHelpers";
import { useChatNotificationBubbles } from "../components/notifications/useChatNotificationBubbles";

import { useUnifiedNotifications } from "../components/notifications/useUnifiedNotifications";



// Componente para compartir Fútbol Femenino (sin referidos)
function FemeninoShareBanner() {
  const femeninoLink = `${window.location.origin}/JoinFemenino`;
  
  const whatsappMessage = encodeURIComponent(`⚽👧 ¡BUSCAMOS JUGADORAS PARA EL EQUIPO DE FÚTBOL FEMENINO!

🌟 CD Bustarviejo abre sus puertas a nuevas jugadoras.

✅ Todas las edades bienvenidas
✅ No hace falta experiencia
✅ Ambiente familiar y seguro
✅ Entrenadores titulados
✅ ¡Nos lo pasamos genial!

👉 ¡Apúntate aquí!: ${femeninoLink}

¡Te esperamos en el campo! 💪`);

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(femeninoLink);
    toast.success("¡Enlace copiado!");
  };

  return (
    <div className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 rounded-xl p-3 shadow-lg border border-pink-400">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">⚽👧</span>
          <p className="text-white font-bold text-sm">Comparte Fútbol Femenino</p>
        </div>
        <button
          onClick={shareWhatsApp}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1 flex-shrink-0"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">WhatsApp</span>
        </button>
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [myPlayersSports, setMyPlayersSports] = useState([]);
  const { notifications } = useUnifiedNotifications(user);
  const chatBubbles = useChatNotificationBubbles(user);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔍 [ParentDashboard] Iniciando carga de usuario...');
        const currentUser = await base44.auth.me();
        console.log('✅ [ParentDashboard] Usuario cargado:', currentUser.email);
        console.log('🔐 [SEGURIDAD] Usuario en ParentDashboard:', {
          email: currentUser.email,
          nombre: currentUser.full_name,
          role: currentUser.role
        });
        setUser(currentUser);
      } catch (error) {
        console.error("❌ [ParentDashboard] Error fetching user:", error);
        // Si falla auth, forzar logout y redirección
        base44.auth.logout('https://app.cdbustarviejo.com');
      }
    };
    fetchUser();
  }, []);

  // CARGAR SOLO DATOS ESENCIALES - El resto se carga bajo demanda en cada página
  const { data: allPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players', user?.email],
    queryFn: async () => {
      console.log('🔍 [ParentDashboard] Cargando jugadores para:', user?.email);
      const players = await base44.entities.Player.list();
      console.log('✅ [ParentDashboard] Jugadores cargados:', players.length);
      return players;
    },
    staleTime: 300000, // 5 minutos
    enabled: !!user,
  });

  // Cargar SeasonConfig
  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasonConfigs', user?.email],
    queryFn: () => base44.entities.SeasonConfig.list(),
    staleTime: 600000,
    enabled: !!user,
  });

  // Filtrar MIS jugadores en memoria (rápido)
  const players = allPlayers.filter(p => 
    (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo === true
  );

  // Jugadores inactivos pendientes de renovar (para mostrar CTA)
  const activeSeasonLocal = seasonConfigs?.find?.(s => s.activa) || null;
  const pendingInactivePlayers = allPlayers.filter(p => 
    (p.email_padre === user?.email || p.email_tutor_2 === user?.email) &&
    p.activo === false &&
    p.estado_renovacion === 'pendiente' &&
    (!activeSeasonLocal || p.temporada_renovacion === activeSeasonLocal.temporada)
  );
  
  console.log('👥 [ParentDashboard] Mis jugadores filtrados:', players.length, players.map(p => p.nombre));
  console.log('🔐 [SEGURIDAD] Filtrando jugadores para email:', user?.email);
  console.log('🔐 [SEGURIDAD] Jugadores encontrados:', players.map(p => ({
    nombre: p.nombre,
    email_padre: p.email_padre,
    email_tutor_2: p.email_tutor_2
  })));

  const { data: allPayments = [] } = useQuery({
    queryKey: ['payments', user?.email],
    queryFn: () => base44.entities.Payment.list('-created_date', 100),
    staleTime: 60000, // 1 minuto
    enabled: !!user && players.length > 0,
  });

  // Filtrar MIS pagos en memoria
  const payments = allPayments.filter(p => 
    players.some(player => player.id === p.jugador_id)
  );

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callups', user?.email],
    queryFn: () => base44.entities.Convocatoria.list('-created_date', 50),
    staleTime: 300000, // 5 minutos
    enabled: !!user && players.length > 0,
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
      if (!players || players.length === 0) return [];
      const sports = [...new Set(players.map(p => p.deporte))];
      const allMsgs = await base44.entities.ChatMessage.list('-created_date', 50);
      return allMsgs.filter(m => sports.includes(m.deporte) || m.grupo_id === "Coordinación Deportiva");
    },
    staleTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: !!user && players.length > 0,
  });

  const { data: customPaymentPlans = [] } = useQuery({
    queryKey: ['customPaymentPlans', user?.email],
    queryFn: () => base44.entities.CustomPaymentPlan.list(),
    staleTime: 300000, // 5 minutos
    enabled: !!user && players.length > 0,
  });

  // Cargar configuración de botones del usuario
  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "parent"
      });
      return configs;
    },
    staleTime: 600000, // 10 minutos
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
          panel_type: "parent",
          selected_buttons: selectedButtonIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
      toast.success("✅ Configuración guardada");
    },
  });

  // Surveys - solo si hay jugadores
  const { data: allSurveys = [] } = useQuery({
    queryKey: ['surveys', user?.email],
    queryFn: () => base44.entities.Survey.list('-created_date', 10),
    staleTime: 600000, // 10 minutos
    enabled: !!user && players.length > 0,
  });

  const { data: surveyResponses = [] } = useQuery({
    queryKey: ['surveyResponses', user?.email],
    queryFn: async () => {
      const allResp = await base44.entities.SurveyResponse.list();
      return allResp.filter(r => r.respondente_email === user?.email);
    },
    staleTime: 600000, // 10 minutos
    enabled: !!user && allSurveys.length > 0,
  });

  // Documents - solo si hay jugadores
  const { data: allDocuments = [] } = useQuery({
    queryKey: ['documents', user?.email],
    queryFn: () => base44.entities.Document.list('-created_date', 20),
    staleTime: 600000, // 10 minutos
    enabled: !!user && players.length > 0,
  });

  // Los jugadores ya están filtrados arriba
  const myPlayers = players;

  console.log('🎯 [ParentDashboard] myPlayers calculado:', myPlayers.length, myPlayers.map(p => p.nombre));

  useEffect(() => {
    if (user && myPlayers.length > 0) {
      const sports = [...new Set(myPlayers.map(p => p.deporte))];
      console.log('⚽ [ParentDashboard] Sports detectados:', sports);
      setMyPlayersSports(sports);
    }
  }, [user?.email, myPlayers.length]);

  const activeSurveys = (allSurveys && user && myPlayersSports.length > 0) ? allSurveys.filter(s => {
    if (!s.activa || new Date(s.fecha_fin) < new Date()) return false;
    const alreadyResponded = surveyResponses.some(r => r.survey_id === s.id);
    if (alreadyResponded) return false;
    if (s.destinatarios === "Todos") return true;
    return myPlayersSports.includes(s.destinatarios);
  }) : [];

  // Calcular mensajes privados no leídos
  const unreadPrivateMessages = privateConversations.reduce((count, conv) => 
    count + (conv.no_leidos_familia || 0), 0
  );

  // Calcular mensajes coordinador no leídos
  const unreadCoordinatorMessages = coordinatorConversations.reduce((count, conv) => 
    count + (conv.no_leidos_padre || 0), 0
  );

  // Calcular mensajes admin no leídos
  const unreadAdminMessages = adminConversations.reduce((count, conv) => 
    count + (conv.no_leidos_padre || 0), 0
  );
  const hasActiveAdminChat = adminConversations.length > 0;

  // Calcular mensajes del chat entrenador-padres no leídos
  const unreadCoachMessages = messages.filter(m => {
    if (m.tipo !== "entrenador_a_grupo") return false;
    const isRead = m.leido_por?.some(lp => lp.email === user?.email);
    return !isRead;
  }).length;

  let pendingCallups = 0;
  if (myPlayers.length > 0 && callups.length > 0) {
    callups.forEach(callup => {
      callup.jugadores_convocados?.forEach(jugador => {
        const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
        if (isMyPlayer && jugador.confirmacion === "pendiente") {
          pendingCallups++;
        }
      });
    });
  }

  const activeSeason = seasonConfigs.find(s => s.activa) || null;
  const loteriaVisible = activeSeason?.loteria_navidad_abierta === true;

  // Calcular firmas de federación pendientes
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  // Calcular firmas de federación pendientes
  const pendingFederationSignatures = myPlayers.reduce((count, player) => {
    const hasEnlaceJugador = !!player.enlace_firma_jugador;
    const hasEnlaceTutor = !!player.enlace_firma_tutor;
    const firmaJugadorOk = player.firma_jugador_completada === true;
    const firmaTutorOk = player.firma_tutor_completada === true;
    const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
    
    if (hasEnlaceJugador && !firmaJugadorOk) count++;
    if (hasEnlaceTutor && !firmaTutorOk && !esMayorDeEdad) count++;
    return count;
  }, 0);

  // Determinar qué botones mostrar según configuración del usuario
  const selectedButtonIds = userButtonConfig?.selected_buttons || DEFAULT_PARENT_BUTTONS;

  // Filtrar botones disponibles (excluir condicionales si no aplican)
  const availableButtons = ALL_PARENT_BUTTONS.filter(button => {
    if (button.conditional) {
      if (button.conditionKey === "loteriaVisible") return loteriaVisible;
      return false;
    }
    return true;
  });

  // Obtener botones a mostrar en el orden seleccionado
  const displayButtons = selectedButtonIds
    .map(id => availableButtons.find(b => b.id === id))
    .filter(Boolean);

  // Calcular pagos pendientes para badges
  const { pendingPayments: pagosPendientesCount } = calculatePaymentStats(allPayments, myPlayers.map(p => p.id), customPaymentPlans);

  // Añadir badges tipo header móvil (rectangulares verdes)
  const menuItems = displayButtons.map(item => {
    const updated = { ...item };
    
    // Mapear badges con formato header móvil
    if (item.id === "convocatorias" && pendingCallups > 0) {
      updated.mobileBadge = { emoji: "🏆", count: pendingCallups };
    }
    if (item.id === "firmas" && pendingFederationSignatures > 0) {
      updated.mobileBadge = { emoji: "🖊️", count: pendingFederationSignatures };
    }
    if (item.id === "pagos" && pagosPendientesCount > 0) {
      updated.mobileBadge = { emoji: "💳", count: pagosPendientesCount };
    }
    if (item.id === "jugadores" && myPlayers.length > 0) {
      updated.mobileBadge = { emoji: "👥", count: myPlayers.length };
    }
    
    return updated;
  });





  // Mostrar loading solo si no hay usuario todavía O si está cargando jugadores
  if (!user || playersLoading) {
    console.log('⏳ [ParentDashboard] Mostrando loading...', { hasUser: !!user, playersLoading });
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

  console.log('🎨 [ParentDashboard] Renderizando dashboard principal');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">

      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />

        {/* Banner Unificado de Chats */}
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
                  <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                    {(Math.max(notifications?.unreadSystemMessages || 0, chatBubbles.systemMessagesBubble || 0)) > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{Math.max(notifications?.unreadSystemMessages || 0, chatBubbles.systemMessagesBubble || 0)}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold mb-1 text-center">🔔 Mensajes</p>
                    <p className="text-xs text-purple-100 leading-tight text-center">Del Club</p>
                  </div>
                </Link>

                <Link to={createPageUrl("ParentCoordinatorChat")} className="relative flex-1">
                  <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                    {(Math.max(notifications?.unreadCoordinatorMessages || 0, chatBubbles.coordinatorForFamilyBubble || 0)) > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{Math.max(notifications?.unreadCoordinatorMessages || 0, chatBubbles.coordinatorForFamilyBubble || 0)}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold mb-1 text-center">🏟️ Coordinador</p>
                    <p className="text-xs text-cyan-100 leading-tight text-center">Consultas deportivas</p>
                  </div>
                </Link>
                
                <Link to={createPageUrl("ParentCoachChat")} className="relative flex-1">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                    {(Math.max(notifications?.unreadCoachMessages || 0, chatBubbles.coachForFamilyBubble || 0)) > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        <span className="text-white text-xs font-bold">{Math.max(notifications?.unreadCoachMessages || 0, chatBubbles.coachForFamilyBubble || 0)}</span>
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

        {/* Aviso renovaciones (aunque estén inactivos) */}
        {!playersLoading && activeSeason?.permitir_renovaciones && pendingInactivePlayers.length > 0 && (
          <Card className="border-2 border-emerald-300 bg-emerald-50 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900">Es hora de renovar tu plaza</p>
                    <p className="text-xs text-emerald-800">Tienes {pendingInactivePlayers.length} jugador(es) pendientes de renovar</p>
                  </div>
                </div>
                <Link to={createPageUrl('ParentPlayers')}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Renovar ahora</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widget de estado de renovaciones REMOVIDO - solo mostrar si hay jugadores pendientes activos */}
        {!playersLoading && activeSeason?.permitir_renovaciones && myPlayers.length > 0 && myPlayers.some(p => p.estado_renovacion === "pendiente" && p.temporada_renovacion === activeSeason?.temporada) && (
          <RenewalStatusWidget 
            players={myPlayers} 
            payments={payments}
            seasonConfig={activeSeason}
          />
        )}

        {/* Banner dividido: Clasificaciones (izq) + Próximo Partido (der) */}
        {!playersLoading && myPlayers.length > 0 && (
          <ClassificationsAndMatchesBanner userEmail={user?.email} myPlayers={myPlayers} />
        )}


        {/* ÚNICO CENTRO DE ALERTAS CONSOLIDADO - SIEMPRE VISIBLE */}
        <AlertCenter 
            pendingCallups={notifications?.pendingCallups || pendingCallups}
            pendingDocuments={allDocuments.length > 0 ? allDocuments.filter(d => {
              if (!d.publicado || !d.requiere_firma) return false;
              const isRelevant = d.tipo_destinatario === "individual" 
                ? myPlayers.some(p => d.jugadores_destino?.includes(p.id))
                : (d.categoria_destino === "Todos" || myPlayers.some(p => p.deporte === d.categoria_destino));
              if (!isRelevant) return false;
              return myPlayers.some(player => {
                const isRelevantForPlayer = d.tipo_destinatario === "individual" 
                  ? d.jugadores_destino?.includes(player.id)
                  : (d.categoria_destino === "Todos" || player.deporte === d.categoria_destino);
                if (!isRelevantForPlayer) return false;
                const firma = d.firmas?.find(f => f.jugador_id === player.id);
                return firma && !firma.firmado && !firma.confirmado_firma_externa;
              });
            }).length : 0}
            pendingPayments={(() => {
              const { pendingPayments } = calculatePaymentStats(allPayments, myPlayers.map(p => p.id), customPaymentPlans);
              return pendingPayments;
            })()}
            paymentsInReview={(() => {
              const { paymentsInReview } = calculatePaymentStats(allPayments, myPlayers.map(p => p.id), customPaymentPlans);
              return paymentsInReview;
            })()}
            overduePayments={(() => {
              const { overduePayments } = calculatePaymentStats(allPayments, myPlayers.map(p => p.id), customPaymentPlans);
              return overduePayments;
            })()}
            pendingSurveys={activeSurveys.length}
            pendingSignatures={pendingFederationSignatures}
            upcomingEvents={0}
            newGalleryPhotos={0}
            hasActiveAdminChat={notifications?.hasActiveAdminConversation || hasActiveAdminChat}
            unreadCoordinatorMessages={notifications?.unreadCoordinatorMessages || 0}
            unreadCoachMessages={notifications?.unreadCoachMessages || 0}
            unreadPrivateMessages={notifications?.unreadPrivateMessages || 0}
            unreadAdminMessages={notifications?.unreadAdminMessages || 0}
            isAdmin={false}
            isCoach={false}
            isParent={true}
            userEmail={user?.email}
            userSports={myPlayersSports}
          />

        {/* HAZTE SOCIO BANNER - COMPACTO */}
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

        {/* Captación: Compartir inscripción por WhatsApp */}
        <CaptacionShareBanner link="https://alta-socio.vercel.app/jugadores.html" />

        {/* BANNER FÚTBOL FEMENINO - COMPARTIR POR WHATSAPP */}
        {activeSeason?.bonus_femenino_activo && myPlayers && myPlayers.length > 0 && (
          <FemeninoShareBanner />
        )}

        {/* LOTERIA NAVIDAD - COMPACTO */}
        {loteriaVisible && (
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

        {/* Botón de configuración de dashboard */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={availableButtons}
            selectedButtonIds={selectedButtonIds}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_PARENT_BUTTONS}
            panelName="Panel Familias"
          />
        </div>





        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
                
                {/* Badge tipo header móvil - esquina superior derecha */}
                {item.mobileBadge && (
                  <div className="absolute -top-2 -right-2 z-20 px-2 py-1 bg-green-500 text-white text-xs rounded-lg font-bold animate-pulse shadow-lg border-2 border-white">
                    {item.mobileBadge.emoji} {item.mobileBadge.count}
                  </div>
                )}
                
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce transition-all duration-300`}>
                    <item.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white transition-transform duration-300" />
                  </div>
                  
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">
                    {item.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {playersLoading ? (
          <DashboardCardSkeleton />
        ) : (
          (() => {
            const { pendingPayments: pagosPendientes, overduePayments: pagosVencidos, paymentsInReview: pagosRevision } = calculatePaymentStats(allPayments, myPlayers.map(p => p.id), customPaymentPlans);
            const totalPayments = pagosPendientes + pagosVencidos + pagosRevision;
            
            return (
              <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <div className="text-center">
                    <div className="text-2xl lg:text-4xl font-bold text-orange-500 mb-1">
                      {myPlayers.length}
                    </div>
                    <div className="text-slate-400 text-[10px] lg:text-sm">Jugadores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl lg:text-4xl font-bold text-red-500 mb-1">
                      {totalPayments}
                    </div>
                    <div className="text-slate-400 text-[10px] lg:text-sm">Pagos Totales</div>
                    <div className="text-slate-500 text-[8px] lg:text-[10px] mt-1">
                      {pagosVencidos > 0 && `${pagosVencidos} vencidos`}
                      {pagosVencidos > 0 && (pagosPendientes > 0 || pagosRevision > 0) && ' • '}
                      {pagosPendientes > 0 && `${pagosPendientes} pendientes`}
                      {pagosPendientes > 0 && pagosRevision > 0 && ' • '}
                      {pagosRevision > 0 && `${pagosRevision} en revisión`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl lg:text-4xl font-bold text-yellow-500 mb-1">
                      {pendingCallups}
                    </div>
                    <div className="text-slate-400 text-[10px] lg:text-sm">Convocatorias</div>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        <ContactCard />
      </div>
    </div>
  );
}