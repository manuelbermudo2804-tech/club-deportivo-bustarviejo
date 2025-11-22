import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, CreditCard, ShoppingBag, Calendar, Megaphone, Image, Clock, MessageCircle, Bell, Settings, ClipboardCheck, CheckCircle2, Star, TrendingUp, Smartphone, Trophy, FileText, Clover, BookOpen, Archive, BarChart3 } from "lucide-react";

const Onboarding = lazy(() => import("../components/Onboarding"));
const SocialLinks = lazy(() => import("../components/SocialLinks"));
const ManualGenerator = lazy(() => import("../components/manuals/ManualGenerator"));
const ClubStats = lazy(() => import("../components/dashboard/ClubStats"));
const DashboardCardSkeleton = lazy(() => import("../components/skeletons/DashboardCardSkeleton"));

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
    staleTime: 10000,
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
        console.log('📊 [Home] Usuario detectado:', {
          email: currentUser.email,
          role: currentUser.role,
          es_tesorero: currentUser.es_tesorero,
          es_coordinador: currentUser.es_coordinador,
          es_entrenador: currentUser.es_entrenador
        });
        
        setUser(currentUser);
        const adminCheck = currentUser.role === "admin";
        const coordinatorCheck = currentUser.es_coordinador === true;
        const treasurerCheck = currentUser.es_tesorero === true;
        const coachCheck = currentUser.es_entrenador === true && !coordinatorCheck && !adminCheck;
        
        console.log('📊 [Home] Roles calculados:', {
          adminCheck,
          coordinatorCheck,
          treasurerCheck,
          coachCheck
        });
        
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
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user && (isAdmin || isTreasurer),
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user && (isAdmin || isTreasurer),
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user && isAdmin,
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list(),
    initialData: [],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user && isAdmin,
  });

  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-created_date'),
    initialData: [],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user && (isCoach || isCoordinator) && hasPlayers,
  });

  const { data: surveyResponses } = useQuery({
    queryKey: ['surveyResponses'],
    queryFn: () => base44.entities.SurveyResponse.list(),
    initialData: [],
    staleTime: 60000,
    refetchOnWindowFocus: false,
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
    const paidPayments = payments?.filter(p => p.estado === "Pagado").length || 0;
    const unreadMessages = messages?.filter(m => !m.leido && m.tipo === "padre_a_grupo").length || 0;

    let pendingCallups = 0;
    if (user && hasPlayers && players && callups) {
      const myPlayersList = players.filter(p => 
        p.email_padre === user.email || p.email_tutor_2 === user.email
      );
      const today = new Date().toISOString().split('T')[0];
      
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

    return { activePlayers, pendingPayments, paidPayments, unreadMessages, pendingCallups };
  }, [players, payments, messages, callups, user, hasPlayers]);

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
      // Operaciones Diarias
      items.push(
        {
          title: "Chat Grupos",
          icon: MessageCircle,
          url: createPageUrl("AdminChat"),
          gradient: "from-teal-600 to-teal-700",
          badge: stats.unreadMessages,
          badgeLabel: "nuevos"
        },
        {
          title: "Jugadores",
          icon: Users,
          url: createPageUrl("Players"),
          gradient: "from-orange-600 to-orange-700",
          badge: stats.activePlayers,
          badgeLabel: "activos"
        },
        {
          title: "Pagos",
          icon: CreditCard,
          url: createPageUrl("Payments"),
          gradient: "from-green-600 to-green-700",
          badge: stats.pendingPayments,
          badgeLabel: "pendientes"
        },
        {
          title: "🎓 Crear Convocatorias",
          icon: Bell,
          url: createPageUrl("CoachCallups"),
          gradient: "from-yellow-600 to-yellow-700",
        },
        {
          title: "Calendario",
          icon: Calendar,
          url: createPageUrl("Calendar"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "Anuncios",
          icon: Megaphone,
          url: createPageUrl("Announcements"),
          gradient: "from-pink-600 to-pink-700",
        },
        {
          title: "📄 Documentos",
          icon: FileText,
          url: createPageUrl("DocumentManagement"),
          gradient: "from-slate-600 to-slate-700",
        }
      );

      // Gestión Deportiva
      items.push(
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
        }
      );

      if (hasPlayers) {
        items.push({
          title: "👨‍👩‍👧 Confirmar Mis Hijos",
          icon: ClipboardCheck,
          url: createPageUrl("ParentCallups"),
          gradient: "from-green-600 to-green-700",
          badge: stats.pendingCallups,
          badgeLabel: "pendientes"
        });
      }

      items.push(
        {
          title: "Horarios",
          icon: Clock,
          url: createPageUrl("TrainingSchedules"),
          gradient: "from-blue-600 to-blue-700",
        },
        {
          title: "Galería",
          icon: Image,
          url: createPageUrl("AdminGallery"),
          gradient: "from-indigo-600 to-indigo-700",
        }
      );

      // Administrativo
      items.push(
        {
          title: "Recordatorios",
          icon: Bell,
          url: createPageUrl("Reminders"),
          gradient: "from-red-600 to-orange-700",
        },
        {
          title: "Pedidos Ropa",
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

      items.push(
        {
          title: "🎉 Gestión Eventos",
          icon: Calendar,
          url: createPageUrl("EventManagement"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "📋 Encuestas",
          icon: FileText,
          url: createPageUrl("Surveys"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "📋 Histórico",
          icon: Archive,
          url: createPageUrl("PaymentHistory"),
          gradient: "from-slate-600 to-slate-700",
        },
        {
          title: "⚙️ Configuración",
          icon: Settings,
          url: createPageUrl("SeasonManagement"),
          gradient: "from-slate-600 to-slate-700",
        },
        {
          title: "⚙️ Categorías y Cuotas",
          icon: Settings,
          url: createPageUrl("CategoryManagement"),
          gradient: "from-slate-600 to-slate-700",
        },
        {
          title: "Usuarios",
          icon: Users,
          url: createPageUrl("UserManagement"),
          gradient: "from-blue-600 to-blue-700",
        }
      );
    } else if (isTreasurer) {
      // Tesorero - Acceso financiero
      items.push(
        {
          title: "💰 Pagos",
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
          title: "📋 Histórico Pagos",
          icon: Archive,
          url: createPageUrl("PaymentHistory"),
          gradient: "from-slate-600 to-slate-700",
        },
        {
          title: "🛍️ Pedidos Ropa",
          icon: ShoppingBag,
          url: createPageUrl("ClothingOrders"),
          gradient: "from-red-600 to-red-700",
        },
        {
          title: "⚙️ Temporadas",
          icon: Settings,
          url: createPageUrl("SeasonManagement"),
          gradient: "from-slate-600 to-slate-700",
        },
        {
          title: "📅 Calendario",
          icon: Calendar,
          url: createPageUrl("Calendar"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "📢 Anuncios",
          icon: Megaphone,
          url: createPageUrl("Announcements"),
          gradient: "from-pink-600 to-pink-700",
        }
      );

      if (hasPlayers) {
        items.push(
          {
            title: "👨‍👩‍👧 Mis Hijos",
            icon: Users,
            url: createPageUrl("ParentPlayers"),
            gradient: "from-orange-600 to-orange-700",
          },
          {
            title: "📄 Documentos",
            icon: FileText,
            url: createPageUrl("ParentDocuments"),
            gradient: "from-slate-600 to-slate-700",
          },
          {
            title: "👨‍👩‍👧 Confirmar Mis Hijos",
            icon: ClipboardCheck,
            url: createPageUrl("ParentCallups"),
            gradient: "from-green-600 to-green-700",
            badge: stats.pendingCallups,
            badgeLabel: "pendientes"
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
    } else if (isCoach || isCoordinator) {
      items.push(
        {
          title: "Chat Equipos",
          icon: MessageCircle,
          url: createPageUrl("CoachChat"),
          gradient: "from-blue-600 to-blue-700",
          badge: stats.unreadMessages,
          badgeLabel: "nuevos"
        },
        {
          title: "🎓 Plantillas",
          icon: Users,
          url: createPageUrl("TeamRosters"),
          gradient: "from-blue-600 to-blue-700",
        },
        {
          title: "📋 Asistencia y Evaluación",
          icon: CheckCircle2,
          url: createPageUrl("TeamAttendanceEvaluation"),
          gradient: "from-green-600 to-green-700",
        },
        {
          title: "🎓 Crear Convocatorias",
          icon: Bell,
          url: createPageUrl("CoachCallups"),
          gradient: "from-yellow-600 to-yellow-700",
        },
        {
          title: "Calendario",
          icon: Calendar,
          url: createPageUrl("Calendar"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "📊 Reportes Entrenadores",
          icon: Star,
          url: createPageUrl("CoachEvaluationReports"),
          gradient: "from-purple-600 to-purple-700",
        }
      );

      if (hasPlayers) {
        items.push({
          title: "👨‍👩‍👧 Mis Hijos",
          icon: Users,
          url: createPageUrl("ParentPlayers"),
          gradient: "from-orange-600 to-orange-700",
        });
      }

      items.push(
        {
          title: "Horarios",
          icon: Clock,
          url: createPageUrl("TrainingSchedules"),
          gradient: "from-blue-600 to-blue-700",
        },
        {
          title: "Galería",
          icon: Image,
          url: createPageUrl("AdminGallery"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "Anuncios",
          icon: Megaphone,
          url: createPageUrl("Announcements"),
          gradient: "from-pink-600 to-pink-700",
        }
      );

      if (hasPlayers) {
        items.push(
          {
            title: "📄 Documentos",
            icon: FileText,
            url: createPageUrl("ParentDocuments"),
            gradient: "from-slate-600 to-slate-700",
          },
          {
            title: "Pedidos Ropa",
            icon: ShoppingBag,
            url: createPageUrl("ClothingOrders"),
            gradient: "from-teal-600 to-teal-700",
          },
          {
            title: "👨‍👩‍👧 Confirmar Mis Hijos",
            icon: ClipboardCheck,
            url: createPageUrl("ParentCallups"),
            gradient: "from-green-600 to-green-700",
            badge: stats.pendingCallups,
            badgeLabel: "pendientes"
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
    }

    return items;
  }, [isAdmin, isCoach, isCoordinator, isTreasurer, hasPlayers, loteriaVisible, stats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">
      <Suspense fallback={null}>
        {user && <Onboarding userRole={userRole} />}
      </Suspense>
      
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <Suspense fallback={null}>
          <ManualGenerator userRole={isAdmin ? 'admin' : isCoordinator ? 'coordinador' : isCoach ? 'entrenador' : 'padre'} />
        </Suspense>
        
        <Suspense fallback={null}>
          <SocialLinks />
        </Suspense>

        {/* Estadísticas del Club - Solo Admin */}
        {isAdmin && (
          <Suspense fallback={<div className="text-white text-center">Cargando estadísticas...</div>}>
            <ClubStats 
              players={players} 
              payments={payments} 
              attendances={attendances}
              evaluations={evaluations}
            />
          </Suspense>
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

        <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-orange-500 mb-1">
                {stats.activePlayers}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Jugadores Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-red-500 mb-1">
                {stats.pendingPayments}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Pagos Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-green-500 mb-1">
                {stats.paidPayments}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Pagos Confirmados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-blue-500 mb-1">
                {stats.unreadMessages}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Mensajes Nuevos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}