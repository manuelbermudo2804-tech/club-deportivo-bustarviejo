import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Bell, MessageCircle, CreditCard, Image, Megaphone, Clock, ShoppingBag, FileText, Award, AlertCircle, Clover, Heart, FileSignature } from "lucide-react";

import SocialLinks from "../components/SocialLinks";
import PushNotificationManager from "../components/push/PushNotificationManager";
import NewSeasonWelcome from "../components/NewSeasonWelcome";
import ParentOnboarding from "@/components/onboarding/ParentOnboarding";
import AlertCenter from "../components/dashboard/AlertCenter";
import ContactCard from "../components/ContactCard";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myPlayersSports, setMyPlayersSports] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: callups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasonConfigs'],
    queryFn: () => base44.entities.SeasonConfig.list(),
    staleTime: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!user,
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: surveyResponses = [] } = useQuery({
    queryKey: ['surveyResponses'],
    queryFn: () => base44.entities.SurveyResponse.list(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrders'],
    queryFn: () => base44.entities.ClothingOrder.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  const myPlayers = user && players ? players.filter(p => 
    (p.email_padre === user.email || p.email_tutor_2 === user.email) && p.activo === true
  ) : [];

  useEffect(() => {
    if (user && myPlayers.length > 0) {
      const sports = [...new Set(myPlayers.map(p => p.deporte))];
      setMyPlayersSports(sports);
    }
  }, [user?.email, myPlayers.length]);

  const activeSurveys = surveys && myPlayersSports && user ? surveys.filter(s => {
    if (!s.activa || new Date(s.fecha_fin) < new Date()) return false;
    
    // Verificar si ya respondió esta encuesta
    const alreadyResponded = surveyResponses.some(r => 
      r.survey_id === s.id && r.respondente_email === user.email
    );
    if (alreadyResponded) return false;
    
    if (s.destinatarios === "Todos") return true;
    return myPlayersSports.includes(s.destinatarios);
  }) : [];

  const myPayments = payments && myPlayers ? payments.filter(p => 
    myPlayers.some(player => player.id === p.jugador_id)
  ) : [];

  const unreadMessages = messages && myPlayers ? messages.filter(m => {
    if (!m.leido && m.tipo === "admin_a_grupo") {
      const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];
      return myGroupSports.includes(m.grupo_id || m.deporte);
    }
    return false;
  }).length : 0;

  const urgentUnreadMessages = messages && myPlayers ? messages.filter(m => {
    if (!m.leido && m.tipo === "admin_a_grupo" && m.prioridad === "Urgente") {
      const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];
      return myGroupSports.includes(m.grupo_id || m.deporte);
    }
    return false;
  }).length : 0;

  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = callups ? callups.filter(c => 
    c.publicada && c.fecha_partido >= today && !c.cerrada
  ) : [];

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

  const urgentAnnouncements = announcements && myPlayersSports.length > 0 ? announcements.filter(a => {
    if (!a.publicado || a.prioridad !== "Urgente") return false;
    if (a.created_by === user?.email) return false;
    const now = new Date();
    const publishedDate = new Date(a.fecha_publicacion);
    const diffHours = (now - publishedDate) / (1000 * 60 * 60);
    if (diffHours >= 24) return false;
    if (a.destinatarios_tipo === "Todos") return true;
    return myPlayersSports.includes(a.destinatarios_tipo);
  }) : [];

  const importantAnnouncements = announcements && myPlayersSports.length > 0 ? announcements.filter(a => {
    if (!a.publicado || a.prioridad !== "Importante") return false;
    if (a.created_by === user?.email) return false;
    const now = new Date();
    const publishedDate = new Date(a.fecha_publicacion);
    const diffHours = (now - publishedDate) / (1000 * 60 * 60);
    if (diffHours >= 48) return false;
    if (a.destinatarios_tipo === "Todos") return true;
    return myPlayersSports.includes(a.destinatarios_tipo);
  }) : [];

  const myClothingOrders = clothingOrders && user ? clothingOrders.filter(o => o.email_padre === user?.email) : [];
  const pendingClothingOrders = myClothingOrders.filter(o => o.estado === "Pendiente" || o.estado === "En revisión");

  const activeSeason = seasonConfigs ? seasonConfigs.find(s => s.activa) : null;
  const loteriaVisible = activeSeason?.loteria_navidad_abierta === true;

  const pendingDocuments = allDocuments && myPlayers.length > 0 ? allDocuments.filter(doc => {
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

  const pendingPayments = myPayments && myPlayers ? myPayments.filter(p => 
    myPlayers.some(player => player.id === p.jugador_id) &&
    (p.estado === "Pendiente" || p.estado === "En revisión")
  ).length : 0;

  // Menú base que siempre se muestra (sin depender de datos cargados)
  const baseMenuItems = [
    // 💬 COMUNICACIÓN (uso diario)
    {
      title: "💬 Chat Equipo",
      icon: MessageCircle,
      url: createPageUrl("ParentChat"),
      gradient: "from-teal-600 to-teal-700",
    },
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
    
    if (item.title === "💬 Chat Equipo" && unreadMessages > 0) {
      updated.badge = unreadMessages;
      updated.badgeLabel = "nuevos";
    }
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

  // Mostrar loading solo brevemente mientras carga el usuario
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-3"></div>
          <p className="text-white text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de nueva temporada si no hay jugadores activos (solo después de cargar)
  if (!playersLoading && myPlayers.length === 0 && activeSeason) {
    return <NewSeasonWelcome seasonName={activeSeason.temporada} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">
      {/* Onboarding Tutorial */}
      <ParentOnboarding 
        open={showOnboarding} 
        onComplete={() => setShowOnboarding(false)} 
      />

      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />

        <div className="lg:hidden">
          <PushNotificationManager />
        </div>

        {/* CENTRO DE ALERTAS */}
        <AlertCenter 
          pendingCallups={pendingCallups}
          pendingDocuments={pendingDocuments.length}
          pendingPayments={pendingPayments}
          unreadMessages={unreadMessages}
          pendingSurveys={activeSurveys.length}
          pendingSignatures={pendingFederationSignatures}
          upcomingEvents={0}
          isAdmin={false}
          isCoach={false}
          isParent={true}
        />

        {/* COORDINADOR DEPORTIVO BANNER */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 rounded-2xl p-4 lg:p-6 shadow-xl border-2 border-blue-500">
          <div className="flex items-start gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <span className="text-2xl lg:text-3xl">🎓</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-base lg:text-xl mb-1 lg:mb-2">
                ¿Dudas técnicas o deportivas? Habla con nuestro Coordinador
              </h3>
              <div className="space-y-1.5 lg:space-y-2 mb-3 lg:mb-4">
                <p className="text-blue-50 text-xs lg:text-sm">
                  El <strong>Coordinador-Director Deportivo</strong> del club está para ayudarte con temas técnicos:
                </p>
                <ul className="space-y-1 text-blue-50 text-xs lg:text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 flex-shrink-0">⚽</span>
                    <span>Consultas sobre entrenamientos, metodología y equipos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-300 flex-shrink-0">📊</span>
                    <span>Dudas sobre rendimiento, evolución o evaluaciones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-300 flex-shrink-0">🎯</span>
                    <span>Sugerencias deportivas y mejoras técnicas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-300 flex-shrink-0">⚠️</span>
                    <span>Quejas o problemas relacionados con lo deportivo</span>
                  </li>
                </ul>
                <p className="text-blue-100 text-[10px] lg:text-xs mt-2 pt-2 border-t border-blue-400/30">
                  <strong>Nota:</strong> Para pagos, inscripciones o temas administrativos, contacta con la oficina del club
                </p>
              </div>
              <button 
                onClick={() => navigate(createPageUrl("ParentChat") + "?group=" + encodeURIComponent("Coordinación Deportiva"))}
                className="w-full lg:w-auto bg-white hover:bg-blue-50 text-blue-700 font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="text-sm lg:text-base">Contactar con Coordinación</span>
              </button>
            </div>
          </div>
        </div>

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

        {/* DOCUMENTOS PENDIENTES */}
        {pendingDocuments.length > 0 && (
          <Link to={createPageUrl("ParentDocuments")}>
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-red-500 animate-pulse">
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-bold text-base lg:text-lg">
                    📄 ¡Documentos Pendientes de Firma!
                  </p>
                  <p className="text-red-100 text-xs lg:text-sm mt-1">
                    {pendingDocuments.length === 1 
                      ? "Tienes 1 documento que requiere tu firma" 
                      : `Tienes ${pendingDocuments.length} documentos que requieren tu firma`}
                  </p>
                  <p className="text-white text-xs mt-2 font-semibold">
                    👉 Pulsa aquí para firmar
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ENCUESTAS */}
        {activeSurveys.length > 0 && (
          <Link to={createPageUrl("Surveys")}>
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-purple-500 animate-pulse">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-bold text-base lg:text-lg">
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

        {/* CONVOCATORIAS PENDIENTES */}
        {pendingCallups > 0 && (
          <Link to={createPageUrl("ParentCallups")}>
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-yellow-500 animate-pulse">
              <div className="flex items-start gap-3">
                <Bell className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-bold text-base lg:text-lg">
                    🏆 ¡Convocatorias Pendientes!
                  </p>
                  <p className="text-yellow-100 text-xs lg:text-sm mt-1">
                    {pendingCallups === 1 
                      ? "Tienes 1 convocatoria esperando confirmación" 
                      : `Tienes ${pendingCallups} convocatorias esperando confirmación`}
                  </p>
                  <p className="text-white text-xs mt-2 font-semibold">
                    👉 Pulsa aquí para confirmar asistencia
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* MENSAJES URGENTES */}
        {urgentUnreadMessages > 0 && (
          <Link to={createPageUrl("ParentChat")}>
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-red-500 animate-pulse">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-bold text-base lg:text-lg">
                    🚨 ¡Mensajes Urgentes!
                  </p>
                  <p className="text-red-100 text-xs lg:text-sm mt-1">
                    {urgentUnreadMessages === 1 
                      ? "Tienes 1 mensaje urgente sin leer" 
                      : `Tienes ${urgentUnreadMessages} mensajes urgentes sin leer`}
                  </p>
                  <p className="text-white text-xs mt-2 font-semibold">
                    👉 Pulsa aquí para leer
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ANUNCIOS URGENTES */}
        {urgentAnnouncements.length > 0 && (
          <Link to={createPageUrl("Announcements")}>
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-red-500 animate-pulse">
              <div className="flex items-start gap-3">
                <Megaphone className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-bold text-base lg:text-lg">
                    🚨 ¡Anuncio Urgente!
                  </p>
                  <p className="text-red-100 text-xs lg:text-sm mt-1">
                    {urgentAnnouncements[0].titulo}
                  </p>
                  <p className="text-white text-xs mt-2 font-semibold">
                    👉 Pulsa aquí para leer • Válido 24h
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ANUNCIOS IMPORTANTES */}
        {importantAnnouncements.length > 0 && urgentAnnouncements.length === 0 && (
          <Link to={createPageUrl("Announcements")}>
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-orange-500 animate-pulse">
              <div className="flex items-start gap-3">
                <Megaphone className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-bold text-base lg:text-lg">
                    ⚠️ Anuncio Importante
                  </p>
                  <p className="text-orange-100 text-xs lg:text-sm mt-1">
                    {importantAnnouncements[0].titulo}
                  </p>
                  <p className="text-white text-xs mt-2 font-semibold">
                    👉 Pulsa aquí para leer • Válido 48h
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* PEDIDOS PENDIENTES */}
        {pendingClothingOrders.length > 0 && (
          <Link to={createPageUrl("ClothingOrders")}>
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-4 shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-indigo-500 animate-pulse">
              <div className="flex items-start gap-3">
                <ShoppingBag className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-bold text-base lg:text-lg">
                    🛍️ Pedidos de Equipación Pendientes
                  </p>
                  <p className="text-indigo-100 text-xs lg:text-sm mt-1">
                    {pendingClothingOrders.length === 1 
                      ? "Tienes 1 pedido pendiente de pago/confirmación" 
                      : `Tienes ${pendingClothingOrders.length} pedidos pendientes`}
                  </p>
                  <p className="text-white text-xs mt-2 font-semibold">
                    👉 Pulsa aquí para ver estado
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}



        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {menuItems.map((item, index) => (
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
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-blue-500 mb-1">
                {unreadMessages}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Mensajes Nuevos</div>
            </div>
          </div>
        </div>

        <ContactCard />
      </div>
    </div>
  );
}