import React from "react";
import { Bell, CheckCircle2, Users, Star, Calendar, Megaphone, Image, FileText, BarChart3, FileSignature, UserCircle, Award, Settings, Clover, Heart, ShoppingBag, CreditCard, ClipboardCheck, Trophy } from "lucide-react";
import { createPageUrl } from "@/utils";

export const ALL_COACH_BUTTONS = [
  { id: "convocatorias", title: "🎓 Convocatorias", icon: Bell, url: createPageUrl("CoachCallups"), gradient: "from-yellow-600 to-yellow-700", priority: 1 },
  { id: "asistencia", title: "📋 Asistencia y Evaluación", icon: CheckCircle2, url: createPageUrl("TeamAttendanceEvaluation"), gradient: "from-green-600 to-green-700", priority: 2 },
  { id: "plantillas", title: "🎓 Plantillas", icon: Users, url: createPageUrl("TeamRosters"), gradient: "from-blue-600 to-blue-700", priority: 3 },
  { id: "clasificaciones", title: "📊 Análisis Clasificaciones", icon: BarChart3, url: createPageUrl("CoachStandingsAnalysis"), gradient: "from-blue-600 to-cyan-700", priority: 4 },
  { id: "ejercicios", title: "📚 Biblioteca Ejercicios", icon: FileText, url: createPageUrl("ExerciseLibrary"), gradient: "from-cyan-600 to-cyan-700", priority: 5 },
  { id: "tactica", title: "🎯 Pizarra Táctica", icon: BarChart3, url: createPageUrl("TacticsBoard"), gradient: "from-slate-600 to-slate-700", priority: 6 },
  { id: "calendario", title: "📅 Calendario", icon: Calendar, url: createPageUrl("CalendarAndSchedules"), gradient: "from-purple-600 to-purple-700", priority: 7 },
  { id: "reportes", title: "📊 Reportes", icon: Star, url: createPageUrl("CoachEvaluationReports"), gradient: "from-purple-600 to-purple-700", priority: 8 },
  { id: "perfil", title: "👤 Mi Perfil", icon: UserCircle, url: createPageUrl("CoachProfile"), gradient: "from-indigo-600 to-indigo-700", priority: 9 },
  { id: "firmas", title: "🖊️ Firmas Federación", icon: FileSignature, url: createPageUrl("FederationSignaturesAdmin"), gradient: "from-yellow-600 to-orange-600", priority: 10, conditional: true, conditionKey: "canManageSignatures" },
  { id: "anuncios", title: "📢 Anuncios", icon: Megaphone, url: createPageUrl("Announcements"), gradient: "from-pink-600 to-pink-700", priority: 11 },
  { id: "eventos", title: "🎉 Eventos Club", icon: Calendar, url: createPageUrl("ParentEventRSVP"), gradient: "from-indigo-600 to-indigo-700", priority: 12 },
  { id: "encuestas", title: "📋 Encuestas", icon: FileText, url: createPageUrl("Surveys"), gradient: "from-purple-600 to-purple-700", priority: 13 },
  { id: "galeria", title: "🖼️ Galería", icon: Image, url: createPageUrl("Gallery"), gradient: "from-indigo-600 to-indigo-700", priority: 14 },
  { id: "socio", title: "🎫 Hacerse Socio", icon: Heart, url: createPageUrl("ClubMembership"), gradient: "from-pink-600 to-pink-700", priority: 15 },
];

export const DEFAULT_COACH_BUTTONS = [
  "convocatorias",
  "asistencia",
  "plantillas",
  "clasificaciones",
  "ejercicios",
  "tactica",
  "calendario",
  "reportes"
];

export const MIN_BUTTONS = 8;
export const MAX_BUTTONS = 25;