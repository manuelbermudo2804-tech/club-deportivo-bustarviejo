import React from "react";
import { Users, Calendar, Bell, CreditCard, Image, Megaphone, ShoppingBag, FileText, Heart, FileSignature, BarChart3, Clover, Trophy, MessageCircle, Settings, Gift } from "lucide-react";
import { createPageUrl } from "@/utils";

// DEFINICIÓN COMPLETA - refleja TODO el menú lateral de familias
export const ALL_PARENT_BUTTONS = [
  { id: "convocatorias", title: "🏆 Convocatorias", icon: Bell, url: createPageUrl("ParentCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 1, competitionOnly: true },
  { id: "firmas", title: "🖊️ Firmas Federación", icon: FileSignature, url: createPageUrl("FederationSignatures"), gradient: "from-yellow-600 to-orange-600", priority: 2, competitionOnly: true },
  { id: "pagos", title: "💳 Pagos", icon: CreditCard, url: createPageUrl("ParentPayments"), gradient: "from-green-600 to-green-700", priority: 3 },
  { id: "jugadores", title: "👥 Mis Jugadores", icon: Users, url: createPageUrl("ParentPlayers"), gradient: "from-orange-600 to-orange-700", priority: 4 },
  { id: "asistente", title: "🤖 Asistente Virtual", icon: MessageCircle, url: createPageUrl("Chatbot"), gradient: "from-indigo-600 to-purple-700", priority: 5 },
  { id: "mensajes_club", title: "🔔 Mensajes Club", icon: Bell, url: createPageUrl("ParentSystemMessages"), gradient: "from-orange-600 to-orange-700", priority: 6 },
  { id: "chat_coordinador", title: "🎓 Chat Coordinador", icon: MessageCircle, url: createPageUrl("ParentCoordinatorChat"), gradient: "from-cyan-600 to-cyan-700", priority: 7 },
  { id: "chat_equipo", title: "⚽ Chat Equipo", icon: MessageCircle, url: createPageUrl("ParentCoachChat"), gradient: "from-blue-600 to-blue-700", priority: 8 },
  { id: "calendario", title: "📅 Calendario y Horarios", icon: Calendar, url: createPageUrl("CalendarAndSchedules"), gradient: "from-purple-600 to-purple-700", priority: 9 },
  { id: "voluntariado", title: "🤝 Voluntariado", icon: Users, url: createPageUrl("Voluntariado"), gradient: "from-teal-600 to-teal-700", priority: 10 },
  { id: "mercadillo", title: "🛍️ Mercadillo", icon: Gift, url: createPageUrl("Mercadillo"), gradient: "from-amber-600 to-amber-700", priority: 11 },
  { id: "eventos", title: "🎉 Eventos Club", icon: Calendar, url: createPageUrl("ParentEventRSVP"), gradient: "from-cyan-600 to-cyan-700", priority: 12 },
  { id: "clasificaciones", title: "🏆 Competición", icon: Trophy, url: createPageUrl("CentroCompeticion"), gradient: "from-orange-600 to-orange-700", priority: 13, competitionOnly: true },
  { id: "anuncios", title: "📢 Anuncios", icon: Megaphone, url: createPageUrl("Announcements"), gradient: "from-pink-600 to-pink-700", priority: 14 },
  { id: "documentos", title: "📄 Documentos", icon: FileText, url: createPageUrl("ParentDocuments"), gradient: "from-slate-600 to-slate-700", priority: 15 },
  { id: "tienda", title: "🛍️ Tienda", icon: ShoppingBag, url: createPageUrl("Tienda"), gradient: "from-orange-600 to-orange-700", priority: 16 },
  { id: "galeria", title: "🖼️ Galería", icon: Image, url: createPageUrl("Gallery"), gradient: "from-indigo-600 to-indigo-700", priority: 17 },
  { id: "encuestas", title: "📋 Encuestas", icon: FileText, url: createPageUrl("Surveys"), gradient: "from-purple-600 to-purple-700", priority: 17 },
  { id: "socio", title: "🎫 Hacerse Socio", icon: Heart, url: createPageUrl("ClubMembership"), gradient: "from-pink-600 to-pink-700", priority: 18 },
  { id: "notificaciones", title: "⚙️ Preferencias Notif.", icon: Settings, url: createPageUrl("NotificationPreferences"), gradient: "from-slate-600 to-slate-700", priority: 19 },
  { id: "loteria", title: "🍀 Lotería Navidad", icon: Clover, url: createPageUrl("ParentLottery"), gradient: "from-green-600 to-red-600", priority: 20, conditional: true, conditionKey: "loteriaVisible" },
];

export const DEFAULT_PARENT_BUTTONS = [
  "convocatorias",
  "firmas",
  "pagos",
  "jugadores",
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