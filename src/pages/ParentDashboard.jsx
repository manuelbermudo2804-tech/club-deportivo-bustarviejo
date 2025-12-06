import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Bell, MessageCircle, CreditCard, Image, Megaphone, Clock, ShoppingBag, FileText, Award, AlertCircle, Clover, Heart, FileSignature, Euro, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import SocialLinks from "../components/SocialLinks";
import NewSeasonWelcome from "../components/NewSeasonWelcome";
import ParentOnboarding from "@/components/onboarding/ParentOnboarding";
import AlertCenter from "../components/dashboard/AlertCenter";
import ContactCard from "../components/ContactCard";
import { usePageTutorial } from "../components/tutorials/useTutorial";


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

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: callups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 50),
    staleTime: 30000, // 30 segundos
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasonConfigs'],
    queryFn: () => base44.entities.SeasonConfig.list(),
    staleTime: 300000, // 5 minutos
    gcTime: 600000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-created_date'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: surveyResponses = [] } = useQuery({
    queryKey: ['surveyResponses'],
    queryFn: () => base44.entities.SurveyResponse.list(),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrders'],
    queryFn: () => base44.entities.ClothingOrder.list('-created_date'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversationsParent'],
    queryFn: () => base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha', 30),
    staleTime: 30000, // 30 segundos
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  const { data: extraPayments = [] } = useQuery({
    queryKey: ['extraPayments'],
    queryFn: () => base44.entities.ExtraPayment.list('-created_date'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: !!user,
  });

  // SOLO jugadores ACTIVOS de la temporada actual
  const myPlayers = (user && players) ? players.filter(p => 
    (p.email_padre === user.email || p.email_tutor_2 === user.email) && p.activo === true
  ) : [];

  useEffect(() => {
    if (user && myPlayers.length > 0) {
      const sports = [...new Set(myPlayers.map(p => p.deporte))];
      setMyPlayersSports(sports);
    }
  }, [user?.email, myPlayers.length]);

  const activeSurveys = (surveys && user) ? surveys.filter(s => {
    if (!s.activa || new Date(s.fecha_fin) < new Date()) return false;
    
    // Verificar si ya respondió esta encuesta
    const alreadyResponded = surveyResponses.some(r => 
      r.survey_id === s.id && r.respondente_email === user.email
    );
    if (alreadyResponded) return false;
    
    if (s.destinatarios === "Todos") return true;
    return myPlayersSports.includes(s.destinatarios);
  }) : [];

  const myPayments = payments.filter(p => 
    myPlayers.some(player => player.id === p.jugador_id)
  );

  const unreadMessages = messages.filter(m => {
    if (!m.leido && m.tipo === "admin_a_grupo") {
      const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];
      // Incluir mensajes de Coordinación Deportiva para todos los padres
      return myGroupSports.includes(m.grupo_id || m.deporte) || 
             (m.grupo_id === "Coordinación Deportiva" || m.deporte === "Coordinación Deportiva");
    }
    return false;
  }).length;

  const urgentUnreadMessages = messages.filter(m => {
    if (!m.leido && m.tipo === "admin_a_grupo" && m.prioridad === "Urgente") {
      const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];
      // Incluir mensajes urgentes de Coordinación Deportiva para todos los padres
      return myGroupSports.includes(m.grupo_id || m.deporte) || 
             (m.grupo_id === "Coordinación Deportiva" || m.deporte === "Coordinación Deportiva");
    }
    return false;
  }).length;

  // Calcular mensajes privados no leídos
  const unreadPrivateMessages = privateConversations.reduce((count, conv) => {
    if (conv.participante_familia_email === user?.email) {
      return count + (conv.no_leidos_familia || 0);
    }
    return count;
  }, 0);

  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = callups.filter(c => 
    c.publicada && c.fecha_partido >= today && !c.cerrada
  );

  let pendingCallups = 0;
  if (myPlayers.length > 0) {
    upcomingCallups.forEach(callup => {
      callup.jugadores_convocados?.forEach(jugador => {
        const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
        if (isMyPlayer && jugador.confirmacion === "pendiente") {
          pendingCallups++;
        }
      });
    });
  }

  const urgentAnnouncements = announcements.filter(a => {
    if (!a.publicado || a.prioridad !== "Urgente") return false;
    if (a.created_by === user?.email) return false;
    const now = new Date();
    const publishedDate = new Date(a.fecha_publicacion);
    const diffHours = (now - publishedDate) / (1000 * 60 * 60);
    if (diffHours >= 24) return false;
    if (a.destinatarios_tipo === "Todos") return true;
    return myPlayersSports.includes(a.destinatarios_tipo);
  });

  const importantAnnouncements = announcements.filter(a => {
    if (!a.publicado || a.prioridad !== "Importante") return false;
    if (a.created_by === user?.email) return false;
    const now = new Date();
    const publishedDate = new Date(a.fecha_publicacion);
    const diffHours = (now - publishedDate) / (1000 * 60 * 60);
    if (diffHours >= 48) return false;
    if (a.destinatarios_tipo === "Todos") return true;
    return myPlayersSports.includes(a.destinatarios_tipo);
  });

  const myClothingOrders = clothingOrders.filter(o => o.email_padre === user?.email);
  const pendingClothingOrders = myClothingOrders.filter(o => o.estado === "Pendiente" || o.estado === "En revisión");

  const activeSeason = seasonConfigs.find(s => s.activa) || null;
  const loteriaVisible = activeSeason?.loteria_navidad_abierta === true;

  // Pagos extras activos que aplican a mis jugadores
  const myActiveExtraPayments = extraPayments.filter(ep => {
    if (!ep.activo) return false;
    // Si no tiene categorías específicas, aplica a todos
    if (!ep.categorias_destino || ep.categorias_destino.length === 0) {
      return myPlayers.length > 0;
    }
    // Verificar si alguno de mis jugadores está en las categorías destino
    return myPlayers.some(p => ep.categorias_destino.includes(p.deporte));
  });

  // Contar pagos extras pendientes para mis jugadores
  const pendingExtraPayments = myActiveExtraPayments.reduce((count, ep) => {
    const myPlayerIds = myPlayers.map(p => p.id);
    const misPagos = (ep.pagos_recibidos || []).filter(pago => 
      myPlayerIds.includes(pago.jugador_id) && pago.estado !== "Pagado"
    );
    return count + misPagos.length;
  }, 0);

  const pendingDocuments = (myPlayers.length > 0) ? allDocuments.filter(doc => {
    if (!doc.publicado || !doc.requiere_firma) return false;
    
    const isRelevant = doc.tipo_destinatario === "individual" 
      ? myPlayers.some(p => doc.jugadores_destino?.includes(p.id))
      : (doc.categoria_destino === "Todos" || myPlayers.some(p => p.deporte === doc.categoria_destino));
    
    if (!isRelevant) return false;
    
    // Verificar si hay algún jugador con firma pendiente (ni firmado ni confirmado externa)
    return myPlayers.some(player => {
      const isRelevantForPlayer = doc.tipo_destinatario === "individual" 
        ? doc.jugadores_destino?.includes(player.id)
        : (doc.categoria_destino === "Todos" || player.deporte === doc.categoria_destino);
      
      if (!isRelevantForPlayer) return false;
      
      const firma = doc.firmas?.find(f => f.jugador_id === player.id);
      // Pendiente solo si existe firma Y no está firmado Y no está confirmada externa
      return firma && !firma.firmado && !firma.confirmado_firma_externa;
    });
  }) : [];

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

  const calculatePendingPayments = () => {
    const activeSeason = seasonConfigs.find(s => s.activa);
    if (!activeSeason || myPlayers.length === 0) return 0;

    const currentMonth = new Date().getMonth() + 1;
    let pendingCount = 0;

    myPlayers.forEach(player => {
      const playerPayments = myPayments.filter(p => 
        p.jugador_id === player.id && p.temporada === activeSeason.temporada
      );

      // Si no hay pagos registrados, no contamos nada (es responsabilidad del padre registrar)
      if (playerPayments.length === 0) return;

      // Verificar si hay un pago único
      const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único");
      
      if (pagoUnico) {
        // Si tiene pago único y NO está pagado, contar
        if (pagoUnico.estado === "Pendiente" || pagoUnico.estado === "En revisión") {
          pendingCount++;
        }
      } else {
        // Sistema fraccionado - verificar cada mes requerido
        const mesesRequeridos = [
          { nombre: "Junio", num: 6 },
          { nombre: "Septiembre", num: 9 },
          { nombre: "Diciembre", num: 12 }
        ];
        
        mesesRequeridos.forEach(mes => {
          // Solo contar los meses que ya han pasado o es el mes actual
          if (currentMonth >= mes.num) {
            const pagoMes = playerPayments.find(p => p.mes === mes.nombre);
            // Si existe el pago del mes y NO está pagado, contarlo
            if (pagoMes && (pagoMes.estado === "Pendiente" || pagoMes.estado === "En revisión")) {
              pendingCount++;
            }
          }
        });
      }
    });

    return pendingCount;
  };

  const pendingPayments = myPayments.filter(p => 
    myPlayers.some(player => player.id === p.jugador_id) &&
    (p.estado === "Pendiente" || p.estado === "En revisión")
  ).length;

  // Calcular pagos vencidos (pendientes con fecha pasada)
  const overduePayments = myPayments.filter(p => {
    if (p.estado !== "Pendiente") return false;
    // Si el pago es de un mes que ya pasó, está vencido
    const currentMonth = new Date().getMonth() + 1;
    const monthMapping = { "Junio": 6, "Septiembre": 9, "Diciembre": 12 };
    const paymentMonth = monthMapping[p.mes];
    return paymentMonth && currentMonth > paymentMonth;
  }).length;



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
      title: "📜 Certificados y Carnets",
      icon: Award,
      url: createPageUrl("PlayerDocumentsAndCards"),
      gradient: "from-indigo-600 to-indigo-700",
    },
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
    if (item.title === "📄 Documentos" && pendingDocuments.length > 0) {
      updated.badge = pendingDocuments.length;
      updated.badgeLabel = "pendientes";
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

  // Añadir pagos extras si hay alguno activo para mis jugadores
  if (myActiveExtraPayments.length > 0) {
    menuItems.splice(4, 0, {
      title: "💰 Pagos Extras",
      icon: Euro,
      url: createPageUrl("ParentExtraPayments"),
      gradient: "from-emerald-600 to-teal-600",
      badge: pendingExtraPayments > 0 ? pendingExtraPayments : undefined,
      badgeLabel: "pendientes"
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

        {/* ÚNICO CENTRO DE ALERTAS CONSOLIDADO - Todo en un solo banner */}
        <AlertCenter 
          pendingCallups={pendingCallups}
          pendingDocuments={pendingDocuments.length}
          pendingPayments={pendingPayments}
          unreadMessages={unreadMessages}
          unreadPrivateMessages={unreadPrivateMessages}
          pendingSurveys={activeSurveys.length}
          pendingSignatures={pendingFederationSignatures}
          upcomingEvents={0}
          overduePayments={overduePayments}
          newGalleryPhotos={0}
          isAdmin={false}
          isCoach={false}
          isParent={true}
        />



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
                (solo registrados)
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

        <ContactCard />
      </div>
    </div>
  );
}