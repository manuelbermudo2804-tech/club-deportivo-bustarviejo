import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, CreditCard, Bell, FileSignature, BellRing, Sparkles, Clover } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import SocialLinks from "../components/SocialLinks";
import ShareFormButton from "../components/players/ShareFormButton";

import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_ADMIN_BUTTONS, DEFAULT_ADMIN_BUTTONS } from "../components/dashboard/AdminDashboardButtons";

import AlertCenter from "../components/dashboard/AlertCenter";
import DuplicatePlayersAlert from "../components/admin/DuplicatePlayersAlert";
import DesktopDashboardHeader from "../components/dashboard/DesktopDashboardHeader";
import DashboardButtonCard from "../components/dashboard/DashboardButtonCard";
import DailyTasksPanel from "../components/admin/DailyTasksPanel";

export default function Home() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [loteriaVisible, setLoteriaVisible] = useState(false);
  const realtimePaused = typeof window !== 'undefined' && window.__BASE44_PAUSE_REALTIME__ === true;
  const queriesEnabled = !!user && !realtimePaused;

  const { data: seasonConfig } = useQuery({
    queryKey: ['activeSeasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      return configs[0] || null;
    },
    staleTime: 600000, // 10 minutos - reutiliza cache con Layout/SeasonProvider
    gcTime: 900000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: queriesEnabled,
  });

  useEffect(() => {
    if (seasonConfig) {
      setLoteriaVisible(seasonConfig.loteria_navidad_abierta === true);
    }
  }, [seasonConfig]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const adminCheck = currentUser.role === "admin";
        setIsAdmin(adminCheck);

        if (adminCheck) {
          setHasPlayers(currentUser.tiene_hijos_jugando === true);
        } else if (currentUser.tipo_panel === 'jugador_menor' || currentUser.es_menor === true) {
          window.location.href = createPageUrl('MinorDashboard');
          return;
        } else if (currentUser.es_junta === true) {
          // Junta se queda en Home
        } else if (currentUser.es_tesorero) {
          window.location.href = createPageUrl('TreasurerDashboard');
          return;
        } else if (currentUser.es_coordinador) {
          window.location.href = createPageUrl('CoordinatorDashboard');
          return;
        } else if (currentUser.es_entrenador) {
          window.location.href = createPageUrl('CoachDashboard');
          return;
        } else {
          window.location.href = createPageUrl('ParentDashboard');
          return;
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['playersActive'],
    queryFn: () => base44.entities.Player.filter({ activo: true }, '-updated_date', 500),
    initialData: [],
    staleTime: 120000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: queriesEnabled && isAdmin,
  });

  const { data: payments } = useQuery({
    queryKey: ['paymentsNotDeleted'],
    queryFn: () => base44.entities.Payment.filter({ is_deleted: { $ne: true } }, '-created_date', 500),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: queriesEnabled && (isAdmin || user?.es_junta),
  });

  const { data: callups } = useQuery({
    queryKey: ['callupsActive'],
    queryFn: () => base44.entities.Convocatoria.filter({ publicada: true, cerrada: false }, '-fecha_partido', 50),
    initialData: [],
    staleTime: 60000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: queriesEnabled && isAdmin,
  });

  // LAZY-LOADED: These queries only run after initial render (non-essential for first paint)
  const [lazyEnabled, setLazyEnabled] = useState(false);
  useEffect(() => {
    if (queriesEnabled && isAdmin) {
      const t = setTimeout(() => setLazyEnabled(true), 1500);
      return () => clearTimeout(t);
    }
  }, [queriesEnabled, isAdmin]);

  // Survey responses: solo últimas 24h para el badge
  const { data: surveyResponses } = useQuery({
    queryKey: ['recentSurveyResponses'],
    queryFn: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return base44.entities.SurveyResponse.filter({
        created_date: { $gte: yesterday.toISOString() }
      }, '-created_date', 100);
    },
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: lazyEnabled,
  });

  // Events: solo futuros publicados
  const { data: events } = useQuery({
    queryKey: ['eventsHomeFuture'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.Event.filter({ publicado: true }, '-fecha', 30);
    },
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: lazyEnabled,
  });

  // Clothing orders: solo pendientes/en revisión
  const { data: clothingOrders } = useQuery({
    queryKey: ['clothingOrdersPending'],
    queryFn: async () => {
      const [pending, review] = await Promise.all([
        base44.entities.ClothingOrder.filter({ estado: 'Pendiente' }, '-created_date', 50),
        base44.entities.ClothingOrder.filter({ estado: 'En revisión' }, '-created_date', 50),
      ]);
      return [...pending, ...review];
    },
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: lazyEnabled,
  });

  // Club members: solo pendientes
  const { data: clubMembers } = useQuery({
    queryKey: ['clubMembersPending'],
    queryFn: async () => {
      const [pending, review] = await Promise.all([
        base44.entities.ClubMember.filter({ estado_pago: 'Pendiente' }),
        base44.entities.ClubMember.filter({ estado_pago: 'En revisión' }),
      ]);
      return [...pending, ...review];
    },
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: lazyEnabled,
  });

  // Lottery: solo no pagados
  const { data: lotteryOrders } = useQuery({
    queryKey: ['lotteryOrdersPending'],
    queryFn: () => base44.entities.LotteryOrder.filter({ pagado: false }, '-created_date', 50),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: lazyEnabled && loteriaVisible,
  });

  // Legacy: InvitationRequest y SecondParentInvitation eliminados - ahora todo usa AccessCode
  const pendingInvitationRequests = 0;
  const pendingMinorInvitationRequests = 0;
  const pendingSecondParentInvitationsCount = 0;

  // Configuración de botones del dashboard - con cache en localStorage
  const localStorageKey = user?.email ? `dashboard_buttons_admin_${user.email}` : null;

  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "admin"
      });
      // Guardar en localStorage al recibir datos del servidor
      if (configs[0]?.selected_buttons && localStorageKey) {
        try { localStorage.setItem(localStorageKey, JSON.stringify(configs[0].selected_buttons)); } catch(e) {}
      }
      return configs;
    },
    staleTime: 600000,
    enabled: queriesEnabled && isAdmin,
  });

  const userButtonConfig = buttonConfigs[0];

  // Leer cache de localStorage como fallback inmediato
  const cachedButtonIds = useMemo(() => {
    if (!localStorageKey) return null;
    try {
      const cached = localStorage.getItem(localStorageKey);
      return cached ? JSON.parse(cached) : null;
    } catch(e) { return null; }
  }, [localStorageKey]);

  // Staff conversation badge - eliminado polling agresivo (10s), ahora usa staleTime largo
  // Los contadores de chat se gestionan desde ChatUnreadProvider en el Layout
  const staffMessagesHome = [];

  const saveButtonConfigMutation = useMutation({
    mutationFn: async (newSelectedIds) => {
      // Guardar en localStorage inmediatamente
      if (localStorageKey) {
        try { localStorage.setItem(localStorageKey, JSON.stringify(newSelectedIds)); } catch(e) {}
      }
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: newSelectedIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "admin",
          selected_buttons: newSelectedIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
    },
  });

  const myPlayers = useMemo(() => {
    if (!user || !hasPlayers || !players) return [];
    return players.filter(p => p.email_padre === user.email || p.email_tutor_2 === user.email);
  }, [user, hasPlayers, players]);

  const myPlayersSports = useMemo(() => {
    return [...new Set(myPlayers.map(p => p.deporte))];
  }, [myPlayers]);

  // Users: solo necesarios para check jugadores +18 — lazy load
  const { data: allUsers } = useQuery({
    queryKey: ['usersForPlayerCheck'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
    initialData: [],
    staleTime: 600000,
    gcTime: 900000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: lazyEnabled && isAdmin,
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
      
          
      pendingPayments = allPendingPayments.length;
      reviewPayments = payments?.filter(p => 
        p.estado === "En revisión" && 
        p.is_deleted !== true && 
        p.reconciliado_banco !== true
      ).length || 0;
    } else if (user && !isAdmin) {
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
        return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
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
    const unreadMessages = 0;

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
      // Pedidos de ropa — ya vienen filtrados
      pendingClothingOrders = clothingOrders?.length || 0;
      
      // Pedidos de lotería pendientes (sin pagar) SOLO de temporada activa
      const activeSeasonName = seasonConfig?.temporada ? seasonConfig.temporada.replace(/-/g,'/') : null;
      pendingLotteryOrders = lotteryOrders?.filter(o => {
        const orderSeason = (o.temporada || '').replace(/-/g,'/');
        return !o.pagado && (!activeSeasonName || orderSeason === activeSeasonName);
      }).length || 0;
      
      // Solicitudes de socios — ya vienen filtradas
      pendingMemberRequests = clubMembers?.length || 0;
      
      // Respuestas de encuestas — ya vienen filtradas por últimas 24h
      recentSurveyResponses = surveyResponses?.length || 0;
      
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

    // Mensajes privados - no se cargan en Home, usar 0
    let unreadPrivateMessages = 0;
    let unreadStaffMessages = 0;

    // Calcular respuestas pendientes de convocatorias (para entrenadores/admin)
    let pendingCallupResponses = 0;
    if (isAdmin && callups) {
      const today = new Date().toISOString().split('T')[0];
      callups.forEach(callup => {
        if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
          callup.jugadores_convocados?.forEach(jugador => {
            if (jugador.confirmacion === "pendiente") {
              pendingCallupResponses++;
            }
          });
        }
      });
    }

    // Chat/admin counters - not loaded in Home, always 0
    let unreadAdminMessages = 0;
    let hasActiveAdminChat = false;
    let unresolvedAdminChats = 0;
    let pendingMatchObservations = 0;

    return { 
      activePlayers, pendingPayments, reviewPayments, paidPayments, unreadMessages, unreadPrivateMessages, unreadStaffMessages,
      pendingCallups, pendingSignatures, adminPendingSignatures, pendingPlayerAccess,
      pendingClothingOrders, pendingLotteryOrders, pendingMemberRequests, 
      recentSurveyResponses, pendingEventConfirmations, pendingCallupResponses,
      unreadAdminMessages, hasActiveAdminChat, overduePayments, pendingMatchObservations, unresolvedAdminChats
    };
  }, [players, payments, callups, user, hasPlayers, isAdmin, allUsers, clothingOrders, lotteryOrders, clubMembers, surveyResponses, events, staffMessagesHome, seasonConfig]);



  // Determinar botones a mostrar según configuración (BD > localStorage > ALL para mostrar todos)
  const selectedButtonIds = userButtonConfig?.selected_buttons || cachedButtonIds || ALL_ADMIN_BUTTONS.map(b => b.id);
  
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
    }

    return items;
  }, [isAdmin, hasPlayers, loteriaVisible, stats, displayAdminButtons, pendingInvitationRequests]);

  // Redirección ya gestionada en fetchUser

  // Mostrar loading mientras carga el usuario
  if (!user) {
  
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



  const getCurrentSeason = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (currentMonth >= 9) return `${currentYear}/${currentYear + 1}`;
    return `${currentYear - 1}/${currentYear}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">

      
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        {/* Móvil: botones rápidos compactos (sin cambios) */}
        <div className="lg:hidden flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <SocialLinks />
            <Link to={createPageUrl("Chatbot")}>
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 h-8 px-2.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                IA
              </Button>
            </Link>
            <ShareFormButton />
          </div>
        </div>

        {/* Desktop: header mejorado con saludo, fecha y KPIs */}
        {isAdmin && (
          <DesktopDashboardHeader
            user={user}
            roleName="Panel Admin"
            roleEmoji="🛡️"
            subtitle={`Temporada ${getCurrentSeason()}`}
            kpis={[
              { icon: Users, label: "Jugadores activos", value: stats.activePlayers || 0, color: "from-orange-600 to-orange-700" },
              { icon: CreditCard, label: "Pagos en revisión", value: stats.reviewPayments || 0, color: "from-green-600 to-green-700", sub: stats.reviewPayments > 0 ? "requieren atención" : null },
              { icon: FileSignature, label: "Firmas pendientes", value: stats.adminPendingSignatures || 0, color: "from-yellow-600 to-orange-600", sub: stats.adminPendingSignatures > 0 ? "sin completar" : null },
              { icon: Bell, label: "Respuestas convocatorias", value: stats.pendingCallupResponses || 0, color: "from-blue-600 to-blue-700", sub: stats.pendingCallupResponses > 0 ? "por confirmar" : null },
            ]}
          />
        )}



        {/* ÚNICO BANNER CONSOLIDADO DE ALERTAS - Incluye TODO */}
        {(isAdmin || hasPlayers) && (
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
            pendingMinorInvitations={pendingMinorInvitationRequests}
            pendingSecondParentInvitations={pendingSecondParentInvitationsCount}
            recentSurveyResponses={stats.recentSurveyResponses}
            pendingEventConfirmations={stats.pendingEventConfirmations}
            pendingPlayerAccess={stats.pendingPlayerAccess}
            hasActiveAdminChat={stats.hasActiveAdminChat}
            pendingMatchObservations={stats.pendingMatchObservations}
            unresolvedAdminChats={stats.unresolvedAdminChats}
            isAdmin={isAdmin}
            isCoach={false}
            isParent={hasPlayers}
            isCoordinator={false}
            userEmail={user?.email}
            userSports={myPlayersSports}
          />
        )}

        {/* Panel de Tareas Diarias - Lo primero que ve el admin */}
        {isAdmin && <DailyTasksPanel />}

        {/* Alerta de Jugadores Duplicados - Solo Admin */}
        {isAdmin && <DuplicatePlayersAlert />}

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

        {/* Desktop: accesos rápidos inline (SocialLinks, IA, Compartir) */}
        {isAdmin && (
          <div className="hidden lg:flex items-center gap-2">
            <SocialLinks />
            <Link to={createPageUrl("Chatbot")}>
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 h-8 px-2.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Asistente IA
              </Button>
            </Link>
            <ShareFormButton />
          </div>
        )}

        {/* MOSTRAR TODOS LOS BOTONES SELECCIONADOS EN GRID SIMPLE */}
        {isAdmin && (
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            {menuItems.map((item, idx) => (
              <DashboardButtonCard key={idx} item={item} isExternal={typeof item.url === 'string' && item.url.startsWith('http')} />
            ))}
          </div>
        )}

        {/* No admin: grid simple */}
        {!isAdmin && (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 stagger-animation">
            {menuItems.map((item, index) => (
              <DashboardButtonCard key={index} item={item} isExternal={typeof item.url === 'string' && item.url.startsWith('http')} />
            ))}
          </div>
        )}

        {/* Botón de prueba de notificación - Solo Admin, solo móvil */}
        {isAdmin && (
          <div className="lg:hidden bg-slate-800 rounded-3xl p-4 shadow-2xl border-2 border-slate-700">
            <div className="text-center space-y-3">
              <p className="text-white font-bold text-sm">🔔 Probar Notificaciones</p>
              <p className="text-slate-400 text-xs">Minimiza la app y pulsa el botón para recibir una notificación de prueba</p>
              <Button
                onClick={() => {
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (Notification.permission === 'granted') {
                      setTimeout(() => {
                        new Notification("🎉 CD Bustarviejo - Prueba", {
                          body: "¡Las notificaciones funcionan correctamente!",
                          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
                        });
                      }, 3000);
                    } else if (Notification.permission !== 'denied') {
                      Notification.requestPermission();
                    }
                  }
                }}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold"
                size="sm"
              >
                <BellRing className="w-4 h-4 mr-2" />
                Enviar Notificación de Prueba
              </Button>
            </div>
          </div>
        )}

        {/* Resumen de jugadores - solo móvil (en desktop ya está en KPIs) */}
        <div className="lg:hidden bg-slate-800 rounded-3xl p-4 shadow-2xl border-2 border-slate-700">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500 mb-2">
              {stats.activePlayers}
            </div>
            <div className="text-slate-400 text-sm">Jugadores Activos</div>
          </div>
        </div>
      </div>
    </div>
  );
}