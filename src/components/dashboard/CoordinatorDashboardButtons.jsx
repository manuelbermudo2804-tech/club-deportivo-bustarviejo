import React from "react";
import { Bell, CheckCircle2, Users, Star, Calendar, Megaphone, Image, FileText, BarChart3, FileSignature, UserCircle, Settings, Clover, Heart, ShoppingBag, CreditCard, ClipboardCheck, Award, Trophy, MessageCircle, Gift } from "lucide-react";
import { createPageUrl } from "@/utils";

// DEFINICIÓN COMPLETA - refleja TODO el menú lateral de coordinadores
export const ALL_COORDINATOR_BUTTONS = [
  { id: "convocatorias", title: "🎓 Convocatorias", icon: Bell, url: createPageUrl("CoachCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 1 },
  { id: "asistencia", title: "📋 Asistencia y Evaluación", icon: CheckCircle2, url: createPageUrl("TeamAttendanceEvaluation"), gradient: "from-green-600 to-green-700", priority: 2 },
  { id: "plantillas", title: "🎓 Plantillas", icon: Users, url: createPageUrl("TeamRosters"), gradient: "from-blue-600 to-blue-700", priority: 3 },
  { id: "clasificaciones", title: "📊 Competición (Técnicos)", icon: BarChart3, url: createPageUrl("CentroCompeticionTecnico"), gradient: "from-blue-600 to-cyan-700", priority: 4 },
  { id: "ejercicios", title: "📚 Biblioteca Ejercicios", icon: FileText, url: createPageUrl("ExerciseLibrary"), gradient: "from-cyan-600 to-cyan-700", priority: 5 },
  { id: "tactica", title: "🎯 Pizarra Táctica", icon: BarChart3, url: createPageUrl("TacticsBoard"), gradient: "from-slate-600 to-slate-700", priority: 6 },
  { id: "asistente", title: "🤖 Asistente Virtual", icon: MessageCircle, url: createPageUrl("Chatbot"), gradient: "from-indigo-600 to-purple-700", priority: 7 },
  { id: "chat_familias_coord", title: "💬 Familias - Coordinador", icon: MessageCircle, url: createPageUrl("CoordinatorChat"), gradient: "from-cyan-600 to-cyan-700", priority: 8 },
  { id: "chat_familias_entrenador", title: "⚽ Familias - Entrenador", icon: MessageCircle, url: createPageUrl("CoachParentChat"), gradient: "from-blue-600 to-blue-700", priority: 9, conditional: true, conditionKey: "isCoachToo" },
  { id: "chat_staff", title: "💼 Chat Staff", icon: MessageCircle, url: createPageUrl("StaffChat"), gradient: "from-purple-600 to-purple-700", priority: 10 },
  { id: "calendario", title: "📅 Calendario", icon: Calendar, url: createPageUrl("CalendarAndSchedules"), gradient: "from-purple-600 to-purple-700", priority: 11 },
  { id: "voluntariado", title: "🤝 Voluntariado", icon: Users, url: createPageUrl("Voluntariado"), gradient: "from-teal-600 to-teal-700", priority: 12 },
  { id: "mercadillo", title: "🛍️ Mercadillo", icon: Gift, url: createPageUrl("Mercadillo"), gradient: "from-amber-600 to-amber-700", priority: 13 },
  { id: "reportes", title: "📊 Reportes", icon: Star, url: createPageUrl("CoachEvaluationReports"), gradient: "from-purple-600 to-purple-700", priority: 14 },
  { id: "perfil", title: "👤 Mi Perfil", icon: UserCircle, url: createPageUrl("CoachProfile"), gradient: "from-indigo-600 to-indigo-700", priority: 15 },
  { id: "firmas", title: "🖊️ Firmas Federación", icon: FileSignature, url: createPageUrl("FederationSignaturesAdmin"), gradient: "from-yellow-600 to-orange-600", priority: 16, conditional: true, conditionKey: "canManageSignatures" },
  { id: "anuncios", title: "📢 Anuncios", icon: Megaphone, url: createPageUrl("Announcements"), gradient: "from-pink-600 to-pink-700", priority: 17 },
  { id: "eventos", title: "🎉 Eventos Club", icon: Calendar, url: createPageUrl("ParentEventRSVP"), gradient: "from-indigo-600 to-indigo-700", priority: 18 },
  { id: "documentos", title: "📄 Documentos", icon: FileText, url: createPageUrl("ParentDocuments"), gradient: "from-slate-600 to-slate-700", priority: 19 },
  { id: "encuestas", title: "📋 Encuestas", icon: FileText, url: createPageUrl("Surveys"), gradient: "from-purple-600 to-purple-700", priority: 20 },
  { id: "galeria", title: "🖼️ Galería", icon: Image, url: createPageUrl("Gallery"), gradient: "from-indigo-600 to-indigo-700", priority: 21 },
  // Sección familia (si tiene hijos)
  { id: "mis_hijos", title: "👨‍👩‍👧 Mis Hijos", icon: Users, url: createPageUrl("ParentPlayers"), gradient: "from-orange-600 to-orange-700", priority: 22, conditional: true, conditionKey: "hasPlayers" },
  { id: "pagos_hijos", title: "💳 Pagos Mis Hijos", icon: CreditCard, url: createPageUrl("ParentPayments"), gradient: "from-green-600 to-green-700", priority: 23, conditional: true, conditionKey: "hasPlayers" },
  { id: "confirmar_hijos", title: "🏆 Confirmar Mis Hijos", icon: ClipboardCheck, url: createPageUrl("ParentCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 24, conditional: true, conditionKey: "hasPlayers" },
  { id: "firmas_hijos", title: "🖊️ Firmas Mis Hijos", icon: FileSignature, url: createPageUrl("FederationSignatures"), gradient: "from-yellow-600 to-orange-600", priority: 25, conditional: true, conditionKey: "hasPlayers" },
  { id: "socio", title: "🎫 Hacerse Socio", icon: Heart, url: createPageUrl("ClubMembership"), gradient: "from-pink-600 to-pink-700", priority: 26 },
  { id: "notificaciones", title: "⚙️ Preferencias Notif.", icon: Settings, url: createPageUrl("NotificationPreferences"), gradient: "from-slate-600 to-slate-700", priority: 27 },
  { id: "loteria", title: "🍀 Lotería", icon: Clover, url: createPageUrl("ParentLottery"), gradient: "from-green-600 to-red-600", priority: 28, conditional: true, conditionKey: "loteriaVisible" },
];

export const DEFAULT_COORDINATOR_BUTTONS = [
  "convocatorias",
  "asistencia",
  "plantillas",
  "clasificaciones",
  "ejercicios",
  "tactica",
  "calendario",
  "reportes"
];

export const MIN_BUTTONS = 4;
export const MAX_BUTTONS = 999;