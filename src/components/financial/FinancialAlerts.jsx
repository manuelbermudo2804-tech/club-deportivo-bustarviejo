import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle, TrendingDown, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FinancialAlerts({ totalIngresos, totalPendiente, totalEsperado, stats }) {
  const tasaCobro = totalEsperado > 0 ? ((totalIngresos / totalEsperado) * 100) : 0;
  const morosidad = totalEsperado > 0 ? ((totalPendiente / totalEsperado) * 100) : 0;

  const alerts = [];

  // Alerta crítica: morosidad > 40%
  if (morosidad > 40) {
    alerts.push({
      type: "critical",
      icon: AlertTriangle,
      title: "⚠️ Morosidad Crítica",
      message: `${morosidad.toFixed(1)}% de morosidad (${totalPendiente.toFixed(2)}€ sin cobrar)`,
      action: "Enviar recordatorios urgentes a todas las familias con deuda"
    });
  }
  // Alerta importante: morosidad > 25%
  else if (morosidad > 25) {
    alerts.push({
      type: "warning",
      icon: AlertCircle,
      title: "🔔 Morosidad Elevada",
      message: `${morosidad.toFixed(1)}% de morosidad (${totalPendiente.toFixed(2)}€ sin cobrar)`,
      action: "Considera enviar recordatorios a familias con pagos pendientes"
    });
  }

  // Alerta: tasa de cobro baja < 60%
  if (tasaCobro < 60 && tasaCobro > 0) {
    alerts.push({
      type: "warning",
      icon: TrendingDown,
      title: "📉 Tasa de Cobro Baja",
      message: `Solo se ha cobrado el ${tasaCobro.toFixed(1)}% del total esperado`,
      action: "Revisar estrategia de cobros y enviar recordatorios"
    });
  }

  // Alerta: muchos pagos en revisión
  if (stats.cuotasEnRevision > 500) {
    alerts.push({
      type: "info",
      icon: Clock,
      title: "⏳ Pagos Pendientes de Validar",
      message: `${stats.cuotasEnRevision.toFixed(2)}€ en revisión esperando aprobación`,
      action: "Revisar justificantes pendientes de validación"
    });
  }

  // Si todo está bien
  if (alerts.length === 0 && tasaCobro >= 80) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <AlertCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 ml-2">
          <span className="font-bold">✅ Estado Financiero Saludable</span> - Tasa de cobro del {tasaCobro.toFixed(1)}%. ¡Buen trabajo!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const Icon = alert.icon;
        const alertStyles = {
          critical: "border-red-300 bg-red-50",
          warning: "border-orange-300 bg-orange-50",
          info: "border-blue-300 bg-blue-50"
        };
        const iconStyles = {
          critical: "text-red-600",
          warning: "text-orange-600",
          info: "text-blue-600"
        };
        const textStyles = {
          critical: "text-red-900",
          warning: "text-orange-900",
          info: "text-blue-900"
        };

        return (
          <Alert key={index} className={`${alertStyles[alert.type]} border-2`}>
            <Icon className={`h-5 w-5 ${iconStyles[alert.type]}`} />
            <AlertDescription className={`${textStyles[alert.type]} ml-2`}>
              <p className="font-bold text-base mb-1">{alert.title}</p>
              <p className="text-sm mb-2">{alert.message}</p>
              <p className="text-xs italic opacity-80">💡 {alert.action}</p>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}