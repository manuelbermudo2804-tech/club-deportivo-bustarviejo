import { createPageUrl } from "@/utils";
import {
  Home, Users, CreditCard, ShoppingBag, Bell, Calendar, Megaphone, Archive,
  Settings, MessageCircle, Clock, Image, FileText, Clover, UserCircle,
  FileSignature, Gift, Smartphone, Download, BarChart3, ShieldAlert,
  ClipboardCheck, Star, Trophy, KeyRound, RotateCw, CheckCircle2,
  User as UserIcon, Share2, ExternalLink, Shirt, Camera, HeartPulse, Landmark, MapPin, Brain
} from "lucide-react";

/**
 * All navigation builder functions receive a single `ctx` object with the
 * exact same variables that the Layout's useMemo callbacks used to close over.
 * This keeps the extraction 100% mechanical — no logic changes.
 */

// Helper: convierte landings autorizadas en items de menú apuntando al panel de inscritos
function buildLandingItems(landingMenuItems = []) {
  return (landingMenuItems || []).map((l) => ({
    title: `${l.panel_gestion?.emoji || "🎉"} ${l.panel_gestion?.nombre_menu || l.nombre}`,
    url: `/PageBuilderInscritos?id=${l.id}`,
    icon: Calendar,
  }));
}

export function buildAdminNavigation(ctx) {
  const {
    playersNeedingReview, pendingSignaturesAdmin, pendingInvitations,
    pendingCallupResponses, chatMenuCounts, pendingCallupsCount,
    hasPlayers, loteriaVisible, pendingLotteryOrders, pendingMemberRequests,
    marketNewCount, unresolvedAdminChats, paymentsInReview, pendingSignaturesCount,
    landingMenuItems,
  } = ctx;

  return [
    { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },

    { title: "─ GESTIÓN DE PERSONAS ─", section: true },
    { title: "👥 Jugadores", url: createPageUrl("Players"), icon: Users, badge: playersNeedingReview > 0 ? playersNeedingReview : null },
    { title: "🔄 Renovaciones", url: createPageUrl("RenewalDashboard"), icon: RotateCw },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature, badge: pendingSignaturesAdmin > 0 ? pendingSignaturesAdmin : null, urgentBadge: pendingSignaturesAdmin > 0 },
    { title: "🏃 Entrenadores", url: createPageUrl("CoachProfiles"), icon: Users },
    { title: "👤 Usuarios", url: createPageUrl("UserManagement"), icon: Users },
    { title: "🔑 Códigos de Acceso", url: createPageUrl("AdminAccessCodes"), icon: KeyRound, badge: pendingInvitations > 0 ? pendingInvitations : null },

    { title: "─ FINANZAS ─", section: true },
    { title: "💳 Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerFinancialPanel"), icon: BarChart3 },
    { title: "🔔 Recordatorios", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },
    { title: "🏛️ Subvenciones", url: createPageUrl("SubvencionesPanel"), icon: Landmark },

    { title: "─ DEPORTIVO ─", section: true },
    { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    { title: "🚨 Riesgo de Abandono", url: createPageUrl("RiesgoAbandono"), icon: ShieldAlert },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    { title: "⏱️ Control Minutos", url: createPageUrl("MatchMinutesTracker"), icon: Clock },
    { title: "👕 Gestión de Dorsales", url: createPageUrl("DorsalManagement"), icon: Shirt, badge: ctx.pendingDorsalCount > 0 ? ctx.pendingDorsalCount : null, urgentBadge: ctx.pendingDorsalCount > 0 },

    { title: "─ CALENDARIO Y EVENTOS ─", section: true },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Gestión Eventos", url: createPageUrl("EventManagement"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },

    { title: "─ COMUNICACIÓN ─", section: true },
    { title: "📱 Centro Difusión Social", url: createPageUrl("SocialHub"), icon: Share2 },
    { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle, badge: chatMenuCounts.staffCount },
    { title: "💬 Chat Coordinador-Familias", url: createPageUrl("CoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorCount },
    { title: "⚽ Chat Entrenador-Familias", url: createPageUrl("CoachParentChat"), icon: MessageCircle, badge: chatMenuCounts.coachCount },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("DocumentManagement"), icon: FileText },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "💬 Feedback Usuarios", url: createPageUrl("FeedbackManagement"), icon: MessageCircle, badge: ctx.pendingFeedback > 0 ? ctx.pendingFeedback : null },
    { title: "✉️ Buzón Juvenil", url: createPageUrl("JuniorMailboxAdmin"), icon: MessageCircle },

    { title: "─ TIENDA Y SERVICIOS ─", section: true },
    { title: "🛍️ Tienda y Equipación", url: createPageUrl("Tienda"), icon: ShoppingBag },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("LotteryManagement"), icon: Clover, badge: pendingLotteryOrders > 0 ? pendingLotteryOrders : null }] : []),
    { title: "🎫 Gestión Socios", url: createPageUrl("ClubMembersManagement"), icon: Users, badge: pendingMemberRequests > 0 ? pendingMemberRequests : null },
    { title: "💰 Patrocinios", url: createPageUrl("Sponsorships"), icon: CreditCard },
    { title: "🎁 Trae un Socio Amigo", url: createPageUrl("ReferralManagement"), icon: Gift },
    { title: "📋 Contactos Web", url: createPageUrl("WebContacts"), icon: Users },

    { title: "─ CONTENIDO ─", section: true },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

    ...(hasPlayers ? [
      { title: "─ MIS HIJOS ─", section: true },
      { title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null },
    ] : []),

    { title: "─ PROTECCIÓN DEL MENOR ─", section: true },
    { title: "🛡️ LOPIVI - Incidencias", url: createPageUrl("LopiviAdmin"), icon: ShieldAlert, badge: ctx.pendingLopiviCount > 0 ? ctx.pendingLopiviCount : null, urgentBadge: ctx.pendingLopiviCount > 0, highlight: ctx.pendingLopiviCount > 0 },
    { title: "📸 Autorización de Imagen", url: createPageUrl("PhotoAuthorizations"), icon: Camera },

    { title: "─ CONFIGURACIÓN ─", section: true },
    { title: "🧾 Memoria del Club", url: createPageUrl("ClubMemory"), icon: FileText },
    { title: "🗺️ Mapa de Crecimiento", url: createPageUrl("GrowthMap"), icon: MapPin },
    { title: "🧠 Club IA", url: createPageUrl("ClubIA"), icon: Brain },
    { title: "🩺 Panel de Salud", url: createPageUrl("HealthCheck"), icon: HeartPulse },
    { title: "⚙️ Temporadas y Categorías", url: createPageUrl("SeasonManagement"), icon: Settings },
    { title: "🔔 Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    { title: "📊 Estadísticas Chat", url: createPageUrl("ChatAnalyticsDashboard"), icon: BarChart3 },
    { title: "🩺 Análisis Inteligente App", url: createPageUrl("AppAnalytics"), icon: BarChart3 },
    { title: "⚡ Monitor de Créditos", url: createPageUrl("CreditUsage"), icon: BarChart3 },
    { title: "🌐 Páginas Externas", url: "/ExternalLinks", icon: ExternalLink },
    { title: "🚀 Constructor de Páginas", url: "/PageBuilder", icon: Megaphone },

    { title: "─ EVENTOS ESPECIALES ─", section: true },
    { title: "🎉 Inscripciones San Isidro", url: createPageUrl("SanIsidroAdmin"), icon: Calendar },
    { title: "🏆 Porra Mundial 2026", url: createPageUrl("PorraAdmin"), icon: Trophy },
    ...buildLandingItems(landingMenuItems),

    { title: "─ DESARROLLO ─", section: true },
    { title: "📲 Check-in Tablet", url: createPageUrl("CheckinTablet"), icon: Smartphone },
    { title: "🔬 Registro de Errores y Eventos", url: createPageUrl("UploadDiagnostics"), icon: ShieldAlert },
    { title: "🔔 Test Push (Diagnóstico)", url: "/PushBadgeTest", icon: Bell },
    { title: "💬 Test Consola Chats", url: createPageUrl("ChatTestConsole"), icon: MessageCircle },
  ];
}

