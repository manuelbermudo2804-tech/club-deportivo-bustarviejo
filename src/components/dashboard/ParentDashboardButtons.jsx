import React from "react";
import { Users, Calendar, Bell, CreditCard, Image, Megaphone, ShoppingBag, FileText, Heart, FileSignature, BarChart3, Clover, Trophy } from "lucide-react";
import { createPageUrl } from "@/utils";

// DEFINICIÓN COMPLETA DE TODOS LOS BOTONES DISPONIBLES PARA PADRES
export const ALL_PARENT_BUTTONS = [
  {
    id: "convocatorias",
    title: "🏆 Convocatorias",
    icon: Bell,
    url: createPageUrl("ParentCallups"),
    gradient: "from-yellow-600 to-yellow-700",
    priority: 1
  },
  {
    id: "pagos",
    title: "💳 Pagos",
    icon: CreditCard,
    url: createPageUrl("ParentPayments"),
    gradient: "from-green-600 to-green-700",
    priority: 2
  },
  {
    id: "jugadores",
    title: "👥 Mis Jugadores",
    icon: Users,
    url: createPageUrl("ParentPlayers"),
    gradient: "from-orange-600 to-orange-700",
    priority: 3
  },
  {
    id: "calendario",
    title: "📅 Calendario y Horarios",
    icon: Calendar,
    url: createPageUrl("CalendarAndSchedules"),
    gradient: "from-purple-600 to-purple-700",
    priority: 4
  },
  {
    id: "firmas",
    title: "🖊️ Firmas Federación",
    icon: FileSignature,
    url: createPageUrl("FederationSignatures"),
    gradient: "from-yellow-600 to-orange-600",
    priority: 5
  },
  {
    id: "anuncios",
    title: "📢 Anuncios",
    icon: Megaphone,
    url: createPageUrl("Announcements"),
    gradient: "from-pink-600 to-pink-700",
    priority: 6
  },
  {
    id: "ropa",
    title: "Tienda",
    icon: ShoppingBag,
    url: createPageUrl("Shop"),
    gradient: "from-red-600 to-red-700",
    priority: 7
  },
  {
    id: "eventos",
    title: "🎉 Eventos Club",
    icon: Calendar,
    url: createPageUrl("ParentEventRSVP"),
    gradient: "from-cyan-600 to-cyan-700",
    priority: 8
  },
  {
    id: "clasificaciones",
    title: "📊 Clasificaciones",
    icon: Trophy,
    url: createPageUrl("CentroCompeticion"),
    gradient: "from-orange-600 to-orange-700",
    priority: 9
  },
  {
    id: "documentos",
    title: "📄 Documentos",
    icon: FileText,
    url: createPageUrl("ParentDocuments"),
    gradient: "from-slate-600 to-slate-700",
    priority: 10
  },
  {
    id: "galeria",
    title: "🖼️ Galería",
    icon: Image,
    url: createPageUrl("ParentGallery"),
    gradient: "from-indigo-600 to-indigo-700",
    priority: 11
  },
  {
    id: "encuestas",
    title: "📋 Encuestas",
    icon: FileText,
    url: createPageUrl("Surveys"),
    gradient: "from-purple-600 to-purple-700",
    priority: 12
  },
  {
    id: "socio",
    title: "🎫 Hacerse Socio",
    icon: Heart,
    url: createPageUrl("ClubMembership"),
    gradient: "from-pink-600 to-pink-700",
    priority: 13
  },
  {
    id: "loteria",
    title: "🍀 Lotería Navidad",
    icon: Clover,
    url: createPageUrl("ParentLottery"),
    gradient: "from-green-600 to-red-600",
    priority: 14,
    conditional: true, // Se muestra solo si lotería está activa
    conditionKey: "loteriaVisible"
  }
];

// BOTONES POR DEFECTO (8 iniciales)
export const DEFAULT_PARENT_BUTTONS = [
  "convocatorias",
  "pagos",
  "jugadores",
  "calendario",
  "firmas",
  "anuncios",
  "ropa",
  "eventos"
];

export const MIN_BUTTONS = 8;
export const MAX_BUTTONS = 25;