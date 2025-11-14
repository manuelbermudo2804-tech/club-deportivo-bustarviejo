import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users, CreditCard, Bell, Calendar, MessageCircle, UserPlus, CheckCircle2 } from "lucide-react";

export default function ActivityTimeline({ activities }) {
  const getActivityIcon = (type) => {
    switch(type) {
      case "player_new": return UserPlus;
      case "payment": return CreditCard;
      case "callup": return Bell;
      case "event": return Calendar;
      case "message": return MessageCircle;
      case "attendance": return CheckCircle2;
      default: return Users;
    }
  };

  const getActivityColor = (type) => {
    switch(type) {
      case "player_new": return "text-blue-600 bg-blue-50";
      case "payment": return "text-green-600 bg-green-50";
      case "callup": return "text-orange-600 bg-orange-50";
      case "event": return "text-purple-600 bg-purple-50";
      case "message": return "text-indigo-600 bg-indigo-50";
      case "attendance": return "text-teal-600 bg-teal-50";
      default: return "text-slate-600 bg-slate-50";
    }
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Actividad Reciente del Club
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
          
          <div className="space-y-4">
            {activities.map((activity, idx) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              
              return (
                <div key={idx} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 w-12 h-12 rounded-full ${colorClass} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">{activity.title}</p>
                        <p className="text-sm text-slate-600">{activity.description}</p>
                      </div>
                      {activity.badge && (
                        <Badge className={activity.badgeColor || "bg-slate-500"}>
                          {activity.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {format(new Date(activity.date), "dd 'de' MMMM 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {activities.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-slate-500">No hay actividad reciente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}