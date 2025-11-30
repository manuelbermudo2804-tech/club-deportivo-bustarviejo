import React, { useState, useEffect, useMemo, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, CreditCard, ShoppingBag, Calendar, Megaphone, Image, Clock, MessageCircle, Bell, Settings, ClipboardCheck, CheckCircle2, Star, TrendingUp, Smartphone, Trophy, FileText, Clover, BookOpen, Archive, BarChart3, FileSignature, Heart } from "lucide-react";

import SocialLinks from "../components/SocialLinks";

import ClubStats from "../components/dashboard/ClubStats";
import DashboardCardSkeleton from "../components/skeletons/DashboardCardSkeleton";
import AlertCenter from "../components/dashboard/AlertCenter";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isTreasurer, setIsTreasurer] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [userRole, setUserRole] = useState("parent");
  const [loteriaVisible, setLoteriaVisible] = useState(false);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    staleTime: 5000,
    gcTime: 60000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!user,
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
        const coordinatorCheck = currentUser.es_coordinador === true;
        const treasurerCheck = currentUser.es_tesorero === true;
        const coachCheck = currentUser.es_entrenador === true && !coordinatorCheck && !adminCheck;
        setIsAdmin(adminCheck);
        setIsCoordinator(coordinatorCheck);
        setIsTreasurer(treasurerCheck);
        setIsCoach(coachCheck);

        if (adminCheck) setUserRole("admin");
        else if (coordinatorCheck) setUserRole("coordinator");
        else if (treasurerCheck) setUserRole("treasurer");
        else if (coachCheck) setUserRole("coach");
        else setUserRole("parent");

        if (adminCheck || currentUser.es_entrenador || currentUser.es_coordinador || currentUser.es_tesorero) {
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
    staleTime: 300000, // 5 minutos
    gcTime: 600000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
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
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
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
    enabled: !!user && isAdmin,
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
    enabled: !!user && isAdmin,
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
    enabled: !!user && (isCoach || isCoordinator) && hasPlayers,
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
    enabled: !!user && (isCoach || isCoordinator) && hasPlayers,
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

  const stats = useMemo(() => {
    const activePlayers = players?.filter(p => p.activo).length || 0;
    const pendingPayments = payments?.filter(p => p.estado === "Pendiente").length || 0;
    const reviewPayments = payments?.filter(p => p.estado === "En revisión").length || 0;
    const paidPayments = payments?.filter(p => p.estado === "Pagado").length || 0;
    const unreadMessages = messages?.filter(m => !m.leido && m.tipo === "padre_a_grupo").length || 0;

    let pendingCallups = 0;
    let pendingSignatures = 0;
    let adminPendingSignatures = 0;
    
    const calcularEdad = (fechaNac) => {
      if (!fechaNac) return null;
      const hoy = new Date();
      const nacimiento = new Date(fechaNac);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
      return edad;
    };
    
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

    return { activePlayers, pendingPayments, reviewPayments, paidPayments, unreadMessages, pendingCallups, pendingSignatures, adminPendingSignatures };
  }, [players, payments, messages, callups, user, hasPlayers, isAdmin]);

  const handleMatchAppClick = useMemo(() => () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);
    
    if (isIOS || isAndroid) {
      const deepLink = "matchapp://";
      const storeUrl = isIOS 
        ? "https://apps.apple.com/app/matchapp"
        : "https://play.google.com/store/apps/details?id=com.matchapp";
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.location.href = storeUrl;
      }, 1000);
    } else {
      window.open("https://www.matchapp.com", "_blank");
    }
  }, []);

  const menuItems = useMemo(() => {
    const items = [];

    if (isAdmin) {
      // 📊 FINANZAS (primero lo más usado)
      items.push(
        {
          title: "📊 Panel Financiero",
          icon: TrendingUp,
          url: createPageUrl("TreasurerDashboard"),
          gradient: "from-emerald-600 to-emerald-700",
        },
        {
          title: "💳 Pagos",
          icon: CreditCard,
          url: createPageUrl("Payments"),
          gradient: "from-green-600 to-green-700",
          badge: stats.pendingPayments,
          badgeLabel: "pendientes"
        },
        {
          title: "🔔 Recordatorios",
          icon: Bell,
          url: createPageUrl("Reminders"),
          gradient: "from-red-600 to-orange-700",
        },
        {
          title: "📁 Histórico",
          icon: Archive,
          url: createPageUrl("PaymentHistory"),
          gradient: "from-slate-600 to-slate-700",
        }
      );

      // 👥 GESTIÓN DE PERSONAS
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
          title: "🖊️ Firmas Federación",
          icon: FileSignature,
          url: createPageUrl("FederationSignaturesAdmin"),
          gradient: "from-yellow-600 to-orange-600",
          badge: stats.adminPendingSignatures,
          badgeLabel: "pendientes"
        },
        {
          title: "👤 Usuarios",
          icon: Users,
          url: createPageUrl("UserManagement"),
          gradient: "from-blue-600 to-blue-700",
        }
      );

      // ⚽ DEPORTIVO
      items.push(
        {
          title: "🎓 Convocatorias",
          icon: Bell,
          url: createPageUrl("CoachCallups"),
          gradient: "from-yellow-600 to-yellow-700",
        },
        {
          title: "📋 Asistencia y Evaluación",
          icon: CheckCircle2,
          url: createPageUrl("TeamAttendanceEvaluation"),
          gradient: "from-green-600 to-green-700",
        },
        {
          title: "📊 Reportes Entrenadores",
          icon: Star,
          url: createPageUrl("CoachEvaluationReports"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "📅 Calendario y Horarios",
          icon: Calendar,
          url: createPageUrl("CalendarAndSchedules"),
          gradient: "from-purple-600 to-purple-700",
        }
      );

      // 👨‍👩‍👧 SECCIÓN FAMILIA (si tiene hijos)
      if (hasPlayers) {
        items.push({
          title: "👨‍👩‍👧 Confirmar Mis Hijos",
          icon: ClipboardCheck,
          url: createPageUrl("ParentCallups"),
          gradient: "from-green-600 to-green-700",
          badge: stats.pendingCallups,
          badgeLabel: "pendientes"
        });
        if (stats.pendingSignatures > 0) {
          items.push({
            title: "🖊️ Firmas Mis Hijos",
            icon: FileSignature,
            url: createPageUrl("FederationSignatures"),
            gradient: "from-yellow-600 to-orange-600",
            badge: stats.pendingSignatures,
            badgeLabel: "pendientes"
          });
        }
      }

      // 💬 COMUNICACIÓN
      items.push(
        {
          title: "💬 Chat Grupos",
          icon: MessageCircle,
          url: createPageUrl("AdminChat"),
          gradient: "from-teal-600 to-teal-700",
          badge: stats.unreadMessages,
          badgeLabel: "nuevos"
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
        }
      );

      // 🛍️ PEDIDOS Y EXTRAS
      items.push(
        {
          title: "🛍️ Pedidos Ropa",
          icon: ShoppingBag,
          url: createPageUrl("ClothingOrders"),
          gradient: "from-red-600 to-red-700",
        }
      );

      if (loteriaVisible) {
        if (hasPlayers) {
          items.push({
            title: "🍀 Mi Lotería",
            icon: Clover,
            url: createPageUrl("ParentLottery"),
            gradient: "from-green-600 to-red-600",
          });
        }
        items.push({
          title: "🍀 Gestión Lotería",
          icon: Clover,
          url: createPageUrl("LotteryManagement"),
          gradient: "from-green-600 to-green-700",
        });
      }

      // 🎉 CONTENIDO
      items.push(
        {
          title: "🎉 Gestión Eventos",
          icon: Calendar,
          url: createPageUrl("EventManagement"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "🖼️ Galería",
          icon: Image,
          url: createPageUrl("Gallery"),
          gradient: "from-indigo-600 to-indigo-700",
        }
      );

      // 🎫 SOCIO
      items.push(
        {
          title: "🎫 Hacerse Socio",
          icon: Heart,
          url: createPageUrl("ClubMembership"),
          gradient: "from-pink-600 to-pink-700",
        }
      );

      // ⚙️ CONFIGURACIÓN
      items.push(
        {
          title: "⚙️ Configuración",
          icon: Settings,
          url: createPageUrl("SeasonManagement"),
          gradient: "from-slate-600 to-slate-700",
        }
      );
    } else if (isTreasurer) {
      // 💰 FINANZAS (trabajo principal)
      items.push(
        {
          title: "📊 Panel Financiero",
          icon: TrendingUp,
          url: createPageUrl("TreasurerDashboard"),
          gradient: "from-emerald-600 to-emerald-700",
        },
        {
          title: "💳 Pagos",
          icon: CreditCard,
          url: createPageUrl("Payments"),
          gradient: "from-green-600 to-green-700",
          badge: stats.pendingPayments,
          badgeLabel: "pendientes"
        },
        {
          title: "🔔 Recordatorios",
          icon: Bell,
          url: createPageUrl("Reminders"),
          gradient: "from-red-600 to-orange-700",
        },
        {
          title: "📁 Histórico Pagos",
          icon: Archive,
          url: createPageUrl("PaymentHistory"),
          gradient: "from-slate-600 to-slate-700",
        }
      );

      // 👥 GESTIÓN
      items.push(
        {
          title: "👥 Jugadores",
          icon: Users,
          url: createPageUrl("Players"),
          gradient: "from-orange-600 to-orange-700",
          badge: stats.activePlayers,
          badgeLabel: "activos"
        }
      );

      // Firmas Federación para tesorero solo si tiene permiso
      if (user?.puede_gestionar_firmas) {
        items.push({
          title: "🖊️ Firmas Federación",
          icon: FileSignature,
          url: createPageUrl("FederationSignaturesAdmin"),
          gradient: "from-yellow-600 to-orange-600",
        });
      }

      items.push(
        {
          title: "🛍️ Pedidos Ropa",
          icon: ShoppingBag,
          url: createPageUrl("ClothingOrders"),
          gradient: "from-red-600 to-red-700",
        }
      );

      if (loteriaVisible) {
        items.push({
          title: "🍀 Gestión Lotería",
          icon: Clover,
          url: createPageUrl("LotteryManagement"),
          gradient: "from-green-600 to-green-700",
        });
      }

      items.push(
        {
          title: "🎫 Gestión Socios",
          icon: Users,
          url: createPageUrl("ClubMembersManagement"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "💰 Patrocinios",
          icon: CreditCard,
          url: createPageUrl("Sponsorships"),
          gradient: "from-amber-600 to-amber-700",
        },
        {
          title: "⚙️ Temporadas y Categorías",
          icon: Settings,
          url: createPageUrl("SeasonManagement"),
          gradient: "from-slate-600 to-slate-700",
        }
      );

      // 📅 CALENDARIO E INFO
      items.push(
        {
          title: "📅 Calendario y Horarios",
          icon: Calendar,
          url: createPageUrl("CalendarAndSchedules"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "🎉 Eventos Club",
          icon: Calendar,
          url: createPageUrl("ParentEventRSVP"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "📢 Anuncios",
          icon: Megaphone,
          url: createPageUrl("Announcements"),
          gradient: "from-pink-600 to-pink-700",
        },
        {
          title: "🖼️ Galería",
          icon: Image,
          url: createPageUrl("Gallery"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "📋 Encuestas",
          icon: FileText,
          url: createPageUrl("Surveys"),
          gradient: "from-teal-600 to-teal-700",
        }
      );

      // 👨‍👩‍👧 SECCIÓN FAMILIA (si tiene hijos)
      if (hasPlayers) {
        items.push(
          {
            title: "👨‍👩‍👧 Mis Hijos",
            icon: Users,
            url: createPageUrl("ParentPlayers"),
            gradient: "from-orange-600 to-orange-700",
          },
          {
            title: "💳 Pagos Mis Hijos",
            icon: CreditCard,
            url: createPageUrl("ParentPayments"),
            gradient: "from-blue-600 to-blue-700",
          },
          {
            title: "🏆 Confirmar Mis Hijos",
            icon: ClipboardCheck,
            url: createPageUrl("ParentCallups"),
            gradient: "from-green-600 to-green-700",
            badge: stats.pendingCallups,
            badgeLabel: "pendientes"
          },
          {
            title: "🖊️ Firmas Mis Hijos",
            icon: FileSignature,
            url: createPageUrl("FederationSignatures"),
            gradient: "from-yellow-600 to-orange-600",
            badge: stats.pendingSignatures > 0 ? stats.pendingSignatures : undefined,
            badgeLabel: "pendientes"
          },
          {
            title: "📄 Documentos",
            icon: FileText,
            url: createPageUrl("ParentDocuments"),
            gradient: "from-slate-600 to-slate-700",
          },
          {
            title: "💬 Chat Familiar",
            icon: MessageCircle,
            url: createPageUrl("ParentChat"),
            gradient: "from-teal-600 to-teal-700",
          }
        );
      }

      if (loteriaVisible && hasPlayers) {
        items.push({
          title: "🍀 Mi Lotería",
          icon: Clover,
          url: createPageUrl("ParentLottery"),
          gradient: "from-green-600 to-red-600",
        });
      }

      // 🎫 SOCIO
      items.push(
        {
          title: "🎫 Hacerse Socio",
          icon: Heart,
          url: createPageUrl("ClubMembership"),
          gradient: "from-pink-600 to-pink-700",
        }
      );

      // ⚙️ PREFERENCIAS
      items.push(
        {
          title: "🔔 Preferencias Notif.",
          icon: Settings,
          url: createPageUrl("NotificationPreferences"),
          gradient: "from-slate-500 to-slate-600",
        }
      );
    } else if (isCoach || isCoordinator) {
      // 💬 COMUNICACIÓN (uso diario)
      items.push(
        {
          title: "💬 Chat Equipos",
          icon: MessageCircle,
          url: createPageUrl("CoachChat"),
          gradient: "from-blue-600 to-blue-700",
          badge: stats.unreadMessages,
          badgeLabel: "nuevos"
        }
      );

      // ⚽ GESTIÓN DEPORTIVA (trabajo principal)
      items.push(
        {
          title: "🎓 Convocatorias",
          icon: Bell,
          url: createPageUrl("CoachCallups"),
          gradient: "from-yellow-600 to-yellow-700",
        },
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

      // 📅 CALENDARIO
      items.push(
        {
          title: "📅 Calendario y Horarios",
          icon: Calendar,
          url: createPageUrl("CalendarAndSchedules"),
          gradient: "from-purple-600 to-purple-700",
        }
      );

      // 📊 REPORTES
      items.push(
        {
          title: "📊 Reportes Entrenadores",
          icon: Star,
          url: createPageUrl("CoachEvaluationReports"),
          gradient: "from-purple-600 to-purple-700",
        }
      );

      // 📢 INFORMACIÓN
      items.push(
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
          title: "📋 Encuestas",
          icon: FileText,
          url: createPageUrl("Surveys"),
          gradient: "from-teal-600 to-teal-700",
        },
        {
          title: "🖼️ Galería",
          icon: Image,
          url: createPageUrl("Gallery"),
          gradient: "from-indigo-600 to-indigo-700",
        }
      );

      // 👨‍👩‍👧 SECCIÓN FAMILIA (si tiene hijos)
      if (hasPlayers) {
        items.push(
          {
            title: "👨‍👩‍👧 Mis Hijos",
            icon: Users,
            url: createPageUrl("ParentPlayers"),
            gradient: "from-orange-600 to-orange-700",
          },
          {
            title: "🏆 Confirmar Mis Hijos",
            icon: ClipboardCheck,
            url: createPageUrl("ParentCallups"),
            gradient: "from-green-600 to-green-700",
            badge: stats.pendingCallups,
            badgeLabel: "pendientes"
          },
          {
            title: "🖊️ Firmas Mis Hijos",
            icon: FileSignature,
            url: createPageUrl("FederationSignatures"),
            gradient: "from-yellow-600 to-orange-600",
            badge: stats.pendingSignatures,
            badgeLabel: "pendientes"
          },
          {
            title: "📄 Documentos",
            icon: FileText,
            url: createPageUrl("ParentDocuments"),
            gradient: "from-slate-600 to-slate-700",
          },
          {
            title: "🛍️ Pedidos Ropa",
            icon: ShoppingBag,
            url: createPageUrl("ClothingOrders"),
            gradient: "from-teal-600 to-teal-700",
          }
        );
      }

      if (loteriaVisible) {
        if (hasPlayers) {
          items.push({
            title: "🍀 Mi Lotería",
            icon: Clover,
            url: createPageUrl("ParentLottery"),
            gradient: "from-green-600 to-red-600",
          });
        }
        items.push({
          title: "🍀 Gestión Lotería",
          icon: Clover,
          url: createPageUrl("LotteryManagement"),
          gradient: "from-green-600 to-green-700",
        });
      }

      // 🎫 SOCIO
      items.push(
        {
          title: "🎫 Hacerse Socio",
          icon: Heart,
          url: createPageUrl("ClubMembership"),
          gradient: "from-pink-600 to-pink-700",
        }
      );

      // ⚙️ PREFERENCIAS
      items.push(
        {
          title: "⚙️ Preferencias Notif.",
          icon: Settings,
          url: createPageUrl("NotificationPreferences"),
          gradient: "from-slate-500 to-slate-600",
        }
      );
    }

    return items;
  }, [isAdmin, isCoach, isCoordinator, isTreasurer, hasPlayers, loteriaVisible, stats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />

        {/* CENTRO DE ALERTAS - Visible para todos los roles con hijos o con tareas admin */}
        {(isAdmin || ((isCoach || isCoordinator || isTreasurer) && hasPlayers)) && (
          <AlertCenter 
            pendingCallups={stats.pendingCallups}
            pendingDocuments={0}
            pendingPayments={isAdmin || isTreasurer ? stats.reviewPayments : 0}
            unreadMessages={stats.unreadMessages}
            pendingSurveys={0}
            pendingSignatures={hasPlayers ? stats.pendingSignatures : 0}
            upcomingEvents={0}
            isAdmin={isAdmin}
            isCoach={isCoach || isCoordinator}
            isParent={hasPlayers}
          />
        )}

        {/* Banner de Tareas Pendientes del Club para Admin */}
        {isAdmin && (stats.reviewPayments > 0 || stats.adminPendingSignatures > 0 || stats.unreadMessages > 0) && (
          <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-3 lg:p-4 shadow-xl border-2 border-red-500">
            <div className="flex items-start gap-2 lg:gap-3">
              <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-white flex-shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm lg:text-lg">
                  📋 Tareas Pendientes del Club
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {stats.reviewPayments > 0 && (
                    <Link to={createPageUrl("Payments")}>
                      <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold hover:bg-green-600 transition-colors">
                        💳 {stats.reviewPayments} pagos por revisar
                      </span>
                    </Link>
                  )}
                  {stats.adminPendingSignatures > 0 && (
                    <Link to={createPageUrl("FederationSignaturesAdmin")}>
                      <span className="inline-flex items-center gap-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold hover:bg-yellow-600 transition-colors">
                        🖊️ {stats.adminPendingSignatures} firmas pendientes
                      </span>
                    </Link>
                  )}
                  {stats.unreadMessages > 0 && (
                    <Link to={createPageUrl("AdminChat")}>
                      <span className="inline-flex items-center gap-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold hover:bg-blue-600 transition-colors">
                        💬 {stats.unreadMessages} mensajes sin leer
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner de Tareas Pendientes para Admin CON hijos */}
        {isAdmin && hasPlayers && (stats.pendingSignatures > 0 || stats.pendingCallups > 0) && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-3 lg:p-4 shadow-xl border-2 border-purple-500">
            <div className="flex items-start gap-2 lg:gap-3">
              <Users className="w-5 h-5 lg:w-6 lg:h-6 text-white flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm lg:text-lg">
                  👨‍👩‍👧 Tareas de Mis Hijos
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {stats.pendingSignatures > 0 && (
                    <Link to={createPageUrl("FederationSignatures")}>
                      <span className="inline-flex items-center gap-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold hover:bg-yellow-600 transition-colors">
                        🖊️ {stats.pendingSignatures} {stats.pendingSignatures === 1 ? 'firma' : 'firmas'}
                      </span>
                    </Link>
                  )}
                  {stats.pendingCallups > 0 && (
                    <Link to={createPageUrl("ParentCallups")}>
                      <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold hover:bg-green-600 transition-colors">
                        ⚽ {stats.pendingCallups} {stats.pendingCallups === 1 ? 'convocatoria' : 'convocatorias'}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner de Tareas Pendientes para Entrenadores/Coordinadores/Tesoreros con hijos */}
        {!isAdmin && (isCoach || isCoordinator || isTreasurer) && hasPlayers && (stats.pendingSignatures > 0 || stats.pendingCallups > 0) && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-3 lg:p-4 shadow-xl border-2 border-purple-500">
            <div className="flex items-start gap-2 lg:gap-3">
              <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-white flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm lg:text-lg">
                  👨‍👩‍👧 Tareas Pendientes de Mis Hijos
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {stats.pendingSignatures > 0 && (
                    <Link to={createPageUrl("FederationSignatures")}>
                      <span className="inline-flex items-center gap-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold hover:bg-yellow-600 transition-colors">
                        🖊️ {stats.pendingSignatures} {stats.pendingSignatures === 1 ? 'firma' : 'firmas'}
                      </span>
                    </Link>
                  )}
                  {stats.pendingCallups > 0 && (
                    <Link to={createPageUrl("ParentCallups")}>
                      <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold hover:bg-green-600 transition-colors">
                        ⚽ {stats.pendingCallups} {stats.pendingCallups === 1 ? 'convocatoria' : 'convocatorias'}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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

        <button
          onClick={handleMatchAppClick}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-2xl p-3 lg:p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-green-500"
        >
          <div className="flex items-center justify-center gap-2 lg:gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 lg:p-3">
              <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold text-sm lg:text-lg">⚽ Sigue a tus equipos en vivo</p>
              <p className="text-green-100 text-xs lg:text-sm">Descarga MatchApp para ver resultados y clasificaciones</p>
            </div>
            <Smartphone className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
        </button>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-6">
          {!user || !menuItems.length ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Suspense key={i} fallback={null}>
                  <DashboardCardSkeleton />
                </Suspense>
              ))}
            </>
          ) : (
            menuItems.map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl`}></div>
                
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                  </div>
                  
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">
                    {item.title}
                  </h3>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <p className="text-white text-[10px] lg:text-xs font-semibold">
                        {item.badge} {item.badgeLabel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
          )}
        </div>

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