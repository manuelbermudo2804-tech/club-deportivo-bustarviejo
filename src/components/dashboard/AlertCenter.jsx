import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  FileText, 
  CreditCard, 
  ClipboardCheck, 
  MessageCircle, 
  Star,
  Calendar,
  AlertTriangle,
  ChevronRight,
  FileSignature,
  ShoppingBag,
  Image,
  Users,
  Clover,
  Lock,
  Mail,
  User,
  Megaphone,
  CheckCircle2,
  ShieldAlert,
  BarChart3
} from "lucide-react";

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function AlertCenter({ 
  pendingCallups = 0,
  pendingDocuments = 0,
  pendingPayments = 0,
  paymentsInReview = 0,
  pendingAttendance = 0,
  pendingEvaluations = 0,
  pendingSurveys = 0,
  pendingSignatures = 0,
  pendingCallupResponses = 0,
  upcomingEvents = 0,
  pendingClothingOrders = 0,
  pendingMemberRequests = 0,
  pendingLotteryOrders = 0,
  newGalleryPhotos = 0,
  pendingInvitations = 0,
  overduePayments = 0,
  recentSurveyResponses = 0,
  pendingEventConfirmations = 0,
  pendingPlayerAccess = 0,
  unreadCoordinatorMessages = 0,
  unreadCoachMessages = 0,
  unreadPrivateMessages = 0,
  unreadAdminMessages = 0,
  hasActiveAdminChat = false,
  pendingMatchObservations = 0,
  unresolvedAdminChats = 0,
  isAdmin = false,
  isCoach = false,
  isParent = true,
  isCoordinator = false,
  isTreasurer = false,
  userEmail = null,
  userSports = []
}) {
  const alerts = [];

  // Fetch announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-fecha_publicacion'),
    enabled: !!userEmail,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Verificar anuncios no leídos
  const now = new Date();
  const unreadAnnouncements = announcements.filter(announcement => {
    if (!announcement.publicado) return false;
    
    // Verificar caducidad
    if (announcement.tipo_caducidad === "horas" && announcement.fecha_caducidad_calculada) {
      if (now > new Date(announcement.fecha_caducidad_calculada)) return false;
    } else if (announcement.fecha_expiracion) {
      if (now > new Date(announcement.fecha_expiracion)) return false;
    }
    
    // Verificar si ya lo leyó
    const alreadyRead = announcement.leido_por?.some(l => l.email === userEmail);
    if (alreadyRead) return false;
    
    // Verificar destinatarios
    if (announcement.destinatarios_tipo === "Todos") return true;
    return userSports.includes(announcement.destinatarios_tipo);
  });

  // Anuncios no leídos (para todos excepto admin) - MÁXIMO 1 alerta consolidada
  if (!isAdmin && unreadAnnouncements.length > 0) {
    const urgentCount = unreadAnnouncements.filter(a => a.prioridad === "Urgente").length;
    const importantCount = unreadAnnouncements.filter(a => a.prioridad === "Importante").length;
    const normalCount = unreadAnnouncements.filter(a => a.prioridad === "Normal").length;
    
    let title = "📢 Anuncios sin leer";
    let description = `${unreadAnnouncements.length} anuncio${unreadAnnouncements.length > 1 ? 's' : ''} nuevo${unreadAnnouncements.length > 1 ? 's' : ''}`;
    let color = "bg-blue-500";
    let priority = 3;
    
    if (urgentCount > 0) {
      title = `📢 ${urgentCount} Anuncio${urgentCount > 1 ? 's' : ''} URGENTE${urgentCount > 1 ? 'S' : ''}`;
      color = "bg-red-500";
      priority = 1;
    } else if (importantCount > 0) {
      title = `📢 ${importantCount} Anuncio${importantCount > 1 ? 's' : ''} Importante${importantCount > 1 ? 's' : ''}`;
      color = "bg-orange-500";
      priority = 2;
    }
    
    alerts.push({
      id: "announcements-unread",
      icon: Megaphone,
      title: title,
      description: description,
      url: createPageUrl("Announcements"),
      color: color,
      priority: priority
    });
  }

  // Fetch surveys para admin (respuestas nuevas)
  const { data: surveys = [] } = useQuery({
    queryKey: ['surveysAlerts'],
    queryFn: () => base44.entities.Survey.list('-created_date'),
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Alertas de respuestas nuevas en encuestas (solo admin)
  if (isAdmin) {
    const surveysWithNewResponses = surveys.filter(s => (s.respuestas_nuevas || 0) > 0);
    if (surveysWithNewResponses.length > 0) {
      const totalNewResponses = surveysWithNewResponses.reduce((sum, s) => sum + (s.respuestas_nuevas || 0), 0);
      alerts.push({
        id: "survey-new-responses",
        icon: FileText,
        title: "📊 Respuestas Nuevas en Encuestas",
        description: `${totalNewResponses} respuesta${totalNewResponses > 1 ? 's' : ''} sin revisar`,
        url: createPageUrl("Surveys"),
        color: "bg-purple-600",
        priority: 8
      });
    }
  }

  // Alertas para padres
  if (isParent) {
    // ALERTA CRÍTICA DE ADMIN (prioridad máxima) - MOSTRAR SIEMPRE si hay chat activo
    if (hasActiveAdminChat) {
      alerts.push({
        id: "admin-chat",
        icon: AlertTriangle,
        title: unreadAdminMessages > 0 
          ? "🛡️ El Administrador te ha contactado - Tienes mensajes sin leer en el Chat Administrador"
          : "🛡️ Chat Administrador Activo - El administrador gestiona tu caso",
        description: unreadAdminMessages > 0 
          ? `${unreadAdminMessages} mensaje${unreadAdminMessages > 1 ? 's' : ''} nuevo${unreadAdminMessages > 1 ? 's' : ''} del administrador`
          : "Conversación supervisada por la dirección del club",
        url: createPageUrl("ParentAdminChat"),
        color: "bg-red-600",
        priority: 0
      });
    }
    
    if (unreadPrivateMessages > 0) {
      alerts.push({
        id: "private-messages",
        icon: Bell,
        title: "🔔 Mensajes del Club",
        description: `${unreadPrivateMessages} mensaje${unreadPrivateMessages > 1 ? 's' : ''} sin leer`,
        url: createPageUrl("ParentSystemMessages"),
        color: "bg-purple-500",
        priority: 1
      });
    }
    if (unreadCoordinatorMessages > 0) {
      alerts.push({
        id: "coordinator-chat",
        icon: MessageCircle,
        title: "💬 Mensajes del Coordinador",
        description: `${unreadCoordinatorMessages} mensaje${unreadCoordinatorMessages > 1 ? 's' : ''} sin leer`,
        url: createPageUrl("ParentCoordinatorChat"),
        color: "bg-cyan-500",
        priority: 1
      });
    }
    if (unreadCoachMessages > 0) {
      alerts.push({
        id: "coach-chat",
        icon: MessageCircle,
        title: "⚽ Mensajes del Entrenador",
        description: `${unreadCoachMessages} mensaje${unreadCoachMessages > 1 ? 's' : ''} sin leer`,
        url: createPageUrl("ParentCoachChat"),
        color: "bg-blue-500",
        priority: 1
      });
    }
    if (pendingCallups > 0) {
      alerts.push({
        id: "callups",
        icon: ClipboardCheck,
        title: "Convocatorias pendientes",
        description: `${pendingCallups} convocatoria${pendingCallups > 1 ? 's' : ''} por confirmar`,
        url: createPageUrl("ParentCallups"),
        color: "bg-red-500",
        priority: 2
      });
    }
    if (pendingDocuments > 0) {
      alerts.push({
        id: "documents",
        icon: FileText,
        title: "Documentos por firmar",
        description: `${pendingDocuments} documento${pendingDocuments > 1 ? 's' : ''} pendiente${pendingDocuments > 1 ? 's' : ''}`,
        url: createPageUrl("ParentDocuments"),
        color: "bg-orange-500",
        priority: 2
      });
    }
    if (pendingSurveys > 0) {
      alerts.push({
        id: "surveys",
        icon: Star,
        title: "Encuestas activas",
        description: `${pendingSurveys} encuesta${pendingSurveys > 1 ? 's' : ''} por responder`,
        url: createPageUrl("Surveys"),
        color: "bg-purple-500",
        priority: 4
      });
    }
    if (pendingSignatures > 0) {
      alerts.push({
        id: "signatures",
        icon: FileSignature,
        title: "Firmas de Federación",
        description: `${pendingSignatures} firma${pendingSignatures > 1 ? 's' : ''} pendiente${pendingSignatures > 1 ? 's' : ''}`,
        url: createPageUrl("FederationSignatures"),
        color: "bg-yellow-500",
        priority: 2
      });
    }
  }

  // Alertas para coordinadores
  if (isCoordinator) {
    if (unreadCoordinatorMessages > 0) {
      alerts.push({
        id: "coordinator-chat-admin",
        icon: MessageCircle,
        title: "💬 Mensajes de Familias",
        description: `${unreadCoordinatorMessages} mensaje${unreadCoordinatorMessages > 1 ? 's' : ''} sin leer`,
        url: createPageUrl("CoordinatorChat"),
        color: "bg-cyan-500",
        priority: 1
      });
    }
  }

  // Alertas para entrenadores/coordinadores (NO admin)
  if (isCoach && !isAdmin) {
    if (pendingCallupResponses > 0) {
      alerts.push({
        id: "callup-responses",
        icon: ClipboardCheck,
        title: "⚽ Respuestas convocatorias",
        description: `${pendingCallupResponses} jugador${pendingCallupResponses > 1 ? 'es' : ''} sin confirmar`,
        url: createPageUrl("CoachCallups"),
        color: "bg-red-500",
        priority: 1
      });
    }
    if (pendingMatchObservations > 0) {
      alerts.push({
        id: "match-observations",
        icon: BarChart3,
        title: "📊 Partidos sin registrar",
        description: `${pendingMatchObservations} partido${pendingMatchObservations > 1 ? 's' : ''} pendiente${pendingMatchObservations > 1 ? 's' : ''} de observación`,
        url: createPageUrl("CoachStandingsAnalysis"),
        color: "bg-red-600",
        priority: 1
      });
    }
    if (pendingAttendance > 0) {
      alerts.push({
        id: "attendance",
        icon: CheckCircle2,
        title: "Asistencias por registrar",
        description: `${pendingAttendance} entrenamiento${pendingAttendance > 1 ? 's' : ''} sin registrar`,
        url: createPageUrl("TeamAttendanceEvaluation"),
        color: "bg-blue-500",
        priority: 2
      });
    }
    if (pendingEvaluations > 0) {
      alerts.push({
        id: "evaluations",
        icon: Star,
        title: "Evaluaciones pendientes",
        description: `${pendingEvaluations} jugador${pendingEvaluations > 1 ? 'es' : ''} por evaluar`,
        url: createPageUrl("TeamAttendanceEvaluation"),
        color: "bg-indigo-500",
        priority: 3
      });
    }
  }

  // ALERTAS DE MENSAJES ELIMINADAS - Ahora se usan en ChatAlertBanner
  // NO mostrar mensajes de chat aquí para evitar duplicación

  // Fetch eventos para alertas de eventos nuevos
  const { data: events = [] } = useQuery({
    queryKey: ['eventsAlerts'],
    queryFn: () => base44.entities.Event.list('-created_date'),
    enabled: !!userEmail,
    refetchInterval: 60000, // Refresh every minute
  });

  // Eventos nuevos publicados en últimas 48h
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const newEvents = events.filter(e => {
    if (!e.publicado) return false;
    const createdDate = new Date(e.created_date);
    return createdDate > twoDaysAgo;
  });

  if (newEvents.length > 0) {
    alerts.push({
      id: "new-events",
      icon: Calendar,
      title: "🎉 Eventos Nuevos Publicados",
      description: `${newEvents.length} evento${newEvents.length > 1 ? 's' : ''} nuevo${newEvents.length > 1 ? 's' : ''}`,
      url: createPageUrl("ParentEventRSVP"),
      color: "bg-indigo-500",
      priority: 5
    });
  }

  if (upcomingEvents > 0) {
    alerts.push({
      id: "events",
      icon: Calendar,
      title: "Eventos próximos",
      description: `${upcomingEvents} evento${upcomingEvents > 1 ? 's' : ''} esta semana`,
      url: createPageUrl("ParentEventRSVP"),
      color: "bg-cyan-500",
      priority: 6
    });
  }

  // Alertas para admin
  if (isAdmin) {
    // CONVERSACIONES CRÍTICAS SIN RESOLVER (prioridad máxima)
    if (unresolvedAdminChats > 0) {
      alerts.push({
        id: "admin-critical-chats",
        icon: ShieldAlert,
        title: "🚨 Conversaciones Críticas",
        description: `${unresolvedAdminChats} conversación${unresolvedAdminChats > 1 ? 'es' : ''} escalada${unresolvedAdminChats > 1 ? 's' : ''} sin resolver`,
        url: createPageUrl("AdminChat"),
        color: "bg-red-600",
        priority: 0
      });
    }
    
    if (pendingPayments > 0) {
      alerts.push({
        id: "payments-admin",
        icon: CreditCard,
        title: "💳 Pagos en Revisión",
        description: `${pendingPayments} pago${pendingPayments > 1 ? 's' : ''} esperando revisión`,
        url: createPageUrl("Payments"),
        color: "bg-orange-600",
        priority: 1
      });
    }

    if (pendingSignatures > 0) {
      alerts.push({
        id: "signatures-admin",
        icon: FileSignature,
        title: "🖊️ Firmas Pendientes",
        description: `${pendingSignatures} firma${pendingSignatures > 1 ? 's' : ''} de federación sin completar`,
        url: createPageUrl("FederationSignaturesAdmin"),
        color: "bg-yellow-600",
        priority: 4
      });
    }

    if (pendingClothingOrders > 0) {
      alerts.push({
        id: "clothing",
        icon: ShoppingBag,
        title: "🛍️ Pedidos de Ropa",
        description: `${pendingClothingOrders} pedido${pendingClothingOrders > 1 ? 's' : ''} pendiente${pendingClothingOrders > 1 ? 's' : ''}`,
        url: createPageUrl("ClothingOrders"),
        color: "bg-teal-600",
        priority: 5
      });
    }

    if (pendingMemberRequests > 0) {
      alerts.push({
        id: "members",
        icon: Users,
        title: "🎫 Solicitudes de Socio",
        description: `${pendingMemberRequests} solicitud${pendingMemberRequests > 1 ? 'es' : ''} en revisión`,
        url: createPageUrl("ClubMembersManagement"),
        color: "bg-pink-600",
        priority: 6
      });
    }

    if (pendingLotteryOrders > 0) {
      alerts.push({
        id: "lottery",
        icon: Clover,
        title: "🍀 Pedidos de Lotería",
        description: `${pendingLotteryOrders} pedido${pendingLotteryOrders > 1 ? 's' : ''} pendiente${pendingLotteryOrders > 1 ? 's' : ''}`,
        url: createPageUrl("LotteryManagement"),
        color: "bg-green-700",
        priority: 7
      });
    }

    if (recentSurveyResponses > 0) {
      alerts.push({
        id: "survey-responses",
        icon: FileText,
        title: "📋 Respuestas de Encuestas",
        description: `${recentSurveyResponses} respuesta${recentSurveyResponses > 1 ? 's' : ''} nueva${recentSurveyResponses > 1 ? 's' : ''} (últimas 24h)`,
        url: createPageUrl("Surveys"),
        color: "bg-purple-600",
        priority: 8
      });
    }

    if (pendingEventConfirmations > 0) {
      alerts.push({
        id: "event-confirmations",
        icon: Calendar,
        title: "🎉 Confirmaciones de Eventos",
        description: `${pendingEventConfirmations} confirmación${pendingEventConfirmations > 1 ? 'es' : ''} reciente${pendingEventConfirmations > 1 ? 's' : ''} (24h)`,
        url: createPageUrl("EventManagement"),
        color: "bg-indigo-600",
        priority: 9
      });
    }

    if (pendingPlayerAccess > 0) {
      alerts.push({
        id: "player-access",
        icon: User,
        title: "⚽ Jugadores +18 sin Acceso",
        description: `${pendingPlayerAccess} jugador${pendingPlayerAccess > 1 ? 'es' : ''} mayor${pendingPlayerAccess > 1 ? 'es' : ''} de edad necesita acceso`,
        url: createPageUrl("UserManagement"),
        color: "bg-purple-600",
        priority: 10
      });
    }

    if (pendingInvitations > 0) {
      alerts.push({
        id: "invitations",
        icon: Mail,
        title: "📧 Solicitudes de Invitación",
        description: `${pendingInvitations} solicitud${pendingInvitations > 1 ? 'es' : ''} pendiente${pendingInvitations > 1 ? 's' : ''}`,
        url: createPageUrl("InvitationRequests"),
        color: "bg-cyan-600",
        priority: 3
      });
    }
  }

  // Alertas para tesoreros (tareas de tesorero)
  if (isTreasurer && !isAdmin && !isCoach) {
    if (paymentsInReview > 0) {
      alerts.push({
        id: "payments-review-treasurer",
        icon: CreditCard,
        title: "💳 Pagos en Revisión",
        description: `${paymentsInReview} pago${paymentsInReview > 1 ? 's' : ''} esperando validación`,
        url: createPageUrl("Payments"),
        color: "bg-orange-600",
        priority: 1
      });
    }
    if (pendingClothingOrders > 0) {
      alerts.push({
        id: "clothing-treasurer",
        icon: ShoppingBag,
        title: "🛍️ Pedidos de Ropa",
        description: `${pendingClothingOrders} pedido${pendingClothingOrders > 1 ? 's' : ''} pendiente${pendingClothingOrders > 1 ? 's' : ''}`,
        url: createPageUrl("ClothingOrders"),
        color: "bg-teal-600",
        priority: 2
      });
    }
    if (pendingLotteryOrders > 0) {
      alerts.push({
        id: "lottery-treasurer",
        icon: Clover,
        title: "🍀 Lotería Pendiente",
        description: `${pendingLotteryOrders} pedido${pendingLotteryOrders > 1 ? 's' : ''} sin pagar`,
        url: createPageUrl("LotteryManagement"),
        color: "bg-green-700",
        priority: 3
      });
    }
    if (pendingMemberRequests > 0) {
      alerts.push({
        id: "members-treasurer",
        icon: Users,
        title: "🎫 Solicitudes de Socio",
        description: `${pendingMemberRequests} solicitud${pendingMemberRequests > 1 ? 'es' : ''} pendiente${pendingMemberRequests > 1 ? 's' : ''}`,
        url: createPageUrl("ClubMembersManagement"),
        color: "bg-pink-600",
        priority: 4
      });
    }
  }

  // Alertas para padres (incluye tesoreros con hijos)
  if (isParent && !isAdmin && !isCoach) {
    // CONSOLIDAR PAGOS: Si hay vencidos, mostrar solo esos (incluyen a los pendientes)
    // Si NO hay vencidos, mostrar pendientes normales
    // Los pagos en revisión se muestran aparte siempre
    
    if (overduePayments > 0) {
      // Si hay vencidos, NO mostrar "pendientes" porque se duplicaría
      alerts.push({
        id: "overdue",
        icon: AlertTriangle,
        title: "⚠️ Pagos Vencidos",
        description: `${overduePayments} pago${overduePayments > 1 ? 's' : ''} vencido${overduePayments > 1 ? 's' : ''} - fecha límite superada`,
        url: createPageUrl("ParentPayments"),
        color: "bg-red-600",
        priority: 1
      });
    } else if (pendingPayments > 0) {
      // Solo mostrar pendientes si NO hay vencidos
      alerts.push({
        id: "payments-pending",
        icon: CreditCard,
        title: "💳 Pagos Pendientes",
        description: `${pendingPayments} pago${pendingPayments > 1 ? 's' : ''} por realizar`,
        url: createPageUrl("ParentPayments"),
        color: "bg-yellow-500",
        priority: 3
      });
    }
    
    if (paymentsInReview > 0) {
      alerts.push({
        id: "payments-review",
        icon: CreditCard,
        title: "📋 Pagos en Revisión",
        description: `${paymentsInReview} pago${paymentsInReview > 1 ? 's' : ''} esperando validación del administrador`,
        url: createPageUrl("ParentPayments"),
        color: "bg-blue-500",
        priority: 5
      });
    }
  }

  // Ordenar por prioridad
  alerts.sort((a, b) => a.priority - b.priority);

  if (alerts.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">¡Todo al día!</p>
            <p className="text-sm text-green-600">No tienes tareas pendientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 shadow-lg overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-200">
          <Bell className="w-5 h-5 text-orange-600" />
          <p className="text-base font-bold text-orange-600">🔔 Tareas Pendientes ({alerts.length})</p>
        </div>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              to={alert.url}
              className="flex items-center gap-3 p-2 hover:bg-slate-50 transition-colors group rounded-lg"
            >
              <div className={`w-9 h-9 rounded-full ${alert.color} flex items-center justify-center flex-shrink-0`}>
                <alert.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{alert.title}</p>
                <p className="text-xs text-slate-500">{alert.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}