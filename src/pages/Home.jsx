import React, { useState, useEffect, useMemo, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, CreditCard, ShoppingBag, Calendar, Megaphone, Image, Clock, MessageCircle, Bell, Settings, ClipboardCheck, CheckCircle2, Star, TrendingUp, FileText, Clover, BookOpen, Archive, BarChart3, FileSignature, Heart, BellRing, Sparkles, Award, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import SocialLinks from "../components/SocialLinks";
import ShareFormButton from "../components/players/ShareFormButton";

import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_ADMIN_BUTTONS, DEFAULT_ADMIN_BUTTONS } from "../components/dashboard/AdminDashboardButtons";

import ClubStats from "../components/dashboard/ClubStats";
import DashboardCardSkeleton from "../components/skeletons/DashboardCardSkeleton";
import AlertCenter from "../components/dashboard/AlertCenter";
import DuplicatePlayersAlert from "../components/admin/DuplicatePlayersAlert";
import PaymentApprovalNotifier from "../components/payments/PaymentApprovalNotifier";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function Home() {
  console.log('🏠 [Home] Componente montado');
  
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [userRole, setUserRole] = useState("parent");
  const [loteriaVisible, setLoteriaVisible] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  // Pausa global de consultas cuando el Layout detecta 429/503
  const realtimePaused = typeof window !== 'undefined' && window.__BASE44_PAUSE_REALTIME__ === true;
  const queriesEnabled = !!user && !realtimePaused && !shouldRedirect;

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    staleTime: 300000, // 5 minutos
    gcTime: 600000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled,
  });

  const clothingStoreUrl = seasonConfig?.tienda_ropa_url || null;
  const merchStoreUrl = seasonConfig?.tienda_merch_url || null;

  useEffect(() => {
    if (seasonConfig) {
      setLoteriaVisible(seasonConfig.loteria_navidad_abierta === true);
    }
  }, [seasonConfig]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('👤 [Home] Cargando usuario...');
        const currentUser = await base44.auth.me();
        console.log('✅ [Home] Usuario cargado:', currentUser.email, 'role:', currentUser.role);
        setUser(currentUser);
        const adminCheck = currentUser.role === "admin";
        const coordinatorCheck = currentUser.es_coordinador === true;
        const coachCheck = currentUser.es_entrenador === true && !coordinatorCheck && !adminCheck;
        setIsAdmin(adminCheck);
        setIsCoordinator(coordinatorCheck);
        setIsCoach(coachCheck);

        if (adminCheck) {
          setUserRole("admin");
        } else if (currentUser.es_junta === true) {
          // Miembro de Junta: se queda en Home con banner de KPIs
          setUserRole("junta");
        } else if (coordinatorCheck) {
          console.log('🎓 [Home] Coordinador en Home - redirigiendo a CoordinatorDashboard');
          setUserRole("coordinator");
          window.location.href = createPageUrl('CoordinatorDashboard');
          return;
        } else if (coachCheck) {
          console.log('🏃 [Home] Entrenador en Home - redirigiendo a CoachDashboard');
          setUserRole("coach");
          window.location.href = createPageUrl('CoachDashboard');
          return;
        } else {
          console.log('👨‍👩‍👧 [Home] Usuario padre en Home - redirigiendo a ParentDashboard');
          setUserRole("parent");
          window.location.href = createPageUrl('ParentDashboard');
          return;
        }

        if (adminCheck || currentUser.es_entrenador || currentUser.es_coordinador) {
          // Para admin/entrenadores/coordinadores, SOLO usar el campo manual
          const tienehijos = currentUser.tiene_hijos_jugando === true;
          setHasPlayers(tienehijos);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    staleTime: 60000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && (isAdmin || isCoach || isCoordinator || hasPlayers),
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && (isAdmin || hasPlayers || user?.es_junta),
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 50),
    initialData: [],
    staleTime: 5000,
    gcTime: 300000,
    refetchOnWindowFocus: true, // ✅ Actualizar SIEMPRE al volver
    refetchOnMount: true,
    refetchInterval: 10000,
    enabled: queriesEnabled && (hasPlayers || isAdmin || isCoordinator || isCoach),
  });

  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversationsHome'],
    queryFn: () => base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha', 30),
    initialData: [],
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && (isAdmin || isCoordinator || hasPlayers),
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
    staleTime: 60000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && (isAdmin || isCoach || isCoordinator || hasPlayers),
  });

  const { data: matchObservations = [] } = useQuery({
    queryKey: ['matchObservations'],
    queryFn: () => base44.entities.MatchObservation.list(),
    initialData: [],
    staleTime: 60000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: queriesEnabled && (isCoach || isCoordinator),
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && (isAdmin || user?.es_junta),
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list(),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && isAdmin,
  });

  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-created_date'),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && (isCoach || isCoordinator) && hasPlayers,
  });

  const { data: surveyResponses } = useQuery({
    queryKey: ['surveyResponses'],
    queryFn: () => base44.entities.SurveyResponse.list(),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && ((isCoach || isCoordinator) && hasPlayers || isAdmin),
  });

  // Encuestas para admin (ver todas las respuestas nuevas)
  const { data: allSurveys } = useQuery({
    queryKey: ['allSurveys'],
    queryFn: () => base44.entities.Survey.list('-created_date'),
    initialData: [],
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: queriesEnabled && isAdmin,
  });

  // Eventos para admin (ver confirmaciones recientes)
  const { data: events } = useQuery({
    queryKey: ['eventsHome'],
    queryFn: () => base44.entities.Event.list('-fecha'),
    initialData: [],
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: queriesEnabled && isAdmin,
  });

  // Pedidos de ropa para admin
  const { data: clothingOrders } = useQuery({
    queryKey: ['clothingOrdersHome'],
    queryFn: () => base44.entities.ClothingOrder.list('-created_date'),
    initialData: [],
    staleTime: 30000, // 30 segundos
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled && isAdmin,
  });

  // Solicitudes de socios para admin
  const { data: clubMembers } = useQuery({
    queryKey: ['clubMembersHome'],
    queryFn: () => base44.entities.ClubMember.list('-created_date'),
    initialData: [],
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: queriesEnabled && isAdmin,
  });

  // Pedidos de lotería para admin
  const { data: lotteryOrders } = useQuery({
    queryKey: ['lotteryOrdersHome'],
    queryFn: () => base44.entities.LotteryOrder.list('-created_date'),
    initialData: [],
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: queriesEnabled && isAdmin && loteriaVisible,
  });

  // Solicitudes de invitación pendientes (jugadores +18)
  const { data: invitationRequests = [] } = useQuery({
    queryKey: ['invitationRequestsHome'],
    queryFn: () => base44.entities.InvitationRequest.list('-created_date'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    enabled: queriesEnabled && isAdmin,
  });

  const pendingInvitationRequests = invitationRequests.filter(r => r.estado === "pendiente").length;

  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations'],
    queryFn: () => base44.entities.CoordinatorConversation.list(),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: true, // ✅ Actualizar al volver al Home
    refetchOnMount: true, // ✅ Actualizar al montar
    refetchInterval: false,
    enabled: queriesEnabled,
  });

  const { data: adminConversations = [] } = useQuery({
    queryKey: ['adminConversationsHome'],
    queryFn: () => base44.entities.AdminConversation.list(),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: true, // ✅ Actualizar al volver al Home
    refetchOnMount: true, // ✅ Actualizar al montar
    refetchInterval: false,
    enabled: queriesEnabled && !isAdmin,
  });

  // Queries DIRECTAS para badges de chat (fuente verdad = BD)
  const { data: coachConversations = [] } = useQuery({
    queryKey: ['coachConversationsHome'],
    queryFn: async () => {
      if (!user?.es_entrenador) return [];
      return await base44.entities.CoachConversation.filter({ entrenador_email: user.email });
    },
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: true, // ✅ Actualizar al volver
    refetchOnMount: true,
    enabled: queriesEnabled && (user?.es_entrenador || isAdmin),
  });

  // Configuración de botones del dashboard
  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "admin"
      });
      return configs;
    },
    staleTime: 600000,
    enabled: queriesEnabled && isAdmin,
  });

  const userButtonConfig = buttonConfigs[0];

  // Staff conversation (para badge de no leídos en "Staff")
  const { data: staffConversationHome } = useQuery({
    queryKey: ['staffConversationHome'],
    queryFn: async () => {
      const convs = await base44.entities.StaffConversation.filter({ categoria: 'General' });
      return convs[0] || null;
    },
    staleTime: 5000,
    refetchOnWindowFocus: true, // ✅ Actualizar SIEMPRE al volver
    refetchOnMount: true,
    refetchInterval: 10000,
    enabled: queriesEnabled && (isCoordinator || isCoach || isAdmin),
  });

  const { data: staffMessagesHome = [] } = useQuery({
    queryKey: ['staffMessagesHome', staffConversationHome?.id],
    queryFn: async () => {
      if (!staffConversationHome?.id) return [];
      return await base44.entities.StaffMessage.filter({ conversacion_id: staffConversationHome.id }, 'created_date');
    },
    staleTime: 5000,
    refetchOnWindowFocus: true, // ✅ Actualizar SIEMPRE al volver
    refetchOnMount: true,
    refetchInterval: 10000,
    enabled: queriesEnabled && !!staffConversationHome?.id,
  });

  const saveButtonConfigMutation = useMutation({
    mutationFn: async (selectedButtonIds) => {
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: selectedButtonIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "admin",
          selected_buttons: selectedButtonIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
      toast.success("✅ Configuración guardada");
    },
  });

  const myPlayers = useMemo(() => {
    if (!user || !isCoach || !hasPlayers || !players) return [];
    return players.filter(p => p.email_padre === user.email || p.email_tutor_2 === user.email);
  }, [user, isCoach, hasPlayers, players]);

  const myPlayersSports = useMemo(() => {
    return [...new Set(myPlayers.map(p => p.deporte))];
  }, [myPlayers]);

  const activeSurveys = useMemo(() => {
    if (!isCoach || !hasPlayers || !surveys || !surveyResponses || !user) return [];
    const now = new Date();
    return surveys.filter(s => {
      if (!s.activa || new Date(s.fecha_fin) < now) return false;
      if (s.destinatarios === "Todos" || myPlayersSports.includes(s.destinatarios)) {
        return !surveyResponses.some(r => r.survey_id === s.id && r.respondente_email === user.email);
      }
      return false;
    });
  }, [isCoach, hasPlayers, surveys, surveyResponses, user, myPlayersSports]);

  const { data: allUsers } = useQuery({
    queryKey: ['allUsersForPlayerCheck'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    enabled: queriesEnabled && isAdmin,
  });

  const stats = useMemo(() => {
    const activePlayers = players?.filter(p => p.activo).length || 0;
    
    // FILTRAR PAGOS SEGÚN ROL
    let pendingPayments = 0;
    let reviewPayments = 0;
    let overduePayments = 0;

    if (isAdmin || user?.es_junta) {
      // Admin y Junta ven TODOS los pagos del club
      // NO contar pagos ya reconciliados como pendientes
      const allPendingPayments = payments?.filter(p => 
        p.estado === "Pendiente" && 
        p.is_deleted !== true && 
        p.reconciliado_banco !== true
      ) || [];
      
      console.log('💳 [Home DEBUG] Pagos pendientes encontrados:', allPendingPayments.length, allPendingPayments.map(p => ({
        jugador: p.jugador_nombre,
        mes: p.mes,
        temporada: p.temporada,
        cantidad: p.cantidad
      })));
      
      pendingPayments = allPendingPayments.length;
      reviewPayments = payments?.filter(p => 
        p.estado === "En revisión" && 
        p.is_deleted !== true && 
        p.reconciliado_banco !== true
      ).length || 0;
    } else if (user && !isAdmin && !isCoach && !isCoordinator) {
      // Padres ven SOLO pagos de sus jugadores
      const myPlayerIds = players?.filter(p => 
        (p.email_padre === user.email || p.email_tutor_2 === user.email) && p.activo === true
      ).map(p => p.id) || [];
      
      const myPayments = payments?.filter(p => 
        myPlayerIds.includes(p.jugador_id) && p.is_deleted !== true
      ) || [];
      
      const currentSeason = (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
      })();
      
      // Normalizar temporadas
      const normalizeSeason = (season) => {
        if (!season) return currentSeason;
        return season.replace(/-/g, '/');
      };
      
      const myCurrentSeasonPayments = myPayments.filter(p => 
        normalizeSeason(p.temporada) === normalizeSeason(currentSeason)
      );
      
      pendingPayments = myCurrentSeasonPayments.filter(p => p.estado === "Pendiente").length;
      reviewPayments = myCurrentSeasonPayments.filter(p => p.estado === "En revisión").length;
      
      // Calcular pagos vencidos (solo para padres)
      const now = new Date();
      myCurrentSeasonPayments.forEach(payment => {
        if (payment.estado !== "Pagado") {
          const mes = payment.mes;
          const year = parseInt(currentSeason.split('/')[0]);
          let vencimiento;
          
          if (mes === "Junio") {
            vencimiento = new Date(year, 5, 30); // 30 de junio
          } else if (mes === "Septiembre") {
            vencimiento = new Date(year, 8, 15); // 15 de septiembre
          } else if (mes === "Diciembre") {
            vencimiento = new Date(year, 11, 15); // 15 de diciembre
          }
          
          if (vencimiento && now >= vencimiento) {
            overduePayments++;
          }
        }
      });
    }
    
    const paidPayments = payments?.filter(p => p.estado === "Pagado").length || 0;
    const unreadMessages = messages?.filter(m => !m.leido && m.tipo === "padre_a_grupo").length || 0;

    let pendingCallups = 0;
    let pendingSignatures = 0;
    let adminPendingSignatures = 0;
    let pendingPlayerAccess = 0;
    
    const calcularEdad = (fechaNac) => {
      if (!fechaNac) return null;
      const hoy = new Date();
      const nacimiento = new Date(fechaNac);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
      return edad;
    };

    // Para admin: detectar jugadores +18 que deberían tener acceso de jugador
    if (isAdmin && players && allUsers) {
      const usersWithPlayerAccess = allUsers.filter(u => u.es_jugador === true).map(u => u.player_id);
      
      players.filter(p => p.activo).forEach(player => {
        const edad = calcularEdad(player.fecha_nacimiento);
        // Si es mayor de 18, tiene email, y no está vinculado a ningún usuario como jugador
        if (edad >= 18 && player.email_padre && !usersWithPlayerAccess.includes(player.id)) {
          // Verificar si existe un usuario con ese email que NO tiene es_jugador=true
          const userForPlayer = allUsers.find(u => u.email === player.email_padre);
          if (userForPlayer && !userForPlayer.es_jugador) {
            pendingPlayerAccess++;
          }
        }
      });
    }
    
    // Para admin: calcular TODAS las firmas pendientes del club
    if (isAdmin && players) {
      players.filter(p => p.activo).forEach(player => {
        const hasEnlaceJugador = !!player.enlace_firma_jugador;
        const hasEnlaceTutor = !!player.enlace_firma_tutor;
        const firmaJugadorOk = player.firma_jugador_completada === true;
        const firmaTutorOk = player.firma_tutor_completada === true;
        const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
        
        if (hasEnlaceJugador && !firmaJugadorOk) adminPendingSignatures++;
        if (hasEnlaceTutor && !firmaTutorOk && !esMayorDeEdad) adminPendingSignatures++;
      });
    }
    
    // Para usuarios con hijos: calcular firmas de sus hijos
    if (user && hasPlayers && players) {
      const myPlayersList = players.filter(p => 
        p.email_padre === user.email || p.email_tutor_2 === user.email
      );
      const today = new Date().toISOString().split('T')[0];
      
      // Calcular convocatorias pendientes
      if (callups) {
        callups.forEach(callup => {
          if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
            callup.jugadores_convocados?.forEach(jugador => {
              if (myPlayersList.some(p => p.id === jugador.jugador_id) && jugador.confirmacion === "pendiente") {
                pendingCallups++;
              }
            });
          }
        });
      }
      
      // Calcular firmas pendientes de mis hijos
      myPlayersList.forEach(player => {
        const hasEnlaceJugador = !!player.enlace_firma_jugador;
        const hasEnlaceTutor = !!player.enlace_firma_tutor;
        const firmaJugadorOk = player.firma_jugador_completada === true;
        const firmaTutorOk = player.firma_tutor_completada === true;
        const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
        
        if (hasEnlaceJugador && !firmaJugadorOk) pendingSignatures++;
        if (hasEnlaceTutor && !firmaTutorOk && !esMayorDeEdad) pendingSignatures++;
      });
    }

    // Stats adicionales para admin
    let pendingClothingOrders = 0;
    let pendingLotteryOrders = 0;
    let pendingMemberRequests = 0;
    let recentSurveyResponses = 0;
    let pendingEventConfirmations = 0;

    if (isAdmin) {
      // Pedidos de ropa en revisión
      pendingClothingOrders = clothingOrders?.filter(o => o.estado === "En revisión" || o.estado === "Pendiente").length || 0;
      
      // Pedidos de lotería pendientes (sin pagar) SOLO de temporada activa
      const activeSeasonName = seasonConfig?.temporada ? seasonConfig.temporada.replace(/-/g,'/') : null;
      pendingLotteryOrders = lotteryOrders?.filter(o => {
        const orderSeason = (o.temporada || '').replace(/-/g,'/');
        return !o.pagado && (!activeSeasonName || orderSeason === activeSeasonName);
      }).length || 0;
      
      // Solicitudes de socios pendientes (incluir "En revisión" Y "Pendiente")
      pendingMemberRequests = clubMembers?.filter(m => 
        m.estado_pago === "En revisión" || m.estado_pago === "Pendiente"
      ).length || 0;
      
      // Respuestas de encuestas en las últimas 24 horas
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      recentSurveyResponses = surveyResponses?.filter(r => new Date(r.created_date) > yesterday).length || 0;
      
      // Eventos próximos con confirmaciones pendientes
      const today = new Date().toISOString().split('T')[0];
      events?.filter(e => e.requiere_confirmacion && e.publicado && e.fecha >= today).forEach(event => {
        const totalConfirmaciones = event.confirmaciones?.length || 0;
        // Si tiene menos de 5 confirmaciones y es un evento reciente, mostrarlo
        if (totalConfirmaciones > 0) {
          // Contar confirmaciones en las últimas 24h
          const recentConfirm = event.confirmaciones?.filter(c => new Date(c.fecha_confirmacion) > yesterday).length || 0;
          pendingEventConfirmations += recentConfirm;
        }
      });
    }

    // Calcular mensajes privados no leídos
    let unreadPrivateMessages = 0;
    if (user && privateConversations) {
      privateConversations.forEach(conv => {
        if (conv.participante_familia_email === user.email) {
          unreadPrivateMessages += (conv.no_leidos_familia || 0);
        } else if (conv.participante_staff_email === user.email) {
          // Staff asignado directamente
          unreadPrivateMessages += (conv.no_leidos_staff || 0);
        } else if (isAdmin || isCoordinator) {
          // Admin y Coordinador ven TODAS las conversaciones con mensajes no leídos
          unreadPrivateMessages += (conv.no_leidos_staff || 0);
        }
      });
    }

    // Calcular mensajes de Staff no leídos (para badge en "Staff")
    let unreadStaffMessages = 0;
    if (user && staffMessagesHome) {
      unreadStaffMessages = staffMessagesHome.filter(m =>
        m.autor_email !== user.email &&
        !(m.leido_por || []).some(l => l.email === user.email)
      ).length;
    }

    // Calcular respuestas pendientes de convocatorias (para entrenadores/admin)
    let pendingCallupResponses = 0;
    if ((isAdmin || isCoach || isCoordinator) && callups) {
      const today = new Date().toISOString().split('T')[0];
      const coachCategories = user?.categorias_entrena || [];
      
      callups.forEach(callup => {
        if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
          const isMyCategory = isAdmin || coachCategories.includes(callup.categoria);
          if (isMyCategory) {
            callup.jugadores_convocados?.forEach(jugador => {
              if (jugador.confirmacion === "pendiente") {
                pendingCallupResponses++;
              }
            });
          }
        }
      });
    }



    // Calcular mensajes admin no leídos
    let unreadAdminMessages = 0;
    let hasActiveAdminChat = false;
    let unresolvedAdminChats = 0;
    
    if (user && adminConversations && !isAdmin) {
      const myAdminConv = adminConversations.find(c => 
        c.padre_email === user.email && !c.resuelta
      );
      if (myAdminConv) {
        hasActiveAdminChat = true;
        unreadAdminMessages = myAdminConv.no_leidos_padre || 0;
      }
    }
    
    // Para admin: contar conversaciones críticas sin resolver
    if (isAdmin && adminConversations) {
      unresolvedAdminChats = adminConversations.filter(c => !c.resuelta).length;
    }

    // Calcular partidos pendientes de observación (para entrenadores/coordinadores)
    let pendingMatchObservations = 0;
    if ((isCoach || isCoordinator) && user && callups && matchObservations) {
      const now = new Date();
      
      const myCallups = callups.filter(c => {
        if (c.entrenador_email !== user.email || !c.publicada) return false;
        
        // Calcular hora estimada de finalización del partido
        const matchDate = new Date(c.fecha_partido);
        if (matchDate > now) return false; // Partido no ha empezado aún
        
        // Si tiene hora_partido, calcular fin estimado (2h + 15min)
        if (c.hora_partido) {
          const [hours, minutes] = c.hora_partido.split(':').map(Number);
          const matchStart = new Date(matchDate);
          matchStart.setHours(hours, minutes, 0, 0);
          
          // Duración partido (2h) + margen (15min) = 135 minutos
          const matchEnd = new Date(matchStart.getTime() + 135 * 60000);
          
          return now >= matchEnd;
        }
        
        // Si no tiene hora, esperar al día siguiente
        const nextDay = new Date(matchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return now >= nextDay;
      });

      pendingMatchObservations = myCallups.filter(callup => {
        const hasObservation = matchObservations.some(obs =>
          obs.categoria === callup.categoria &&
          obs.rival === callup.rival &&
          obs.fecha_partido === callup.fecha_partido
        );
        return !hasObservation;
      }).length;
    }

    return { 
      activePlayers, pendingPayments, reviewPayments, paidPayments, unreadMessages, unreadPrivateMessages, unreadStaffMessages,
      pendingCallups, pendingSignatures, adminPendingSignatures, pendingPlayerAccess,
      pendingClothingOrders, pendingLotteryOrders, pendingMemberRequests, 
      recentSurveyResponses, pendingEventConfirmations, pendingCallupResponses,
      unreadAdminMessages, hasActiveAdminChat, overduePayments, pendingMatchObservations, unresolvedAdminChats
    };
  }, [players, payments, messages, callups, user, hasPlayers, isAdmin, allUsers, clothingOrders, lotteryOrders, clubMembers, surveyResponses, events, privateConversations, adminConversations, isCoordinator, isCoach, coordinatorConversations, matchObservations, staffMessagesHome, seasonConfig]);



  // Determinar botones a mostrar según configuración
  const selectedButtonIds = userButtonConfig?.selected_buttons || DEFAULT_ADMIN_BUTTONS;
  
  const availableAdminButtons = ALL_ADMIN_BUTTONS.filter(button => {
    if (button.conditional && button.conditionKey === "loteriaVisible") return loteriaVisible;
    return true;
  });

  const displayAdminButtons = selectedButtonIds
    .map(id => availableAdminButtons.find(b => b.id === id))
    .filter(Boolean);

  const menuItems = useMemo(() => {
    const items = [];

    if (isAdmin) {
      // Usar botones configurados en lugar de lista hardcoded
      return displayAdminButtons.map(item => {
        const updated = { ...item };
        if (item.id === "ropa") { updated.url = createPageUrl("Shop"); }

        // Añadir badges dinámicos
        if (item.id === "pagos") {
          updated.badge = stats.reviewPayments;
          updated.badgeLabel = "en revisión";
        }
        if (item.id === "firmas") {
          updated.badge = stats.adminPendingSignatures;
          updated.badgeLabel = "pendientes";
        }
        if (item.id === "jugadores") {
          updated.badge = stats.activePlayers;
          updated.badgeLabel = "activos";
        }
        if (item.id === "ropa") {
          updated.badge = stats.pendingClothingOrders;
          updated.badgeLabel = "pendientes";
        }
        if (item.id === "socios") {
          updated.badge = stats.pendingMemberRequests;
          updated.badgeLabel = "pendientes";
        }
        if (item.id === "invitaciones") {
          updated.badge = pendingInvitationRequests;
          updated.badgeLabel = "pendientes";
        }
        if (item.id === "convocatorias") {
          updated.badge = stats.pendingCallupResponses;
          updated.badgeLabel = "respuestas";
        }
        if (item.id === "encuestas") {
          updated.badge = stats.recentSurveyResponses;
          updated.badgeLabel = "nuevas";
        }
        if (item.id === "chat_critico") {
          updated.badge = stats.unreadPrivateMessages;
          updated.badgeLabel = "sin resolver";
        }

        return updated;
      });
    } else if (false) {
      // ADMIN: Ordenado por prioridad de uso diario
      
      // 1. TAREAS URGENTES - Lo primero que necesita revisar
      items.push(
        {
          title: "💳 Pagos",
          icon: CreditCard,
          url: createPageUrl("Payments"),
          gradient: "from-green-600 to-green-700",
          badge: stats.reviewPayments, // Solo mostrar pagos EN REVISIÓN (no pendientes sin justificante)
          badgeLabel: "en revisión"
        },

        {
          title: "🖊️ Firmas Federación",
          icon: FileSignature,
          url: createPageUrl("FederationSignaturesAdmin"),
          gradient: "from-yellow-600 to-orange-600",
          badge: stats.adminPendingSignatures,
          badgeLabel: "pendientes"
        }
      );

      // 2. GESTIÓN PRINCIPAL
      items.push(
        {
          title: "👥 Jugadores",
          icon: Users,
          url: createPageUrl("Players"),
          gradient: "from-orange-600 to-orange-700",
          badge: stats.activePlayers,
          badgeLabel: "activos"
        },
        {
          title: "🔄 Dashboard Renovaciones",
          icon: RotateCw,
          url: createPageUrl("RenewalDashboard"),
          gradient: "from-cyan-600 to-cyan-700",
        },
        {
          title: "👤 Usuarios",
          icon: Users,
          url: createPageUrl("UserManagement"),
          gradient: "from-blue-600 to-blue-700",
        },
        {
          title: "🛍️ Tienda Equipación",
          icon: ShoppingBag,
          url: clothingStoreUrl || createPageUrl("ClothingOrders"),
          gradient: "from-teal-600 to-teal-700",
          badge: stats.pendingClothingOrders,
          badgeLabel: "pendientes"
        },
        {
          title: "🎫 Gestión Socios",
          icon: Heart,
          url: createPageUrl("ClubMembersManagement"),
          gradient: "from-pink-600 to-pink-700",
          badge: stats.pendingMemberRequests,
          badgeLabel: "pendientes"
        },
        {
          title: "📧 Solicitudes Invitación",
          icon: Bell,
          url: createPageUrl("InvitationRequests"),
          gradient: "from-purple-600 to-purple-700",
          badge: pendingInvitationRequests,
          badgeLabel: "pendientes"
        }
      );

      // 3. FINANZAS
      items.push(
        {
          title: "📊 Panel Financiero",
          icon: TrendingUp,
          url: createPageUrl("TreasurerDashboard"),
          gradient: "from-emerald-600 to-emerald-700",
        },
        {
          title: "🔔 Recordatorios Simples",
          icon: Bell,
          url: createPageUrl("PaymentReminders"),
          gradient: "from-red-600 to-orange-700",
        },
        {
          title: "📁 Histórico",
          icon: Archive,
          url: createPageUrl("PaymentHistory"),
          gradient: "from-slate-600 to-slate-700",
        }
      );

      // 4. DEPORTIVO
      items.push(
        {
          title: "🎓 Convocatorias",
          icon: Bell,
          url: createPageUrl("CoachCallups"),
          gradient: "from-yellow-600 to-yellow-700",
          badge: stats.pendingCallupResponses,
          badgeLabel: "respuestas"
        },
        {
          title: "📊 Análisis Clasificaciones",
          icon: BarChart3,
          url: createPageUrl("CoachStandingsAnalysis"),
          gradient: "from-blue-600 to-cyan-700",
        },
        {
          title: "📋 Asistencia y Evaluación",
          icon: CheckCircle2,
          url: createPageUrl("TeamAttendanceEvaluation"),
          gradient: "from-green-600 to-green-700",
        },
        {
          title: "🏃 Entrenadores",
          icon: Award,
          url: createPageUrl("CoachProfiles"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "📊 Reportes",
          icon: Star,
          url: createPageUrl("CoachEvaluationReports"),
          gradient: "from-purple-600 to-purple-700",
        }
      );

      // 5. COMUNICACIÓN
      items.push(
        {
          title: "🛡️ Conversaciones Críticas",
          icon: Bell,
          url: createPageUrl("AdminChat"),
          gradient: "from-red-600 to-red-700",
          badge: stats.unreadPrivateMessages,
          badgeLabel: "sin resolver"
        },
        {
          title: "💬 Chat Coordinador",
          icon: MessageCircle,
          url: createPageUrl("CoordinatorChat"),
          gradient: "from-cyan-600 to-cyan-700",
        },
        {
          title: "💼 Chat Staff",
          icon: MessageCircle,
          url: createPageUrl("StaffChat"),
          gradient: "from-slate-600 to-slate-700",
        },
        {
          title: "📢 Anuncios",
          icon: Megaphone,
          url: createPageUrl("Announcements"),
          gradient: "from-pink-600 to-pink-700",
        },
        {
          title: "📄 Documentos",
          icon: FileText,
          url: createPageUrl("DocumentManagement"),
          gradient: "from-slate-600 to-slate-700",
        },
        {
          title: "📋 Encuestas",
          icon: FileText,
          url: createPageUrl("Surveys"),
          gradient: "from-purple-600 to-purple-700",
          badge: stats.recentSurveyResponses,
          badgeLabel: "nuevas"
        }
      );

      // 6. CALENDARIO Y EVENTOS
      items.push(
        {
          title: "📅 Calendario",
          icon: Calendar,
          url: createPageUrl("CalendarAndSchedules"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "🎉 Eventos",
          icon: Calendar,
          url: createPageUrl("EventManagement"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "📊 Clasificaciones",
          icon: BarChart3,
          url: createPageUrl("Clasificaciones"),
          gradient: "from-blue-600 to-cyan-700",
        },
        {
          title: "🖼️ Galería",
          icon: Image,
          url: createPageUrl("Gallery"),
          gradient: "from-indigo-600 to-indigo-700",
        }
      );

      // 7. EXTRAS
      if (loteriaVisible) {
        items.push({
          title: "🍀 Gestión Lotería",
          icon: Clover,
          url: createPageUrl("LotteryManagement"),
          gradient: "from-green-600 to-green-700",
        });
      }

      // 8. CONFIGURACIÓN
      items.push(
        {
          title: "⚙️ Configuración",
          icon: Settings,
          url: createPageUrl("SeasonManagement"),
          gradient: "from-slate-600 to-slate-700",
        }
      );

      // 9. SECCIÓN FAMILIA (si tiene hijos) - Al final
      if (hasPlayers) {
        items.push(
          {
            title: "👨‍👩‍👧 Mis Hijos",
            icon: Users,
            url: createPageUrl("ParentPlayers"),
            gradient: "from-indigo-600 to-indigo-700",
          },
          {
            title: "💳 Pagos Mis Hijos",
            icon: CreditCard,
            url: createPageUrl("ParentPayments"),
            gradient: "from-blue-600 to-blue-700",
          },
          {
            title: "🏆 Convocatorias Hijos",
            icon: ClipboardCheck,
            url: createPageUrl("ParentCallups"),
            gradient: "from-green-600 to-green-700",
            badge: stats.pendingCallups,
            badgeLabel: "pendientes"
          },
          {
            title: "🛍️ Tienda Equipación",
            icon: ShoppingBag,
            url: clothingStoreUrl || "#",
            gradient: "from-teal-600 to-teal-700",
          }
        );
        if (stats.pendingSignatures > 0) {
          items.push({
            title: "🖊️ Firmas Hijos",
            icon: FileSignature,
            url: createPageUrl("FederationSignatures"),
            gradient: "from-yellow-600 to-orange-600",
            badge: stats.pendingSignatures,
            badgeLabel: "pendientes"
          });
        }
      }
    } else if (isCoach || isCoordinator) {
      // ENTRENADOR/COORDINADOR: Ordenado por uso diario
      
      // 1. LO MÁS URGENTE - Convocatorias y Chat
      items.push({
        title: "🎓 Convocatorias",
        icon: Bell,
        url: createPageUrl("CoachCallups"),
        gradient: "from-yellow-600 to-yellow-700",
      });

      // 2. GESTIÓN DEPORTIVA
      items.push(
        {
          title: "📋 Asistencia y Evaluación",
          icon: CheckCircle2,
          url: createPageUrl("TeamAttendanceEvaluation"),
          gradient: "from-green-600 to-green-700",
        },
        {
          title: "🎓 Plantillas",
          icon: Users,
          url: createPageUrl("TeamRosters"),
          gradient: "from-blue-600 to-blue-700",
        },
        {
          title: "📊 Reportes",
          icon: Star,
          url: createPageUrl("CoachEvaluationReports"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "📚 Biblioteca Ejercicios",
          icon: BookOpen,
          url: createPageUrl("ExerciseLibrary"),
          gradient: "from-cyan-600 to-cyan-700",
        },
        {
          title: "🎯 Pizarra Táctica",
          icon: BarChart3,
          url: createPageUrl("TacticsBoard"),
          gradient: "from-slate-600 to-slate-700",
        }
      );

      // Firmas Federación solo si tiene permiso
      if (user?.puede_gestionar_firmas) {
        items.push({
          title: "🖊️ Firmas Federación",
          icon: FileSignature,
          url: createPageUrl("FederationSignaturesAdmin"),
          gradient: "from-yellow-600 to-orange-600",
        });
      }

      // 3. CALENDARIO E INFO
      items.push(
        {
          title: "📅 Calendario",
          icon: Calendar,
          url: createPageUrl("CalendarAndSchedules"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "📢 Anuncios",
          icon: Megaphone,
          url: createPageUrl("Announcements"),
          gradient: "from-pink-600 to-pink-700",
        },
        {
          title: "🎉 Eventos Club",
          icon: Calendar,
          url: createPageUrl("ParentEventRSVP"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "📊 Clasificaciones",
          icon: BarChart3,
          url: createPageUrl("Clasificaciones"),
          gradient: "from-blue-600 to-cyan-700",
        },
        {
          title: "🖼️ Galería",
          icon: Image,
          url: createPageUrl("Gallery"),
          gradient: "from-indigo-600 to-indigo-700",
        }
      );

      // 4. SECCIÓN FAMILIA (si tiene hijos) - Agrupado
      if (hasPlayers) {
        items.push(
          {
            title: "👨‍👩‍👧 Mis Hijos",
            icon: Users,
            url: createPageUrl("ParentPlayers"),
            gradient: "from-indigo-600 to-indigo-700",
          },
          {
            title: "💳 Pagos Mis Hijos",
            icon: CreditCard,
            url: createPageUrl("ParentPayments"),
            gradient: "from-green-600 to-green-700",
          },
          {
            title: "🏆 Convocatorias Hijos",
            icon: ClipboardCheck,
            url: createPageUrl("ParentCallups"),
            gradient: "from-yellow-600 to-yellow-700",
            badge: stats.pendingCallups,
            badgeLabel: "pendientes"
          },
          {
            title: "🛍️ Tienda Equipación",
            icon: ShoppingBag,
            url: clothingStoreUrl || "#",
            gradient: "from-teal-600 to-teal-700",
          }
        );
        if (stats.pendingSignatures > 0) {
          items.push({
            title: "🖊️ Firmas Hijos",
            icon: FileSignature,
            url: createPageUrl("FederationSignatures"),
            gradient: "from-orange-600 to-red-600",
            badge: stats.pendingSignatures,
            badgeLabel: "pendientes"
          });
        }
      }

      // 5. EXTRAS (menos prioritario)
      if (loteriaVisible) {
        items.push({
          title: "🍀 Gestión Lotería",
          icon: Clover,
          url: createPageUrl("LotteryManagement"),
          gradient: "from-green-600 to-green-700",
        });
        items.push({
          title: "🍀 Mi Lotería",
          icon: Clover,
          url: createPageUrl("ParentLottery"),
          gradient: "from-red-600 to-green-700",
        });
      }
    }

    return items;
  }, [isAdmin, isCoach, isCoordinator, hasPlayers, loteriaVisible, stats, displayAdminButtons, pendingInvitationRequests, clothingStoreUrl]);

  // Redirigir padres normales a ParentDashboard
  useEffect(() => {
    if (shouldRedirect && user && userRole === "parent") {
      console.log('🔄 [Home] Redirigiendo a ParentDashboard...');
      window.location.href = createPageUrl("ParentDashboard");
    }
  }, [shouldRedirect, user, userRole]);

  // Mostrar loading mientras carga el usuario
  if (!user) {
    console.log('⏳ [Home] Mostrando loading (sin usuario)');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">
        <div className="px-4 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-3"></div>
              <p className="text-white text-sm">Cargando...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si es padre normal y está redirigiendo, mostrar loading
  if (shouldRedirect && userRole === "parent") {
    console.log('⏳ [Home] Mostrando loading (redirigiendo a ParentDashboard)');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">
        <div className="px-4 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-3"></div>
              <p className="text-white text-sm">Redirigiendo...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 [Home] Renderizando dashboard para rol:', userRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">

      <PaymentApprovalNotifier isAdmin={isAdmin} />
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SocialLinks />
            <Link to={createPageUrl("Chatbot")}>
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800">
                <Sparkles className="w-4 h-4 mr-1" />
                🤖 IA
              </Button>
            </Link>
            <Link to={createPageUrl("AdminChatsHub")}>
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <MessageCircle className="w-4 h-4 mr-1" />
                💬 Chats
              </Button>
            </Link>
          </div>
          <ShareFormButton />
        </div>



        {/* ÚNICO BANNER CONSOLIDADO DE ALERTAS - Incluye TODO */}
        {(isAdmin || isCoach || isCoordinator || hasPlayers) && (
          <AlertCenter 
            pendingCallups={stats.pendingCallups}
            pendingDocuments={0}
            pendingPayments={isAdmin ? stats.reviewPayments : stats.pendingPayments}
            overduePayments={stats.overduePayments}
            pendingSurveys={0}
            pendingSignatures={hasPlayers ? stats.pendingSignatures : (isAdmin ? stats.adminPendingSignatures : 0)}
            pendingCallupResponses={stats.pendingCallupResponses}
            upcomingEvents={0}
            pendingClothingOrders={stats.pendingClothingOrders}
            pendingMemberRequests={stats.pendingMemberRequests}
            pendingLotteryOrders={stats.pendingLotteryOrders}
            pendingInvitations={pendingInvitationRequests}
            recentSurveyResponses={stats.recentSurveyResponses}
            pendingEventConfirmations={stats.pendingEventConfirmations}
            pendingPlayerAccess={stats.pendingPlayerAccess}
            hasActiveAdminChat={stats.hasActiveAdminChat}
            pendingMatchObservations={stats.pendingMatchObservations}
            unresolvedAdminChats={stats.unresolvedAdminChats}
            isAdmin={isAdmin}
            isCoach={isCoach || isCoordinator}
            isParent={hasPlayers}
            isCoordinator={isCoordinator}
            userEmail={user?.email}
            userSports={myPlayersSports}
          />
        )}

        {/* Alerta de Jugadores Duplicados - Solo Admin */}
        {isAdmin && <DuplicatePlayersAlert />}

        {isCoach && hasPlayers && activeSurveys.length > 0 && (
          <Link to={createPageUrl("Surveys")}>
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-3 lg:p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-purple-500 animate-pulse">
              <div className="flex items-start gap-2 lg:gap-3">
                <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-bold text-sm lg:text-lg">
                    📋 ¡Nueva Encuesta Disponible!
                  </p>
                  <p className="text-purple-100 text-xs lg:text-sm mt-1">
                    {activeSurveys.length === 1 
                      ? "Hay 1 encuesta esperando tu opinión" 
                      : `Hay ${activeSurveys.length} encuestas esperando tu opinión`}
                  </p>
                  <p className="text-white text-xs mt-2 font-semibold">
                    👉 Pulsa aquí para participar
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Banner de Lotería de Navidad */}
        {loteriaVisible && (
          <Link to={createPageUrl("ParentLottery")}>
            <div className="bg-gradient-to-r from-red-600 via-green-600 to-red-600 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-4 border-yellow-400 animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">🎄</span>
                <div className="text-center">
                  <p className="text-white font-bold text-lg lg:text-xl">🍀 ¡Lotería de Navidad Abierta!</p>
                  <p className="text-yellow-200 text-xs lg:text-sm">Pide tus décimos del club • Número: 28720</p>
                </div>
                <span className="text-3xl">🎅</span>
              </div>
            </div>
          </Link>
        )}

        {/* Botón personalizar dashboard - Solo Admin */}
        {isAdmin && (
          <div className="flex justify-end">
            <DashboardButtonSelector
              allButtons={availableAdminButtons}
              selectedButtonIds={selectedButtonIds}
              onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
              minButtons={8}
              maxButtons={25}
              defaultButtons={DEFAULT_ADMIN_BUTTONS}
              panelName="Panel Admin"
            />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-6 stagger-animation">
          {menuItems.map((item, index) => {
            const isExternal = typeof item.url === 'string' && item.url.startsWith('http');
            return isExternal ? (
              <a key={index} href={item.url} target="_blank" rel="noopener noreferrer" className="group">
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
              </a>
            ) : (
              <Link key={index} to={item.url} className="group">
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
            );
          })}
        </div>

        {/* Botón de prueba de notificación - Solo Admin */}
        {isAdmin && (
          <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
            <div className="text-center space-y-3">
              <p className="text-white font-bold text-sm lg:text-base">🔔 Probar Notificaciones</p>
              <p className="text-slate-400 text-xs">Minimiza la app y pulsa el botón para recibir una notificación de prueba</p>
              <Button
                onClick={() => {
                  // Verificar si hay permiso
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (Notification.permission === 'granted') {
                      // Enviar notificación de prueba después de 3 segundos
                      console.log("⏰ Notificación programada en 3 segundos");
                      setTimeout(() => {
                        new Notification("🎉 CD Bustarviejo - Prueba", {
                          body: "¡Las notificaciones funcionan correctamente! Este mensaje llegó con la app en segundo plano.",
                          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
                        });
                      }, 3000);
                    } else if (Notification.permission === 'denied') {
                      console.log("❌ Notificaciones bloqueadas");
                    } else {
                      Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                          console.log("✅ Permiso concedido");
                        } else {
                          console.log("❌ Permiso denegado");
                        }
                      });
                    }
                  } else {
                    console.log("❌ Navegador no soporta notificaciones");
                  }
                }}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold"
              >
                <BellRing className="w-4 h-4 mr-2" />
                Enviar Notificación de Prueba
              </Button>
            </div>
          </div>
        )}

        {/* Resumen de jugadores */}
        <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
          <div className="text-center">
            <div className="text-3xl lg:text-5xl font-bold text-orange-500 mb-2">
              {stats.activePlayers}
            </div>
            <div className="text-slate-400 text-sm lg:text-base">Jugadores Activos</div>
          </div>
        </div>
      </div>
    </div>
  );
}