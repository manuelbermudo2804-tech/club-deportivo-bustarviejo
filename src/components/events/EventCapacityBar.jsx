import React from "react";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function EventCapacityBar({ event, stats }) {
  if (!event.capacidad_maxima) return null;

  const totalConfirmados = stats.asistire + (stats.totalAcompanantes || 0);
  const porcentaje = Math.round((totalConfirmados / event.capacidad_maxima) * 100);
  const plazasDisponibles = event.capacidad_maxima - totalConfirmados;

  const getStatusConfig = () => {
    if (porcentaje >= 100) {
      return {
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        icon: AlertTriangle,
        message: '¡COMPLETO! Lista de espera'
      };
    } else if (porcentaje >= 90) {
      return {
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        icon: AlertTriangle,
        message: '¡Últimas plazas disponibles!'
      };
    } else if (porcentaje >= 70) {
      return {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        icon: Users,
        message: 'Plazas disponibles'
      };
    }
    return {
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      icon: CheckCircle2,
      message: 'Muchas plazas disponibles'
    };
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <div className={`border-2 ${status.borderColor} ${status.bgColor} rounded-xl p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${status.textColor}`} />
          <span className={`font-bold ${status.textColor}`}>{status.message}</span>
        </div>
        <Badge className={status.color}>
          {totalConfirmados}/{event.capacidad_maxima}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Ocupación:</span>
          <span className={`font-bold ${status.textColor}`}>{porcentaje}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 ${status.color} transition-all duration-500`}
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>{totalConfirmados} confirmados</span>
          {plazasDisponibles > 0 ? (
            <span>{plazasDisponibles} plazas libres</span>
          ) : (
            <span className="text-red-600 font-bold">Sin plazas</span>
          )}
        </div>
      </div>

      {stats.totalAcompanantes > 0 && (
        <div className="text-xs text-slate-600 text-center pt-2 border-t">
          + {stats.totalAcompanantes} acompañantes
        </div>
      )}
    </div>
  );
}