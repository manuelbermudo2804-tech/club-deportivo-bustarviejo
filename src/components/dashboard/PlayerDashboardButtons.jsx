import React from "react";
import { Bell, CreditCard, Calendar, Megaphone, Image, FileText, BarChart3, Heart } from "lucide-react";
import { createPageUrl } from "@/utils";

export const ALL_PLAYER_BUTTONS = [
  { id: "convocatorias", title: "🏆 Convocatorias", icon: Bell, url: createPageUrl("ParentCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 1 },
  { id: "pagos", title: "💳 Mis Pagos", icon: CreditCard, url: createPageUrl("ParentPayments"), gradient: "from-green-600 to-green-700", priority: 2 },
  { id: "calendario", title: "📅 Calendario", icon: Calendar, url: createPageUrl("CalendarAndSchedules"), gradient: "from-purple-600 to-purple-700", priority: 3 },
  { id: "anuncios", title: "📢 Anuncios", icon: Megaphone, url: createPageUrl("Announcements"), gradient: "from-pink-600 to-pink-700", priority: 4 },
  { id: "eventos", title: "🎉 Eventos Club", icon: Calendar, url: createPageUrl("ParentEventRSVP"), gradient: "from-cyan-600 to-cyan-700", priority: 5 },
  { id: "clasificaciones", title: "📊 Clasificaciones", icon: BarChart3, url: createPageUrl("Clasificaciones"), gradient: "from-blue-600 to-blue-700", priority: 6 },
  { id: "galeria", title: "🖼️ Galería", icon: Image, url: createPageUrl("Gallery"), gradient: "from-indigo-600 to-indigo-700", priority: 7 },
  { id: "encuestas", title: "📋 Encuestas", icon: FileText, url: createPageUrl("Surveys"), gradient: "from-purple-600 to-purple-700", priority: 8 },
  { id: "socio", title: "🎫 Hacerse Socio", icon: Heart, url: createPageUrl("ClubMembership"), gradient: "from-pink-600 to-pink-700", priority: 9 },
];

export const DEFAULT_PLAYER_BUTTONS = [
  "convocatorias",
  "pagos",
  "calendario",
  "anuncios",
  "eventos",
  "clasificaciones",
  "galeria",
  "encuestas"
];

export const MIN_BUTTONS = 8;
export const MAX_BUTTONS = 25;