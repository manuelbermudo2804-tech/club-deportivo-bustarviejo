import React from "react";
import { Home, Users, CreditCard, ShoppingBag, Calendar, Megaphone, Image, Bell, Settings, ClipboardCheck, CheckCircle2, Star, TrendingUp, FileText, Clover, Archive, BarChart3, FileSignature, Heart, Award, RotateCcw, MessageCircle, ShieldAlert, UserCircle, Gift, Mail, Trophy } from "lucide-react";
import { createPageUrl } from "@/utils";

// DEFINICIÓN COMPLETA - refleja TODO el menú lateral de admin
export const ALL_ADMIN_BUTTONS = [
  { id: "pagos", title: "💳 Pagos", icon: CreditCard, url: createPageUrl("Payments"), gradient: "from-green-600 to-green-700", priority: 1 },
  { id: "jugadores", title: "👥 Jugadores", icon: Users, url: createPageUrl("Players"), gradient: "from-orange-600 to-orange-700", priority: 2 },
  { id: "financiero", title: "📊 Panel Financiero", icon: TrendingUp, url: createPageUrl("TreasurerFinancialPanel"), gradient: "from-emerald-600 to-emerald-700", priority: 3 },
  { id: "cobros_extra", title: "💸 Cobros Extra", icon: CreditCard, url: createPageUrl("ExtraCharges"), gradient: "from-red-600 to-red-700", priority: 4 },
  { id: "firmas", title: "🖊️ Firmas Federación", icon: FileSignature, url: createPageUrl("FederationSignaturesAdmin"), gradient: "from-yellow-600 to-orange-600", priority: 5 },
  { id: "renovaciones", title: "🔄 Dashboard Renovaciones", icon: RotateCcw, url: createPageUrl("RenewalDashboard"), gradient: "from-cyan-600 to-cyan-700", priority: 6 },
  { id: "calendario", title: "📅 Calendario", icon: Calendar, url: createPageUrl("CalendarAndSchedules"), gradient: "from-purple-600 to-purple-700", priority: 7 },
  { id: "convocatorias", title: "🎓 Convocatorias", icon: Bell, url: createPageUrl("CoachCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 8 },
  { id: "asistente", title: "🤖 Asistente Virtual", icon: MessageCircle, url: createPageUrl("Chatbot"), gradient: "from-indigo-600 to-purple-700", priority: 9 },
  { id: "chat_staff", title: "💼 Chat Staff", icon: MessageCircle, url: createPageUrl("StaffChat"), gradient: "from-purple-600 to-purple-700", priority: 10 },
  { id: "chat_familias", title: "💬 Chat Familias (Coordinador)", icon: MessageCircle, url: createPageUrl("CoordinatorChat"), gradient: "from-cyan-600 to-cyan-700", priority: 11 },
  { id: "chat_entrenador", title: "⚽ Chat Entrenador-Familias", icon: MessageCircle, url: createPageUrl("CoachParentChat"), gradient: "from-blue-600 to-blue-700", priority: 12 },
  { id: "usuarios", title: "👤 Usuarios", icon: Users, url: createPageUrl("UserManagement"), gradient: "from-blue-600 to-blue-700", priority: 13 },
  { id: "recordatorios", title: "🔔 Recordatorios", icon: Bell, url: createPageUrl("PaymentReminders"), gradient: "from-red-600 to-orange-700", priority: 14 },
  { id: "historico", title: "📁 Histórico", icon: Archive, url: createPageUrl("PaymentHistory"), gradient: "from-slate-600 to-slate-700", priority: 15 },
  { id: "invitaciones", title: "📧 Solicitudes Invitación", icon: Mail, url: createPageUrl("InvitationRequests"), gradient: "from-purple-600 to-purple-700", priority: 16 },
  { id: "socios", title: "🎫 Gestión Socios", icon: Heart, url: createPageUrl("ClubMembersManagement"), gradient: "from-pink-600 to-pink-700", priority: 17 },
  { id: "entrenadores", title: "🏃 Entrenadores", icon: Award, url: createPageUrl("CoachProfiles"), gradient: "from-indigo-600 to-indigo-700", priority: 18 },
  { id: "reportes", title: "📊 Reportes", icon: Star, url: createPageUrl("CoachEvaluationReports"), gradient: "from-purple-600 to-purple-700", priority: 19 },
  { id: "competicion", title: "🏆 Competición", icon: Trophy, url: createPageUrl("CentroCompeticion"), gradient: "from-orange-600 to-orange-700", priority: 20 },
  { id: "asistencia", title: "📋 Asistencia", icon: CheckCircle2, url: createPageUrl("TeamAttendanceEvaluation"), gradient: "from-green-600 to-green-700", priority: 21 },
  { id: "voluntariado", title: "🤝 Voluntariado", icon: Users, url: createPageUrl("Voluntariado"), gradient: "from-teal-600 to-teal-700", priority: 22 },
  { id: "mercadillo", title: "🛍️ Mercadillo", icon: Gift, url: createPageUrl("Mercadillo"), gradient: "from-amber-600 to-amber-700", priority: 23 },
  { id: "anuncios", title: "📢 Anuncios", icon: Megaphone, url: createPageUrl("Announcements"), gradient: "from-pink-600 to-pink-700", priority: 24 },
  { id: "documentos", title: "📄 Documentos", icon: FileText, url: createPageUrl("DocumentManagement"), gradient: "from-slate-600 to-slate-700", priority: 25 },
  { id: "tareas_junta", title: "🗂️ Tareas Junta", icon: ClipboardCheck, url: createPageUrl("BoardTasks"), gradient: "from-slate-600 to-slate-700", priority: 26 },
  { id: "encuestas", title: "📋 Encuestas", icon: FileText, url: createPageUrl("Surveys"), gradient: "from-purple-600 to-purple-700", priority: 27 },
  { id: "eventos", title: "🎉 Eventos", icon: Calendar, url: createPageUrl("EventManagement"), gradient: "from-indigo-600 to-indigo-700", priority: 28 },
  { id: "galeria", title: "🖼️ Galería", icon: Image, url: createPageUrl("Gallery"), gradient: "from-indigo-600 to-indigo-700", priority: 29 },
  { id: "patrocinios", title: "💰 Patrocinios", icon: CreditCard, url: createPageUrl("Sponsorships"), gradient: "from-green-600 to-green-700", priority: 30 },
  { id: "referidos", title: "🎁 Trae un Socio", icon: Gift, url: createPageUrl("ReferralManagement"), gradient: "from-orange-600 to-orange-700", priority: 31 },
  { id: "femenino", title: "⚽👧 Fútbol Femenino", icon: Users, url: createPageUrl("FemeninoInterests"), gradient: "from-pink-600 to-pink-700", priority: 32 },
  { id: "analytics", title: "📊 Estadísticas Chat", icon: BarChart3, url: createPageUrl("ChatAnalyticsDashboard"), gradient: "from-blue-600 to-blue-700", priority: 33 },
  { id: "notificaciones", title: "🔔 Preferencias Notif.", icon: Settings, url: createPageUrl("NotificationPreferences"), gradient: "from-slate-600 to-slate-700", priority: 34 },
  { id: "configuracion", title: "⚙️ Configuración", icon: Settings, url: createPageUrl("SeasonManagement"), gradient: "from-slate-600 to-slate-700", priority: 35 },
  // Sección familia (si tiene hijos)
  { id: "confirmar_hijos", title: "👨‍👩‍👧 Confirmar Mis Hijos", icon: ClipboardCheck, url: createPageUrl("ParentCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 36, conditional: true, conditionKey: "hasPlayers" },
  { id: "loteria", title: "🍀 Lotería Navidad", icon: Clover, url: createPageUrl("LotteryManagement"), gradient: "from-green-600 to-green-700", priority: 37, conditional: true, conditionKey: "loteriaVisible" },
];

export const DEFAULT_ADMIN_BUTTONS = [
  "pagos",
  "jugadores",
  "financiero",
  "firmas",
  "renovaciones",
  "calendario",
  "convocatorias",
  "anuncios"
];

export const MIN_BUTTONS = 4;
export const MAX_BUTTONS = 999;