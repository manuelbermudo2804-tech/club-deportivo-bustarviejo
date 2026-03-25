import { createPageUrl } from "@/utils";
import {
  Home, Users, CreditCard, ShoppingBag, Bell, Calendar, Megaphone, Archive,
  Settings, MessageCircle, Clock, Image, FileText, Clover, UserCircle,
  FileSignature, Gift, Smartphone, Download, BarChart3, ShieldAlert,
  ClipboardCheck, Star, Trophy, KeyRound, RotateCw, CheckCircle2,
  User as UserIcon
} from "lucide-react";

/**
 * All navigation builder functions receive a single `ctx` object with the
 * exact same variables that the Layout's useMemo callbacks used to close over.
 * This keeps the extraction 100% mechanical — no logic changes.
 */

export function buildAdminNavigation(ctx) {
  const {
    playersNeedingReview, pendingSignaturesAdmin, pendingInvitations,
    pendingCallupResponses, chatMenuCounts, pendingCallupsCount,
    hasPlayers, loteriaVisible, pendingLotteryOrders, pendingMemberRequests,
    marketNewCount, unresolvedAdminChats, paymentsInReview, pendingSignaturesCount,
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
    { title: "💸 Cobros Extra", url: createPageUrl("ExtraCharges"), icon: CreditCard },
    { title: "🔔 Recordatorios", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },

    { title: "─ DEPORTIVO ─", section: true },
    { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    { title: "⏱️ Control Minutos", url: createPageUrl("MatchMinutesTracker"), icon: Clock },

    { title: "─ CALENDARIO Y EVENTOS ─", section: true },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Gestión Eventos", url: createPageUrl("EventManagement"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },

    { title: "─ COMUNICACIÓN ─", section: true },
    { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle, badge: chatMenuCounts.staffCount },
    { title: "💬 Chat Coordinador-Familias", url: createPageUrl("CoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorCount },
    { title: "⚽ Chat Entrenador-Familias", url: createPageUrl("CoachParentChat"), icon: MessageCircle, badge: chatMenuCounts.coachCount },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("DocumentManagement"), icon: FileText },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🗂️ Tareas Junta", url: createPageUrl("BoardTasks"), icon: ClipboardCheck },
    { title: "💬 Feedback Usuarios", url: createPageUrl("FeedbackManagement"), icon: MessageCircle },
    { title: "✉️ Buzón Juvenil", url: createPageUrl("JuniorMailboxAdmin"), icon: MessageCircle },

    { title: "─ TIENDA Y SERVICIOS ─", section: true },
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
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

    { title: "─ CONFIGURACIÓN ─", section: true },
    { title: "⚙️ Temporadas y Categorías", url: createPageUrl("SeasonManagement"), icon: Settings },
    { title: "🔔 Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    { title: "📊 Estadísticas Chat", url: createPageUrl("ChatAnalyticsDashboard"), icon: BarChart3 },
    { title: "🔬 Centro de Diagnóstico", url: createPageUrl("AppAnalytics"), icon: BarChart3 },
    { title: "⚡ Monitor de Créditos", url: createPageUrl("CreditUsage"), icon: BarChart3 },

    { title: "─ DESARROLLO ─", section: true },
    { title: "📖 Manual de Acceso", url: createPageUrl("ManualAcceso"), icon: FileText },
    { title: "📲 Check-in Tablet", url: createPageUrl("CheckinTablet"), icon: Smartphone },
    { title: "📊 Preview Stats Jugador", url: createPageUrl("PlayerStatsPreview"), icon: BarChart3 },
    { title: "🧪 Test Chats", url: createPageUrl("ChatTestConsole"), icon: BarChart3 },
    { title: "🧪 Vista Post-Instalación", url: createPageUrl("InstallSuccessPreview"), icon: Download },
    { title: "👁️ Preview Flujo Alta", url: createPageUrl("OnboardingPreview"), icon: UserIcon },
    { title: "📸 Diagnóstico Subidas", url: createPageUrl("UploadDiagnostics"), icon: ShieldAlert },
  ];
}

export function buildCoachNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts,
    isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount,
    hasPlayers, loteriaVisible, marketNewCount, user,
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

    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },

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

    ...(hasPlayers ? [
      { title: "─ MIS HIJOS ─", section: true },
      { title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users },
      { title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard },
      { title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null },
      { title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
      { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },
    ] : []),
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
  ];
}

export function buildCoordinatorNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts,
    isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount,
    hasPlayers, loteriaVisible, marketNewCount, user,
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
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "📋 Contactos Web", url: createPageUrl("WebContacts"), icon: Users },
    { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },

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

    ...(hasPlayers ? [
      { title: "─ MIS HIJOS ─", section: true },
      { title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users },
      { title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard },
      { title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null },
      { title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
      { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },
    ] : []),
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
  ];
}

