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
  CheckCircle2,
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
  User
} from "lucide-react";

export default function AlertCenter({ 
  pendingCallups = 0,
  pendingDocuments = 0,
  pendingPayments = 0,
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
  isAdmin = false,
  isCoach = false,
  isParent = true,
  isTreasurer = false,
  isCoordinator = false
}) {
  const alerts = [];

  // Alertas para padres
  if (isParent) {
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
    if (pendingPayments > 0) {
      alerts.push({
        id: "payments",
        icon: CreditCard,
        title: "Pagos pendientes",
        description: `${pendingPayments} pago${pendingPayments > 1 ? 's' : ''} por realizar`,
        url: createPageUrl("ParentPayments"),
        color: "bg-yellow-500",
        priority: 3
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
    if (pendingPayments > 0) {
      alerts.push({
        id: "payments-admin",
        icon: CreditCard,
        title: "💳 Pagos en Revisión",
        description: `${pendingPayments} pago${pendingPayments > 1 ? 's' : ''} esperando revisión`,
        url: createPageUrl("Payments"),
        color: "bg-green-600",
        priority: 3
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
        title: "📧 Invitaciones Solicitadas",
        description: `${pendingInvitations} solicitud${pendingInvitations > 1 ? 'es' : ''} de invitación pendiente${pendingInvitations > 1 ? 's' : ''}`,
        url: createPageUrl("EmailInvitations"),
        color: "bg-cyan-600",
        priority: 11
      });
    }
  }

  // Alertas para padres
  if (isParent && !isAdmin && !isCoach) {
    if (overduePayments > 0) {
      alerts.push({
        id: "overdue",
        icon: AlertTriangle,
        title: "⚠️ Pagos vencidos",
        description: `${overduePayments} pago${overduePayments > 1 ? 's' : ''} vencido${overduePayments > 1 ? 's' : ''}`,
        url: createPageUrl("ParentPayments"),
        color: "bg-red-600",
        priority: 1
      });
    }
    // Galería eliminada del centro de alertas - no es urgente
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
      <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-5 h-5" />
          Centro de Alertas
          <Badge className="bg-white text-orange-600 ml-auto">
            {alerts.length} pendiente{alerts.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {alerts.map((alert) => (
          <Link
            key={alert.id}
            to={alert.url}
            className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors group"
          >
            <div className={`w-10 h-10 rounded-full ${alert.color} flex items-center justify-center flex-shrink-0`}>
              <alert.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">{alert.title}</p>
              <p className="text-xs text-slate-500">{alert.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}