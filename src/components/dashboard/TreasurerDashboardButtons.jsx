import React from "react";
import { CreditCard, Bell, Archive, ShoppingBag, Clover, Users, BarChart3, Euro, Calendar, Image, Megaphone, FileText, Award, TrendingUp, Trophy, MessageCircle, Settings, Gift, Heart, FileSignature, ClipboardCheck } from "lucide-react";
import { createPageUrl } from "@/utils";

// DEFINICIÓN COMPLETA - refleja TODO el menú lateral de tesoreros
// section: "treasurer" = trabajo de tesorero, "club" = vida de club / familia
export const ALL_TREASURER_BUTTONS = [
  // --- Sección Tesorero ---
  { id: "panel_financiero", title: "💰 Panel Financiero", url: createPageUrl("TreasurerFinancialPanel"), icon: BarChart3, gradient: "from-purple-600 to-indigo-700", priority: 1, section: "treasurer" },
  { id: "pagos_club", title: "💳 Pagos del Club", url: createPageUrl("Payments"), icon: CreditCard, gradient: "from-green-600 to-green-700", priority: 2, section: "treasurer" },
  { id: "recordatorios", title: "🔔 Recordatorios", url: createPageUrl("PaymentReminders"), icon: Bell, gradient: "from-red-600 to-orange-700", priority: 4, section: "treasurer" },
  { id: "historico", title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive, gradient: "from-slate-600 to-slate-700", priority: 5, section: "treasurer" },
  { id: "socios", title: "🎫 Socios", url: createPageUrl("ClubMembersManagement"), icon: Users, gradient: "from-pink-600 to-pink-700", priority: 6, section: "treasurer" },
  { id: "loteria", title: "🍀 Lotería", url: createPageUrl("LotteryManagement"), icon: Clover, gradient: "from-green-600 to-green-700", priority: 26, conditional: true, conditionKey: "loteriaVisible", section: "treasurer" },
  // --- Sección Club / Familia ---
  { id: "asistente", title: "🤖 Asistente Virtual", icon: MessageCircle, url: createPageUrl("Chatbot"), gradient: "from-indigo-600 to-purple-700", priority: 7, section: "club" },
  { id: "mensajes_club", title: "🔔 Mensajes Club", icon: Bell, url: createPageUrl("ParentSystemMessages"), gradient: "from-orange-600 to-orange-700", priority: 8, conditional: true, conditionKey: "hasPlayers", section: "club" },
  { id: "chat_coordinador", title: "🎓 Chat Coordinador", icon: MessageCircle, url: createPageUrl("ParentCoordinatorChat"), gradient: "from-cyan-600 to-cyan-700", priority: 9, conditional: true, conditionKey: "hasPlayers", section: "club" },
  { id: "chat_equipo", title: "⚽ Chat Equipo", icon: MessageCircle, url: createPageUrl("ParentCoachChat"), gradient: "from-blue-600 to-blue-700", priority: 10, conditional: true, conditionKey: "hasPlayers", section: "club" },
  { id: "calendario", title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar, gradient: "from-blue-600 to-blue-700", priority: 11, section: "club" },
  { id: "voluntariado", title: "🤝 Voluntariado", icon: Users, url: createPageUrl("Voluntariado"), gradient: "from-teal-600 to-teal-700", priority: 12, section: "club" },
  { id: "mercadillo", title: "🛍️ Mercadillo", icon: Gift, url: createPageUrl("Mercadillo"), gradient: "from-amber-600 to-amber-700", priority: 13, section: "club" },
  { id: "eventos", title: "🎉 Eventos Club", icon: Calendar, url: createPageUrl("ParentEventRSVP"), gradient: "from-cyan-600 to-cyan-700", priority: 14, section: "club" },
  { id: "anuncios", title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, gradient: "from-orange-600 to-red-700", priority: 15, section: "club" },
  { id: "mis_jugadores", title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users, gradient: "from-orange-600 to-orange-700", priority: 16, conditional: true, conditionKey: "hasPlayers", section: "club" },
  { id: "pagos_hijos", title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: Euro, gradient: "from-green-600 to-emerald-700", priority: 17, conditional: true, conditionKey: "hasPlayers", section: "club" },
  { id: "confirmar_hijos", title: "🏆 Convocatorias Hijos", icon: ClipboardCheck, url: createPageUrl("ParentCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 18, conditional: true, conditionKey: "hasPlayers", section: "club" },
  { id: "firmas_hijos", title: "🖊️ Firmas Hijos", icon: FileSignature, url: createPageUrl("FederationSignatures"), gradient: "from-yellow-600 to-orange-600", priority: 19, conditional: true, conditionKey: "hasPlayers", section: "club" },
  { id: "documentos_hijos", title: "📄 Documentos", icon: FileText, url: createPageUrl("ParentDocuments"), gradient: "from-slate-600 to-slate-700", priority: 20, conditional: true, conditionKey: "hasPlayers", section: "club" },
  { id: "clasificaciones", title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy, gradient: "from-orange-600 to-orange-700", priority: 21, section: "club" },
  { id: "tienda", title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag, gradient: "from-orange-600 to-orange-700", priority: 22, section: "club" },
  { id: "galeria", title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image, gradient: "from-purple-600 to-pink-700", priority: 23, section: "club" },
  { id: "encuestas", title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText, gradient: "from-indigo-600 to-purple-700", priority: 23, section: "club" },
  { id: "socio", title: "🎫 Hacerse Socio", icon: Heart, url: createPageUrl("ClubMembership"), gradient: "from-pink-600 to-pink-700", priority: 24, section: "club" },
  { id: "notificaciones", title: "⚙️ Preferencias Notif.", icon: Settings, url: createPageUrl("NotificationPreferences"), gradient: "from-slate-600 to-slate-700", priority: 25, section: "club" },
];

export const DEFAULT_TREASURER_BUTTONS = [
  "panel_financiero",
  "pagos_club",
  "recordatorios",
  "historico",
  "socios",
  "calendario",
  "clasificaciones",
  "galeria",
  "anuncios"
];

export const MIN_BUTTONS = 4;
export const MAX_BUTTONS = 999;