export function buildParentNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, isJunta, pendingCallupsCount,
    pendingSignaturesCount, chatMenuCounts, hasPlayers, loteriaVisible, marketNewCount,
  } = ctx;

  return [
    ...(programaSociosActivo && isMemberPaid ? [{ title: "🎫 MI CARNET DE SOCIO", url: createPageUrl("MemberCardDisplay"), icon: Users, highlight: true }] : []),
    ...(isJunta ? [{ title: "🗂️ Tareas Junta", url: createPageUrl("BoardTasks"), icon: ClipboardCheck, highlight: true }] : []),
    { title: "🏠 Inicio", url: createPageUrl("ParentDashboard"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount },
    { title: "🎓 Chat Coordinador (1-a-1)", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount },
    { title: "⚽ Chat Equipo (Grupal)", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount },
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
    { title: "💳 Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "👥 Mis Jugadores", url: createPageUrl("ParentPlayers"), icon: Users },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
  ];
}

export function buildPlayerNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount,
    chatMenuCounts, loteriaVisible, marketNewCount,
  } = ctx;

  return [
    ...(programaSociosActivo && isMemberPaid ? [{ title: "🎫 MI CARNET DE SOCIO", url: createPageUrl("MemberCardDisplay"), icon: Users, highlight: true }] : []),
    { title: "🏠 Inicio", url: createPageUrl("PlayerDashboard"), icon: Home },
    { title: "👤 Mi Perfil", url: createPageUrl("PlayerProfile"), icon: UserCircle },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount },
    { title: "🎓 Chat Coordinador (1-a-1)", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount },
    { title: "⚽ Chat Equipo (Grupal)", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount },
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
    { title: "💳 Mis Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
  ];
}

export function buildTreasurerNavigation(ctx) {
  const {
    programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount,
    chatMenuCounts, hasPlayers, loteriaVisible, unreadAnnouncementsCount, marketNewCount,
  } = ctx;

  return [
    ...(programaSociosActivo && isMemberPaid ? [{ title: "🎫 MI CARNET DE SOCIO", url: createPageUrl("MemberCardDisplay"), icon: Users, highlight: true }] : []),
    { title: "🏠 Inicio", url: createPageUrl("TreasurerDashboard"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "💳 Pagos Club", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerFinancialPanel"), icon: BarChart3 },
    { title: "💸 Cobros Extra", url: createPageUrl("ExtraCharges"), icon: CreditCard },
    { title: "🔔 Recordatorios", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
    { title: "🎫 Socios", url: createPageUrl("ClubMembersManagement"), icon: Users },
    ...(hasPlayers ? [{ title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount }] : []),
    ...(hasPlayers ? [{ title: "🎓 Chat Coordinador", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount }] : []),
    ...(hasPlayers ? [{ title: "⚽ Chat Equipo", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount }] : []),
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
    ...(hasPlayers ? [{ title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard }] : []),
    ...(hasPlayers ? [{ title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 }] : []),
    ...(hasPlayers ? [{ title: "🖊️ Firmas Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 }] : []),
    ...(hasPlayers ? [{ title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText }] : []),
    ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
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