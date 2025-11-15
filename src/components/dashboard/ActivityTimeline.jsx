import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Bell, MessageCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ActivityTimeline({ payments, callups, messages }) {
  const activities = [];

  payments.slice(0, 2).forEach(p => {
    activities.push({
      icon: CreditCard,
      color: p.estado === "Pagado" ? "text-green-600" : "text-red-600",
      bgColor: p.estado === "Pagado" ? "bg-green-100" : "bg-red-100",
      title: `Pago ${p.mes}`,
      description: p.jugador_nombre,
      date: p.fecha_pago || p.created_date,
      badge: p.estado
    });
  });

  callups.slice(0, 1).forEach(c => {
    activities.push({
      icon: Bell,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      title: c.titulo,
      description: c.categoria,
      date: c.created_date,
      badge: "Convocatoria"
    });
  });

  messages.filter(m => m.prioridad === "Urgente").slice(0, 1).forEach(m => {
    activities.push({
      icon: MessageCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      title: "Mensaje urgente",
      description: m.mensaje.substring(0, 30) + "...",
      date: m.created_date,
      badge: "Urgente"
    });
  });

  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-orange-600" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {activities.slice(0, 3).map((activity, index) => (
            <div key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
              <div className={`w-7 h-7 rounded-lg ${activity.bgColor} flex items-center justify-center flex-shrink-0`}>
                <activity.icon className={`w-3.5 h-3.5 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-xs truncate">{activity.title}</p>
                <p className="text-xs text-slate-500 truncate">{activity.description}</p>
              </div>
              <Badge className={`${activity.bgColor} ${activity.color} text-xs`}>
                {activity.badge}
              </Badge>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-4 text-slate-500 text-xs">
              Sin actividad
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}