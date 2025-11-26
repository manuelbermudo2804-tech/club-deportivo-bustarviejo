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
  ChevronRight
} from "lucide-react";

export default function AlertCenter({ 
  pendingCallups = 0,
  pendingDocuments = 0,
  pendingPayments = 0,
  unreadMessages = 0,
  pendingAttendance = 0,
  pendingEvaluations = 0,
  pendingSurveys = 0,
  upcomingEvents = 0,
  isAdmin = false,
  isCoach = false,
  isParent = true
}) {
  const alerts = [];

  // Alertas para padres
  if (isParent) {
    if (pendingCallups > 0) {
      alerts.push({
        id: "callups",
        icon: ClipboardCheck,
        title: "Convocatorias pendientes",
        description: `${pendingCallups} convocatoria${pendingCallups > 1 ? 's' : ''} por confirmar`,
        url: createPageUrl("ParentCallups"),
        color: "bg-red-500",
        priority: 1
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
  }

  // Alertas para entrenadores/coordinadores
  if (isCoach || isAdmin) {
    if (pendingAttendance > 0) {
      alerts.push({
        id: "attendance",
        icon: CheckCircle2,
        title: "Asistencias por registrar",
        description: `${pendingAttendance} entrenamiento${pendingAttendance > 1 ? 's' : ''} sin registrar`,
        url: createPageUrl("TeamAttendanceEvaluation"),
        color: "bg-blue-500",
        priority: 1
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
        priority: 2
      });
    }
  }

  // Alertas comunes
  if (unreadMessages > 0) {
    alerts.push({
      id: "messages",
      icon: MessageCircle,
      title: "Mensajes sin leer",
      description: `${unreadMessages} mensaje${unreadMessages > 1 ? 's' : ''} nuevo${unreadMessages > 1 ? 's' : ''}`,
      url: isAdmin ? createPageUrl("AdminChat") : isCoach ? createPageUrl("CoachChat") : createPageUrl("ParentChat"),
      color: "bg-green-500",
      priority: 5
    });
  }

  if (upcomingEvents > 0) {
    alerts.push({
      id: "events",
      icon: Calendar,
      title: "Eventos próximos",
      description: `${upcomingEvents} evento${upcomingEvents > 1 ? 's' : ''} esta semana`,
      url: createPageUrl("Calendar"),
      color: "bg-cyan-500",
      priority: 6
    });
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