export function buildCoachNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts,
    isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount,
    hasPlayers, loteriaVisible, marketNewCount, user, landingMenuItems,
  } = ctx;

  return [
    ...(programaSociosActivo && isMemberPaid ? [{ title: "🎫 MI CARNET DE SOCIO", url: createPageUrl("MemberCardDisplay"), icon: Users, highlight: true }] : []),
    { title: "🏠 Inicio", url: createPageUrl("CoachDashboard"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "💬 Chat con Familias", url: createPageUrl("CoachParentChat"), icon: MessageCircle, badge: chatMenuCounts.coachCount },
    { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle, badge: chatMenuCounts.staffCount },

    { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
    { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
    { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
    { title: "📚 Biblioteca Ejercicios", url: createPageUrl("ExerciseLibrary"), icon: FileText },
    { title: "🎯 Pizarra Táctica", url: createPageUrl("TacticsBoard"), icon: Calendar },
    { title: "📊 Competición (Técnicos)", url: createPageUrl("CentroCompeticionTecnico"), icon: BarChart3 },
    { title: "⏱️ Control Minutos", url: createPageUrl("MatchMinutesTracker"), icon: Clock },

    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },
    ...(user?.puede_gestionar_firmas ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature }] : []),

    ...(isPlayer ? [
      { title: "─ MI PERFIL JUGADOR ─", section: true },
      { title: "⚽ Mi Perfil Jugador", url: createPageUrl("PlayerProfile"), icon: UserCircle },
      { title: "🏆 Mis Convocatorias (Jugador)", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
      { title: "💳 Mis Pagos (Jugador)", url: createPageUrl("ParentPayments"), icon: CreditCard },
      { title: "🖊️ Mis Firmas (Jugador)", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
      { title: "📄 Mis Documentos (Jugador)", url: createPageUrl("ParentDocuments"), icon: FileText },
    ] : []),

    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    ...(ctx.porraActiva ? [{ title: "🏆 Porra Mundial 2026", url: createPageUrl("MiPorra"), icon: Trophy, highlight: true }] : []),

    ...(hasPlayers ? [
      { title: "─ MIS HIJOS ─", section: true },
      { title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users },
      { title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard },
      { title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null },
      { title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
      { title: "📄 Documentos y LOPIVI", url: createPageUrl("ParentDocuments"), icon: FileText },
    ] : []),
    { title: "🛍️ Tienda y Equipación", url: createPageUrl("Tienda"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "💬 Mi Feedback", url: createPageUrl("MyFeedback"), icon: MessageCircle },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    ...(landingMenuItems?.length ? [
      { title: "─ EVENTOS ESPECIALES ─", section: true },
      ...buildLandingItems(landingMenuItems),
    ] : []),
  ];
}

export function buildCoordinatorNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts,
    isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount,
    hasPlayers, loteriaVisible, marketNewCount, user, landingMenuItems,
  } = ctx;

  return [
    ...(programaSociosActivo && isMemberPaid ? [{ title: "🎫 MI CARNET DE SOCIO", url: createPageUrl("MemberCardDisplay"), icon: Users, highlight: true }] : []),
    { title: "🏠 Inicio", url: createPageUrl("CoordinatorDashboard"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "💬 Familias - Coordinador", url: createPageUrl("CoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorCount },
    ...(user?.es_entrenador ? [{ title: "⚽ Familias - Entrenador", url: createPageUrl("CoachParentChat"), icon: MessageCircle, badge: chatMenuCounts.coachCount }] : []),
    { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle, badge: chatMenuCounts.staffCount },

    { title: user?.es_entrenador ? "🎓 Convocatorias" : "🎓 Ver Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
    { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
    { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
    { title: "📚 Biblioteca Ejercicios", url: createPageUrl("ExerciseLibrary"), icon: FileText },
    { title: "🎯 Pizarra Táctica", url: createPageUrl("TacticsBoard"), icon: Calendar },
    { title: "📊 Competición (Técnicos)", url: createPageUrl("CentroCompeticionTecnico"), icon: BarChart3 },
    { title: "⏱️ Control Minutos", url: createPageUrl("MatchMinutesTracker"), icon: Clock },
    ...(user?.puede_gestionar_firmas ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature }] : []),

    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    { title: "🚨 Riesgo de Abandono", url: createPageUrl("RiesgoAbandono"), icon: ShieldAlert },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "📋 Contactos Web", url: createPageUrl("WebContacts"), icon: Users },
    { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },
    { title: "🎉 San Isidro 2026", url: createPageUrl("SanIsidroAdmin"), icon: Calendar },
    ...(ctx.porraActiva ? [{ title: "🏆 Porra Mundial 2026", url: createPageUrl("MiPorra"), icon: Trophy, highlight: true }] : []),

    ...(isPlayer ? [
      { title: "─ MI PERFIL JUGADOR ─", section: true },
      { title: "⚽ Mi Perfil Jugador", url: createPageUrl("PlayerProfile"), icon: UserCircle },
      { title: "🏆 Mis Convocatorias (Jugador)", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
      { title: "💳 Mis Pagos (Jugador)", url: createPageUrl("ParentPayments"), icon: CreditCard },
      { title: "🖊️ Mis Firmas (Jugador)", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
      { title: "📄 Mis Documentos y LOPIVI (Jugador)", url: createPageUrl("ParentDocuments"), icon: FileText },
    ] : []),

    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

    ...(hasPlayers ? [
      { title: "─ MIS HIJOS ─", section: true },
      { title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users },
      { title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard },
      { title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null },
      { title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
      { title: "📄 Documentos y LOPIVI", url: createPageUrl("ParentDocuments"), icon: FileText },
    ] : []),
    { title: "🛍️ Tienda y Equipación", url: createPageUrl("Tienda"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "💬 Mi Feedback", url: createPageUrl("MyFeedback"), icon: MessageCircle },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    ...(landingMenuItems?.length ? [
      { title: "─ EVENTOS ESPECIALES ─", section: true },
      ...buildLandingItems(landingMenuItems),
    ] : []),
  ];
}

export function buildParentNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupsCount,
    pendingSignaturesCount, chatMenuCounts, hasPlayers, loteriaVisible, marketNewCount,
    onlyComplementary, landingMenuItems,
  } = ctx;

  const items = [
    ...(programaSociosActivo && isMemberPaid ? [{ title: "🎫 MI CARNET DE SOCIO", url: createPageUrl("MemberCardDisplay"), icon: Users, highlight: true }] : []),
    { title: "🏠 Inicio", url: createPageUrl("ParentDashboard"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount },
    { title: "🎓 Chat Coordinador (1-a-1)", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount },
    { title: "⚽ Chat Equipo (Grupal)", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount },
    ...(!onlyComplementary ? [{ title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 }] : []),
    ...(!onlyComplementary ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 }] : []),
    { title: "💳 Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "👥 Mis Jugadores e Inscripciones", url: createPageUrl("ParentPlayers"), icon: Users },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    ...(ctx.porraActiva ? [{ title: "🏆 Porra Mundial 2026", url: createPageUrl("MiPorra"), icon: Trophy, highlight: true }] : []),
    ...(!onlyComplementary ? [{ title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy }] : []),
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos y LOPIVI", url: createPageUrl("ParentDocuments"), icon: FileText },
    ...(!onlyComplementary ? [{ title: "🛍️ Tienda y Equipación", url: createPageUrl("Tienda"), icon: ShoppingBag }] : []),
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "💬 Mi Feedback", url: createPageUrl("MyFeedback"), icon: MessageCircle },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    ...(landingMenuItems?.length ? [
      { title: "─ EVENTOS ESPECIALES ─", section: true },
      ...buildLandingItems(landingMenuItems),
    ] : []),
  ];
  return items;
}

export function buildPlayerNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount,
    chatMenuCounts, loteriaVisible, marketNewCount, onlyComplementary, landingMenuItems,
  } = ctx;

  return [
    ...(programaSociosActivo && isMemberPaid ? [{ title: "🎫 MI CARNET DE SOCIO", url: createPageUrl("MemberCardDisplay"), icon: Users, highlight: true }] : []),
    { title: "🏠 Inicio", url: createPageUrl("PlayerDashboard"), icon: Home },
    { title: "👤 Mi Perfil", url: createPageUrl("PlayerProfile"), icon: UserCircle },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount },
    { title: "🎓 Chat Coordinador (1-a-1)", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount },
    { title: "⚽ Chat Equipo (Grupal)", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount },
    ...(!onlyComplementary ? [{ title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 }] : []),
    ...(!onlyComplementary ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 }] : []),
    { title: "💳 Mis Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    ...(ctx.porraActiva ? [{ title: "🏆 Porra Mundial 2026", url: createPageUrl("MiPorra"), icon: Trophy, highlight: true }] : []),
    ...(!onlyComplementary ? [{ title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy }] : []),
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos y LOPIVI", url: createPageUrl("ParentDocuments"), icon: FileText },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🛍️ Tienda y Equipación", url: createPageUrl("Tienda"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "💬 Mi Feedback", url: createPageUrl("MyFeedback"), icon: MessageCircle },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    ...(landingMenuItems?.length ? [
      { title: "─ EVENTOS ESPECIALES ─", section: true },
      ...buildLandingItems(landingMenuItems),
    ] : []),
  ];
}

export function buildTreasurerNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount,
    chatMenuCounts, hasPlayers, loteriaVisible, unreadAnnouncementsCount, marketNewCount,
    landingMenuItems,
  } = ctx;

  return [
    ...(programaSociosActivo && isMemberPaid ? [{ title: "🎫 MI CARNET DE SOCIO", url: createPageUrl("MemberCardDisplay"), icon: Users, highlight: true }] : []),
    { title: "🏠 Inicio", url: createPageUrl("TreasurerDashboard"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "💳 Pagos Club", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerFinancialPanel"), icon: BarChart3 },
    { title: "🔔 Recordatorios", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },
    { title: "🛍️ Tienda y Equipación", url: createPageUrl("Tienda"), icon: ShoppingBag },
    { title: "🎫 Socios", url: createPageUrl("ClubMembersManagement"), icon: Users },
    ...(hasPlayers ? [{ title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount }] : []),
    ...(hasPlayers ? [{ title: "🎓 Chat Coordinador", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount }] : []),
    ...(hasPlayers ? [{ title: "⚽ Chat Equipo", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount }] : []),
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    ...(ctx.porraActiva ? [{ title: "🏆 Porra Mundial 2026", url: createPageUrl("MiPorra"), icon: Trophy, highlight: true }] : []),
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
    ...(hasPlayers ? [{ title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard }] : []),
    ...(hasPlayers ? [{ title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 }] : []),
    ...(hasPlayers ? [{ title: "🖊️ Firmas Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 }] : []),
    ...(hasPlayers ? [{ title: "📄 Documentos y LOPIVI", url: createPageUrl("ParentDocuments"), icon: FileText }] : []),
    ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "💬 Mi Feedback", url: createPageUrl("MyFeedback"), icon: MessageCircle },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    ...(landingMenuItems?.length ? [
      { title: "─ EVENTOS ESPECIALES ─", section: true },
      ...buildLandingItems(landingMenuItems),
    ] : []),
  ];
}

export function buildMinorNavigation(ctx) {
  const { pendingCallupsCount } = ctx;

  return [
    { title: "🏠 Inicio", url: createPageUrl("MinorDashboard"), icon: Home },
    { title: "📋 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "🎉 Eventos", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📊 Mis Evaluaciones", url: createPageUrl("PlayerEvaluations"), icon: Star },
    { title: "✉️ Mi Buzón", url: createPageUrl("JuniorMailbox"), icon: MessageCircle },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
  ];
}