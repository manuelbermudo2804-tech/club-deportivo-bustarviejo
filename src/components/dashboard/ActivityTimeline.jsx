import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Bell, MessageCircle, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ActivityTimeline({ payments, callups, messages, events }) {
  const activities = [];

  // Add payments
  payments.slice(0, 5).forEach(p => {
    activities.push({
      type: "payment",
      icon: CreditCard,
      color: p.estado === "Pagado" ? "text-green-600" : "text-red-600",
      bgColor: p.estado === "Pagado" ? "bg-green-100" : "bg-red-100",
      title: `Pago ${p.mes}`,
      description: `${p.jugador_nombre} - ${p.cantidad}€`,
      date: p.fecha_pago || p.created_date,
      badge: p.estado
    });
  });

  // Add callups
  callups.slice(0, 3).forEach(c => {
    activities.push({
      type: "callup",
      icon: Bell,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      title: c.titulo,
      description: `${c.categoria} - ${format(new Date(c.fecha_partido), 'dd MMM', { locale: es })}`,
      date: c.created_date,
      badge: "Convocatoria"
    });
  });

  // Add important messages
  messages.filter(m => m.prioridad === "Urgente" || m.prioridad === "Importante").slice(0, 3).forEach(m => {
    activities.push({
      type: "message",
      icon: MessageCircle,
      color: m.prioridad === "Urgente" ? "text-red-600" : "text-blue-600",
      bgColor: m.prioridad === "Urgente" ? "bg-red-100" : "bg-blue-100",
      title: "Mensaje del club",
      description: m.mensaje.substring(0, 60) + "...",
      date: m.created_date,
      badge: m.prioridad
    });
  });

  // Add upcoming events
  events.slice(0, 3).forEach(e => {
    activities.push({
      type: "event",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      title: e.titulo,
      description: `${e.tipo} - ${format(new Date(e.fecha), 'dd MMM', { locale: es })}`,
      date: e.fecha,
      badge: e.tipo
    });
  });

  // Sort by date
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-600" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {activities.slice(0, 8).map((activity, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${activity.bgColor} flex items-center justify-center flex-shrink-0`}>
                <activity.icon className={`w-5 h-5 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">{activity.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{activity.description}</p>
                  </div>
                  <Badge className={`${activity.bgColor} ${activity.color} text-xs`}>
                    {activity.badge}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {format(new Date(activity.date), "dd MMM, HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No hay actividad reciente
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}