import React from "react";
import { Bell, CreditCard, Calendar, Megaphone, Image, FileText, BarChart3, Heart, MessageCircle, FileSignature, Settings, Users, Gift, ShoppingBag, Trophy } from "lucide-react";
import { createPageUrl } from "@/utils";

export const ALL_PLAYER_BUTTONS = [
  { id: "perfil", title: "👤 Mi Perfil", icon: Users, url: createPageUrl("PlayerProfile"), gradient: "from-indigo-600 to-indigo-700", priority: 1 },
  { id: "convocatorias", title: "🏆 Convocatorias", icon: Bell, url: createPageUrl("ParentCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 2 },
  { id: "firmas", title: "🖊️ Firmas", icon: FileSignature, url: createPageUrl("FederationSignatures"), gradient: "from-red-600 to-red-700", priority: 3 },
  { id: "pagos", title: "💳 Mis Pagos", icon: CreditCard, url: createPageUrl("ParentPayments"), gradient: "from-green-600 to-green-700", priority: 3 },
  { id: "mensajes_club", title: "🔔 Mensajes Club", icon: Bell, url: createPageUrl("ParentSystemMessages"), gradient: "from-orange-600 to-orange-700", priority: 4 },
  { id: "chat_coordinador", title: "🎓 Chat Coordinador", icon: MessageCircle, url: createPageUrl("ParentCoordinatorChat"), gradient: "from-cyan-600 to-cyan-700", priority: 5 },
  { id: "chat_equipo", title: "⚽ Chat Equipo", icon: MessageCircle, url: createPageUrl("ParentCoachChat"), gradient: "from-blue-600 to-blue-700", priority: 6 },
  { id: "calendario", title: "📅 Calendario", icon: Calendar, url: createPageUrl("CalendarAndSchedules"), gradient: "from-purple-600 to-purple-700", priority: 7 },
  { id: "anuncios", title: "📢 Anuncios", icon: Megaphone, url: createPageUrl("Announcements"), gradient: "from-pink-600 to-pink-700", priority: 8 },
  { id: "eventos", title: "🎉 Eventos Club", icon: Calendar, url: createPageUrl("ParentEventRSVP"), gradient: "from-cyan-600 to-cyan-700", priority: 9 },
  { id: "clasificaciones", title: "📊 Competición", icon: Trophy, url: createPageUrl("CentroCompeticion"), gradient: "from-blue-600 to-blue-700", priority: 10 },
  { id: "documentos", title: "📄 Documentos", icon: FileText, url: createPageUrl("ParentDocuments"), gradient: "from-slate-600 to-slate-700", priority: 11 },
  { id: "voluntariado", title: "🤝 Voluntariado", icon: Users, url: createPageUrl("Voluntariado"), gradient: "from-teal-600 to-teal-700", priority: 12 },
  { id: "mercadillo", title: "🛍️ Mercadillo", icon: Gift, url: createPageUrl("Mercadillo"), gradient: "from-amber-600 to-amber-700", priority: 13 },
  { id: "galeria", title: "🖼️ Galería", icon: Image, url: createPageUrl("Gallery"), gradient: "from-indigo-600 to-indigo-700", priority: 14 },
  { id: "encuestas", title: "📋 Encuestas", icon: FileText, url: createPageUrl("Surveys"), gradient: "from-purple-600 to-purple-700", priority: 15 },
  { id: "socio", title: "🎫 Hacerse Socio", icon: Heart, url: createPageUrl("ClubMembership"), gradient: "from-pink-600 to-pink-700", priority: 16 },
  { id: "notificaciones", title: "⚙️ Preferencias Notif.", icon: Settings, url: createPageUrl("NotificationPreferences"), gradient: "from-slate-600 to-slate-700", priority: 17 },
];

export const DEFAULT_PLAYER_BUTTONS = [
  "convocatorias",
  "firmas",
  "pagos",
  "mensajes_club",
  "chat_coordinador",
  "chat_equipo",
  "calendario",
  "anuncios",
  "eventos",
  "clasificaciones",
  "documentos",
  "galeria",
  "encuestas"
];

export const MIN_BUTTONS = 4;
export const MAX_BUTTONS = 999;