import React from "react";
import { CreditCard, TrendingUp, Bell, Archive, ShoppingBag, Heart, Calendar, Megaphone, Image, FileText, BarChart3, Users, Clover, Settings, ClipboardCheck, FileSignature } from "lucide-react";
import { createPageUrl } from "@/utils";

export const ALL_TREASURER_BUTTONS = [
  { id: "financiero", title: "📊 Panel Financiero", icon: TrendingUp, url: createPageUrl("TreasurerDashboard"), gradient: "from-emerald-600 to-emerald-700", priority: 1 },
  { id: "pagos", title: "💳 Pagos Club", icon: CreditCard, url: createPageUrl("Payments"), gradient: "from-green-600 to-green-700", priority: 2 },
  { id: "recordatorios", title: "🔔 Recordatorios", icon: Bell, url: createPageUrl("PaymentReminders"), gradient: "from-red-600 to-orange-700", priority: 3 },
  { id: "ropa", title: "🛍️ Pedidos Ropa", icon: ShoppingBag, url: createPageUrl("ClothingOrders"), gradient: "from-teal-600 to-teal-700", priority: 4 },
  { id: "historico", title: "📁 Histórico Pagos", icon: Archive, url: createPageUrl("PaymentHistory"), gradient: "from-slate-600 to-slate-700", priority: 5 },
  { id: "socios", title: "🎫 Gestión Socios", icon: Heart, url: createPageUrl("ClubMembersManagement"), gradient: "from-purple-600 to-purple-700", priority: 6 },
  { id: "calendario", title: "📅 Calendario", icon: Calendar, url: createPageUrl("CalendarAndSchedules"), gradient: "from-purple-600 to-purple-700", priority: 7 },
  { id: "jugadores", title: "👥 Jugadores", icon: Users, url: createPageUrl("Players"), gradient: "from-orange-600 to-orange-700", priority: 8 },
  { id: "loteria", title: "🍀 Gestión Lotería", icon: Clover, url: createPageUrl("LotteryManagement"), gradient: "from-green-600 to-green-700", priority: 9, conditional: true, conditionKey: "loteriaVisible" },
  { id: "anuncios", title: "📢 Anuncios", icon: Megaphone, url: createPageUrl("Announcements"), gradient: "from-pink-600 to-pink-700", priority: 10 },
  { id: "eventos", title: "🎉 Eventos Club", icon: Calendar, url: createPageUrl("ParentEventRSVP"), gradient: "from-indigo-600 to-indigo-700", priority: 11 },
  { id: "encuestas", title: "📋 Encuestas", icon: FileText, url: createPageUrl("Surveys"), gradient: "from-purple-600 to-purple-700", priority: 12 },
  { id: "clasificaciones", title: "📊 Clasificaciones", icon: BarChart3, url: createPageUrl("Clasificaciones"), gradient: "from-blue-600 to-blue-700", priority: 13 },
  { id: "galeria", title: "🖼️ Galería", icon: Image, url: createPageUrl("Gallery"), gradient: "from-indigo-600 to-indigo-700", priority: 14 },
  { id: "socio_personal", title: "🎫 Hacerse Socio", icon: Heart, url: createPageUrl("ClubMembership"), gradient: "from-pink-600 to-pink-700", priority: 15 },
];

export const DEFAULT_TREASURER_BUTTONS = [
  "financiero",
  "pagos",
  "recordatorios",
  "ropa",
  "historico",
  "socios",
  "calendario",
  "jugadores"
];

export const MIN_BUTTONS = 8;
export const MAX_BUTTONS = 25;