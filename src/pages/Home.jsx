import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, CreditCard, ShoppingBag, Calendar, Megaphone, Image, Clock, MessageCircle, Bell, Settings, ClipboardCheck, CheckCircle2, Star, TrendingUp, Smartphone, Trophy } from "lucide-react";

import Onboarding from "../components/Onboarding";
import AutomaticReminders from "../components/AutomaticReminders";
import SocialLinks from "../components/SocialLinks";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [userRole, setUserRole] = useState("parent");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const adminCheck = currentUser.role === "admin";
        const coachCheck = currentUser.es_entrenador === true && !adminCheck;
        setIsAdmin(adminCheck);
        setIsCoach(coachCheck);

        if (adminCheck) setUserRole("admin");
        else if (coachCheck) setUserRole("coach");
        else setUserRole("parent");

        if (adminCheck || currentUser.es_entrenador) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === currentUser.email || 
            p.email_tutor_2 === currentUser.email
          );
          setHasPlayers(myPlayers.length > 0);
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
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
  });

  const activePlayers = players.filter(p => p.activo).length;
  const pendingPayments = payments.filter(p => p.estado === "Pendiente").length;
  const unreadMessages = messages.filter(m => !m.leido && m.tipo === "padre_a_grupo").length;

  const pendingCallupsCount = () => {
    if (!user || !hasPlayers) return 0;
    
    const myPlayers = players.filter(p => 
      p.email_padre === user.email || 
      p.email_tutor_2 === user.email
    );
    
    const today = new Date().toISOString().split('T')[0];
    let pending = 0;
    
    callups.forEach(callup => {
      if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
        callup.jugadores_convocados?.forEach(jugador => {
          const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
          if (isMyPlayer && jugador.confirmacion === "pendiente") {
            pending++;
          }
        });
      }
    });
    
    return pending;
  };

  const handleMatchAppClick = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);
    
    if (isIOS) {
      const appStoreUrl = "https://apps.apple.com/app/matchapp";
      const deepLink = "matchapp://";
      
      window.location.href = deepLink;
      
      setTimeout(() => {
        window.location.href = appStoreUrl;
      }, 1500);
    } else if (isAndroid) {
      const playStoreUrl = "https://play.google.com/store/apps/details?id=com.matchapp";
      const deepLink = "matchapp://";
      
      window.location.href = deepLink;
      
      setTimeout(() => {
        window.location.href = playStoreUrl;
      }, 1500);
    } else {
      window.open("https://www.matchapp.com", "_blank");
    }
  };

  const buildMenuItems = () => {
    const items = [
      {
        title: "Jugadores",
        icon: Users,
        url: createPageUrl("Players"),
        gradient: "from-orange-600 to-orange-700",
        badge: activePlayers,
        badgeLabel: "activos"
      }
    ];

    if (isCoach) {
      items.push(
        {
          title: "🎓 Plantillas",
          icon: Users,
          url: createPageUrl("TeamRosters"),
          gradient: "from-blue-600 to-blue-700",
        },
        {
          title: "✅ Asistencia",
          icon: CheckCircle2,
          url: createPageUrl("CoachAttendance"),
          gradient: "from-green-600 to-green-700",
        },
        {
          title: "⭐ Evaluaciones",
          icon: Star,
          url: createPageUrl("PlayerEvaluations"),
          gradient: "from-purple-600 to-purple-700",
        }
      );
    }

    items.push(
      {
        title: "Horarios",
        icon: Clock,
        url: createPageUrl("TrainingSchedules"),
        gradient: "from-green-600 to-green-700",
      },
      {
        title: "Calendario",
        icon: Calendar,
        url: createPageUrl("Calendar"),
        gradient: "from-blue-600 to-blue-700",
      },
      {
        title: "Anuncios",
        icon: Megaphone,
        url: createPageUrl("Announcements"),
        gradient: "from-purple-600 to-purple-700",
      },
      {
        title: "Galería",
        icon: Image,
        url: createPageUrl("AdminGallery"),
        gradient: "from-pink-600 to-pink-700",
      },
      {
        title: "🎓 Crear Convocatorias",
        icon: Bell,
        url: createPageUrl("CoachCallups"),
        gradient: "from-yellow-600 to-yellow-700",
      }
    );

    if (hasPlayers) {
      items.push({
        title: "👨‍👩‍👧 Mis Convocatorias",
        icon: ClipboardCheck,
        url: createPageUrl("ParentCallups"),
        gradient: "from-green-600 to-green-700",
        badge: pendingCallupsCount(),
        badgeLabel: "pendientes"
      });
    }

    items.push(
      {
        title: "Pagos",
        icon: CreditCard,
        url: isCoach && hasPlayers ? createPageUrl("Payments") + "?register=true" : createPageUrl("Payments"),
        gradient: "from-orange-600 to-red-700",
        badge: pendingPayments,
        badgeLabel: "pendientes"
      }
    );

    if (isAdmin) {
      items.push(
        {
          title: "⭐ Evaluaciones",
          icon: Star,
          url: createPageUrl("PlayerEvaluations"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "📊 Estadísticas",
          icon: TrendingUp,
          url: createPageUrl("ClubStats"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "Recordatorios",
          icon: Bell,
          url: createPageUrl("Reminders"),
          gradient: "from-red-600 to-orange-700",
        }
      );
    }

    items.push({
      title: "Pedidos Ropa",
      icon: ShoppingBag,
      url: createPageUrl("ClothingOrders"),
      gradient: "from-teal-600 to-teal-700",
    });

    if (isAdmin) {
      items.push({
        title: "Chat Grupos",
        icon: MessageCircle,
        url: createPageUrl("AdminChat"),
        gradient: "from-indigo-600 to-indigo-700",
        badge: unreadMessages,
        badgeLabel: "nuevos"
      });
    } else if (isCoach) {
      items.push({
        title: "Chat Equipos",
        icon: MessageCircle,
        url: createPageUrl("CoachChat"),
        gradient: "from-blue-600 to-blue-700",
        badge: unreadMessages,
        badgeLabel: "nuevos"
      });
    }

    if (isAdmin) {
      items.push({
        title: "Configuración",
        icon: Settings,
        url: createPageUrl("SeasonManagement"),
        gradient: "from-slate-600 to-slate-700",
      });
    }

    return items;
  };

  const menuItems = buildMenuItems();

  const getPanelTitle = () => {
    if (isAdmin) return "Panel de Administración";
    if (isCoach) return "Panel de Entrenadores";
    return "Panel de Gestión";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {user && <Onboarding userRole={userRole} />}
      <AutomaticReminders />
      
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 lg:p-6 shadow-2xl">
        <div className="flex items-center justify-center gap-3">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl shadow-2xl ring-4 ring-white/50" />
          <div className="text-white text-center">
            <h1 className="text-2xl lg:text-3xl font-bold">CD Bustarviejo</h1>
            <p className="text-orange-100 text-xs lg:text-sm">{getPanelTitle()}</p>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-6 space-y-6">
        {/* Social Links */}
        <SocialLinks />

        {/* Banner MatchApp */}
        <button
          onClick={handleMatchAppClick}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-green-500"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-lg">⚽ Sigue a tus equipos en vivo</p>
              <p className="text-green-100 text-sm">Descarga MatchApp para ver resultados y clasificaciones</p>
            </div>
            <Smartphone className="w-8 h-8 text-white ml-auto" />
          </div>
        </button>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl`}></div>
                
                <div className="relative z-10 p-6 lg:p-8 flex flex-col items-center justify-center min-h-[180px] lg:min-h-[200px]">
                  <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                  </div>
                  
                  <h3 className="text-white font-bold text-center text-base lg:text-lg mb-2">
                    {item.title}
                  </h3>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <p className="text-white text-xs font-semibold">
                        {item.badge} {item.badgeLabel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-orange-500 mb-1">
                {activePlayers}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Jugadores Activos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-red-500 mb-1">
                {pendingPayments}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Pagos Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-green-500 mb-1">
                {payments.filter(p => p.estado === "Pagado").length}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Pagos Confirmados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-500 mb-1">
                {unreadMessages}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Mensajes Nuevos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}