import React from "react";
import { CreditCard, Bell, Archive, ShoppingBag, Clover, Users, BarChart3, Euro, Calendar, Image, Megaphone, FileText, Award, TrendingUp, Trophy } from "lucide-react";

// Todos los botones disponibles para tesoreros
export const ALL_TREASURER_BUTTONS = [
  {
    id: "panel_financiero",
    title: "💰 Panel Financiero",
    url: "/TreasurerFinancialPanel",
    icon: BarChart3,
    gradient: "from-purple-600 to-indigo-700",
    description: "Vista operativa de ingresos y pagos del club"
  },
  {
    id: "pagos_club",
    title: "💳 Pagos del Club",
    url: "/Payments",
    icon: CreditCard,
    gradient: "from-green-600 to-green-700",
    description: "Validar y gestionar pagos"
  },
  {
    id: "recordatorios",
    title: "🔔 Recordatorios",
    url: "/PaymentReminders",
    icon: Bell,
    gradient: "from-red-600 to-orange-700",
    description: "Enviar recordatorios de pago"
  },
  {
    id: "historico",
    title: "📁 Histórico",
    url: "/PaymentHistory",
    icon: Archive,
    gradient: "from-slate-600 to-slate-700",
    description: "Pagos de temporadas anteriores"
  },
  {
    id: "pedidos_ropa",
    title: "🛒 Merchandising",
    url: "https://club-deportivo-bustarviejo.myspreadshop.es/",
    icon: ShoppingBag,
    gradient: "from-teal-600 to-teal-700",
    description: "Tienda externa de merchandising"
  },
  {
    id: "socios",
    title: "🎫 Socios",
    url: "/ClubMembersManagement",
    icon: Users,
    gradient: "from-pink-600 to-pink-700",
    description: "Gestionar socios del club"
  },
  {
    id: "calendario",
    title: "📅 Calendario",
    url: "/CalendarAndSchedules",
    icon: Calendar,
    gradient: "from-blue-600 to-blue-700",
    description: "Eventos y horarios"
  },
  {
    id: "mis_jugadores",
    title: "👥 Mis Jugadores",
    url: "/ParentPlayers",
    icon: Users,
    gradient: "from-orange-600 to-orange-700",
    description: "Mis hijos jugadores",
    conditional: true,
    conditionKey: "hasPlayers"
  },
  {
    id: "pagos_hijos",
    title: "💳 Pagos Mis Hijos",
    url: "/ParentPayments",
    icon: Euro,
    gradient: "from-green-600 to-emerald-700",
    description: "Pagos de mis jugadores",
    conditional: true,
    conditionKey: "hasPlayers"
  },
  {
    id: "clasificaciones",
    title: "📊 Clasificaciones",
    url: "/CentroCompeticion",
    icon: Trophy,
    gradient: "from-orange-600 to-orange-700",
    description: "Resultados y estadísticas"
  },
  {
    id: "galeria",
    title: "🖼️ Galería",
    url: "/Gallery",
    icon: Image,
    gradient: "from-purple-600 to-pink-700",
    description: "Fotos del club"
  },
  {
    id: "anuncios",
    title: "📢 Anuncios",
    url: "/Announcements",
    icon: Megaphone,
    gradient: "from-orange-600 to-red-700",
    description: "Comunicados del club"
  },
  {
    id: "encuestas",
    title: "📋 Encuestas",
    url: "/Surveys",
    icon: FileText,
    gradient: "from-indigo-600 to-purple-700",
    description: "Feedback y opiniones"
  },
  {
    id: "loteria",
    title: "🍀 Lotería",
    url: "/LotteryManagement",
    icon: Clover,
    gradient: "from-green-600 to-green-700",
    description: "Gestión lotería navidad",
    conditional: true,
    conditionKey: "loteriaVisible"
  },
];

// Botones por defecto para tesoreros
export const DEFAULT_TREASURER_BUTTONS = [
  "panel_financiero",
  "pagos_club",
  "recordatorios",
  "historico",
  "pedidos_ropa",
  "socios",
  "calendario",
  "clasificaciones",
  "galeria",
  "anuncios"
];

export const MIN_BUTTONS = 6;
export const MAX_BUTTONS = 12;