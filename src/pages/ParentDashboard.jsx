import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Bell, MessageCircle, CreditCard, Image, Megaphone, Clock, ShoppingBag, FileText, Award, AlertCircle, Clover, Heart, FileSignature, Euro, Share2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import SocialLinks from "../components/SocialLinks";
import NewSeasonWelcome from "../components/NewSeasonWelcome";
import ParentOnboarding from "@/components/onboarding/ParentOnboarding";
import AlertCenter from "../components/dashboard/AlertCenter";
import ContactCard from "../components/ContactCard";
import { usePageTutorial } from "../components/tutorials/useTutorial";
import DashboardCardSkeleton from "../components/skeletons/DashboardCardSkeleton";
import RenewalStatusWidget from "../components/renewals/RenewalStatusWidget";


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
    <div className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 rounded-2xl p-4 shadow-xl border-2 border-pink-400 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
      
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 flex-shrink-0">
            <span className="text-2xl">⚽👧</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-base lg:text-lg">
              ¡Ayúdanos a crecer el Fútbol Femenino!
            </p>
            <p className="text-pink-100 text-xs mt-1">
              Comparte con amigas, vecinas, familiares... <strong>¡Buscamos jugadoras!</strong>
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={shareWhatsApp}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Enviar por WhatsApp</span>
          </button>
          <button
            onClick={copyLink}
            className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-4 rounded-xl transition-all"
          >
            📋
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myPlayersSports, setMyPlayersSports] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Tutorial interactivo para primera visita
  usePageTutorial("parent_dashboard");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        // Mostrar onboarding si no lo ha completado
        if (!currentUser.onboarding_completado) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // CARGAR SOLO DATOS ESENCIALES - El resto se carga bajo demanda en cada página
  const { data: allPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 60000,
    enabled: !!user,
  });

  // Filtrar MIS jugadores en memoria (rápido)
  const players = allPlayers.filter(p => 
    (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo === true
  );

  const { data: allPayments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 100),
    staleTime: 60000,
    enabled: !!user && players.length > 0,
  });

  // Filtrar MIS pagos en memoria
  const payments = allPayments.filter(p => 
    players.some(player => player.id === p.jugador_id)
  );

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date', 50),
    staleTime: 60000,
    enabled: !!user && players.length > 0,
  });

  const today = new Date().toISOString().split('T')[0];
  const callups = allCallups.filter(c => c.publicada && c.fecha_partido >= today && !c.cerrada);

  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasonConfigs'],
    queryFn: () => base44.entities.SeasonConfig.list(),
    staleTime: 300000,
    enabled: !!user,
  });

  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversationsParent', user?.email],
    queryFn: async () => {
      const allConvs = await base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha', 30);
      return allConvs.filter(c => c.participante_familia_email === user?.email);
    },
    staleTime: 5000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations', user?.email],
    queryFn: async () => {
      const allConvs = await base44.entities.CoordinatorConversation.list();
      return allConvs.filter(c => c.padre_email === user?.email);
    },
    staleTime: 5000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  const { data: adminConversations = [] } = useQuery({
    queryKey: ['adminConversationsParent', user?.email],
    queryFn: async () => {
      const allConvs = await base44.entities.AdminConversation.list();
      return allConvs.filter(c => c.padre_email === user?.email && !c.resuelta);
    },
    staleTime: 5000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
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
    staleTime: 5000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    enabled: !!user && players.length > 0,
  });

  const { data: customPaymentPlans = [] } = useQuery({
    queryKey: ['customPaymentPlans'],
    queryFn: () => base44.entities.CustomPaymentPlan.list(),
    initialData: [],
    enabled: !!user && players.length > 0,
  });

  // Surveys - solo si hay jugadores
  const { data: allSurveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-created_date', 10),
    staleTime: 300000,
    enabled: !!user && players.length > 0,
  });

  const { data: surveyResponses = [] } = useQuery({
    queryKey: ['surveyResponses', user?.email],
    queryFn: async () => {
      const allResp = await base44.entities.SurveyResponse.list();
      return allResp.filter(r => r.respondente_email === user?.email);
    },
    staleTime: 300000,
    enabled: !!user && allSurveys.length > 0,
  });

  // Documents - solo si hay jugadores
  const { data: allDocuments = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 20),
    staleTime: 300000,
    enabled: !!user && players.length > 0,
  });

  // Los jugadores ya están filtrados arriba
  const myPlayers = players;

  useEffect(() => {
    if (user && myPlayers.length > 0) {
      const sports = [...new Set(myPlayers.map(p => p.deporte))];
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
    if (m.tipo === "entrenador_a_grupo" && !m.leido) return true;
    if (m.destinatario_email === user?.email && !m.leido) return true;
    return false;
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

  // Calcular pagos considerando planes personalizados
  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  const currentSeason = getCurrentSeason();
  const normalizeSeason = (season) => season?.replace(/-/g, '/') || currentSeason;

  let pagosSinJustificante = 0;
  let pagosEnRevision = 0;
  let overduePaymentsCount = 0;

  myPlayers.forEach(player => {
    const playerPayments = payments.filter(p => 
      p.jugador_id === player.id && 
      normalizeSeason(p.temporada) === normalizeSeason(currentSeason) &&
      p.reconciliado_banco !== true
    );
    
    // Verificar si tiene plan personalizado
    const customPlan = customPaymentPlans.find(p => 
      p.jugador_id === player.id && 
      p.activo === true &&
      normalizeSeason(p.temporada) === normalizeSeason(currentSeason)
    );

    if (customPlan) {
      // Con plan personalizado
      customPlan.cuotas_personalizadas.forEach(cuota => {
        const payment = playerPayments.find(p => p.mes === cuota.mes);
        
        if (!payment) {
          pagosSinJustificante++;
          // Verificar vencimiento
          if (cuota.fecha_vencimiento) {
            const now = new Date();
            const vencimiento = new Date(cuota.fecha_vencimiento);
            if (now > vencimiento) overduePaymentsCount++;
          }
        } else if (payment.estado === "Pendiente" && !payment.justificante_url) {
          // Solo contar como "sin justificante" si NO tiene justificante subido
          pagosSinJustificante++;
          // Verificar vencimiento solo si NO tiene justificante
          if (cuota.fecha_vencimiento) {
            const now = new Date();
            const vencimiento = new Date(cuota.fecha_vencimiento);
            if (now > vencimiento) overduePaymentsCount++;
          }
        } else if (payment.estado === "En revisión") {
          pagosEnRevision++;
        }
      });
    } else {
      // Sistema estándar
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") &&
        (p.estado === "Pagado" || p.estado === "En revisión")
      );

      if (!hasPagoUnico) {
        ["Junio", "Septiembre", "Diciembre"].forEach(mes => {
          const payment = playerPayments.find(p => p.mes === mes);
          
          // SOLO contar como pendiente si:
          // 1. No existe el pago, O
          // 2. Existe pero está en estado "Pendiente" Y NO tiene justificante
          if (!payment) {
            pagosSinJustificante++;
            // Verificar vencimiento
            const now = new Date();
            const [year1] = currentSeason.split('/').map(y => parseInt(y));
            let deadlineDate;
            if (mes === "Junio") deadlineDate = new Date(year1, 5, 30);
            else if (mes === "Septiembre") deadlineDate = new Date(year1, 8, 15);
            else if (mes === "Diciembre") deadlineDate = new Date(year1, 11, 15);
            
            if (deadlineDate && now > deadlineDate) {
              overduePaymentsCount++;
            }
          } else if (payment.estado === "Pendiente" && !payment.justificante_url) {
            // Solo si NO tiene justificante subido
            pagosSinJustificante++;
            // Verificar vencimiento solo si NO tiene justificante
            const now = new Date();
            const [year1] = currentSeason.split('/').map(y => parseInt(y));
            let deadlineDate;
            if (mes === "Junio") deadlineDate = new Date(year1, 5, 30);
            else if (mes === "Septiembre") deadlineDate = new Date(year1, 8, 15);
            else if (mes === "Diciembre") deadlineDate = new Date(year1, 11, 15);
            
            if (deadlineDate && now > deadlineDate) {
              overduePaymentsCount++;
            }
          } else if (payment.estado === "En revisión") {
            pagosEnRevision++;
          }
        });
      }
    }
  });

  const pendingPayments = pagosSinJustificante + pagosEnRevision;



  // Menú base que siempre se muestra (sin depender de datos cargados)
  const baseMenuItems = [
    // 💬 COMUNICACIÓN (uso diario)

    // ⚽ ACCIONES URGENTES
    {
      title: "🏆 Convocatorias",
      icon: Bell,
      url: createPageUrl("ParentCallups"),
      gradient: "from-yellow-600 to-yellow-700",
    },
    {
      title: "🖊️ Firmas Federación",
      icon: FileSignature,
      url: createPageUrl("FederationSignatures"),
      gradient: "from-yellow-600 to-orange-600",
    },
    // 💰 PAGOS Y JUGADORES
    {
      title: "💳 Pagos",
      icon: CreditCard,
      url: createPageUrl("ParentPayments"),
      gradient: "from-green-600 to-green-700",
    },
    {
      title: "👥 Mis Jugadores",
      icon: Users,
      url: createPageUrl("ParentPlayers"),
      gradient: "from-orange-600 to-orange-700",
    },
    // 📅 CALENDARIO Y EVENTOS
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
      gradient: "from-cyan-600 to-cyan-700",
    },
    // 📢 INFORMACIÓN
    {
      title: "📢 Anuncios",
      icon: Megaphone,
      url: createPageUrl("Announcements"),
      gradient: "from-pink-600 to-pink-700",
    },
    {
      title: "📄 Documentos",
      icon: FileText,
      url: createPageUrl("ParentDocuments"),
      gradient: "from-slate-600 to-slate-700",
    },
    // 🛍️ PEDIDOS
    {
      title: "🛍️ Pedidos Ropa",
      icon: ShoppingBag,
      url: createPageUrl("ClothingOrders"),
      gradient: "from-red-600 to-red-700",
    },
    // 🖼️ CONTENIDO
    {
      title: "🖼️ Galería",
      icon: Image,
      url: createPageUrl("ParentGallery"),
      gradient: "from-indigo-600 to-indigo-700",
    },
    // 📋 EXTRAS
    {
      title: "📋 Encuestas",
      icon: FileText,
      url: createPageUrl("Surveys"),
      gradient: "from-purple-600 to-purple-700",
    },
    {
      title: "🎫 Hacerse Socio",
      icon: Heart,
      url: createPageUrl("ClubMembership"),
      gradient: "from-pink-600 to-pink-700",
    },
  ];

  // Añadir badges dinámicos cuando los datos estén disponibles
  const menuItems = baseMenuItems.map(item => {
    const updated = { ...item };
    

    if (item.title === "🏆 Convocatorias" && pendingCallups > 0) {
      updated.badge = pendingCallups;
      updated.badgeLabel = "pendientes";
    }
    if (item.title === "🖊️ Firmas Federación" && pendingFederationSignatures > 0) {
      updated.badge = pendingFederationSignatures;
      updated.badgeLabel = "pendientes";
    }
    if (item.title === "💳 Pagos" && pendingPayments > 0) {
      updated.badge = pendingPayments;
      updated.badgeLabel = "pendientes";
    }
    if (item.title === "👥 Mis Jugadores" && myPlayers.length > 0) {
      updated.badge = myPlayers.length;
      updated.badgeLabel = "registrados";
    }

    
    return updated;
  });

  // Añadir lotería si está visible
  if (loteriaVisible) {
    menuItems.splice(10, 0, {
      title: "🍀 Lotería Navidad",
      icon: Clover,
      url: createPageUrl("ParentLottery"),
      gradient: "from-green-600 to-red-600",
    });
  }



  // Mostrar pantalla de nueva temporada si no hay jugadores activos (solo después de cargar usuario y jugadores)
  if (user && !playersLoading && myPlayers.length === 0 && activeSeason) {
    return <NewSeasonWelcome seasonName={activeSeason.temporada} />;
  }

  // Mostrar loading solo si no hay usuario todavía
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Onboarding Tutorial */}
      <ParentOnboarding 
        open={showOnboarding} 
        onComplete={() => setShowOnboarding(false)} 
      />

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

        {/* Widget de estado de renovaciones REMOVIDO - solo mostrar si hay jugadores pendientes */}
        {!playersLoading && activeSeason?.permitir_renovaciones && myPlayers.length > 0 && myPlayers.some(p => p.estado_renovacion === "pendiente" && p.temporada_renovacion === activeSeason?.temporada) && (
          <RenewalStatusWidget 
            players={myPlayers} 
            payments={payments}
            seasonConfig={activeSeason}
          />
        )}

        {/* ÚNICO CENTRO DE ALERTAS CONSOLIDADO - Todo en un solo banner */}
        {playersLoading ? (
          <DashboardCardSkeleton />
        ) : (
        <AlertCenter 
          pendingCallups={pendingCallups}
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
          pendingPayments={pagosSinJustificante}
          paymentsInReview={pagosEnRevision}
          pendingSurveys={activeSurveys.length}
          pendingSignatures={pendingFederationSignatures}
          upcomingEvents={0}
          overduePayments={overduePaymentsCount}
          newGalleryPhotos={0}
          unreadPrivateMessages={unreadPrivateMessages}
          unreadCoordinatorMessages={0}
          unreadCoachMessages={unreadCoachMessages}
          unreadAdminMessages={unreadAdminMessages}
          hasActiveAdminChat={hasActiveAdminChat}
          isAdmin={false}
          isCoach={false}
          isParent={true}
          userEmail={user?.email}
          userSports={myPlayersSports}
        />
        )}



        {/* HAZTE SOCIO BANNER */}
        <Link to={createPageUrl("ClubMembership")}>
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-pink-400">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold text-lg">🎉 ¡Hazte Socio!</p>
                <p className="text-pink-100 text-xs">Invita a familiares y amigos • Solo 25€/temporada</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-sm font-bold">→</span>
              </div>
            </div>
          </div>
        </Link>

        {/* BANNER FÚTBOL FEMENINO - COMPARTIR POR WHATSAPP */}
        {activeSeason?.bonus_femenino_activo && myPlayers && myPlayers.length > 0 && (
          <FemeninoShareBanner />
        )}

        {/* LOTERIA NAVIDAD */}
        {loteriaVisible && (
          <Link to={createPageUrl("ParentLottery")}>
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-green-500">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                  <Clover className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold text-base">🍀 Lotería de Navidad</p>
                  <p className="text-green-100 text-xs">Compra décimos del club 🎄</p>
                </div>
              </div>
            </div>
          </Link>
        )}





        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {menuItems.map((item, index) => (
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
          ))}
        </div>

        {playersLoading ? (
          <DashboardCardSkeleton />
        ) : (
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
                {pendingPayments}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Pagos Pendientes</div>
              <div className="text-slate-500 text-[8px] lg:text-[10px] mt-1">
                {pagosSinJustificante > 0 && `${pagosSinJustificante} sin justif.`}
                {pagosSinJustificante > 0 && pagosEnRevision > 0 && ' • '}
                {pagosEnRevision > 0 && `${pagosEnRevision} en revisión`}
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
        )}

        <ContactCard />
      </div>
    </div>
  );
}