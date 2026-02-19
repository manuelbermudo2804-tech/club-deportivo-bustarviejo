import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

const statusConfig = {
  "Pagado": { emoji: "🟢", bg: "bg-green-50 border-green-200", icon: CheckCircle2, color: "text-green-700", badgeCls: "bg-green-100 text-green-800" },
  "En revisión": { emoji: "🟠", bg: "bg-orange-50 border-orange-200", icon: Clock, color: "text-orange-700", badgeCls: "bg-orange-100 text-orange-800" },
  "Pendiente": { emoji: "🔴", bg: "bg-red-50 border-red-200", icon: AlertCircle, color: "text-red-700", badgeCls: "bg-red-100 text-red-800" },
};

export default function PaymentCard({
  payment,
  player,
  isUploading,
  onUpload,
  onPayClick,
  showPayButton,
  isSelected,
  onToggleSelect,
  hasPlanEspecial,
  hasPlanMensual,
}) {
  const cfg = statusConfig[payment.estado] || statusConfig["Pendiente"];
  const StatusIcon = cfg.icon;

  return (
    <div className={`rounded-xl border-2 ${cfg.bg} p-4 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Checkbox para carrito */}
          {payment.estado === "Pendiente" && !hasPlanMensual && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="mt-0.5 flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            {/* Línea 1: Mes + Estado */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-base">{payment.mes}</span>
              <Badge className={`${cfg.badgeCls} text-xs`}>
                {cfg.emoji} {payment.estado}
              </Badge>
              {payment.tipo_pago === "Plan Especial" && (
                <Badge className="bg-purple-100 text-purple-700 text-xs">Plan Especial</Badge>
              )}
              {payment.tipo_pago === "Plan Mensual" && (
                <Badge className="bg-blue-100 text-blue-700 text-xs">Plan Mensual</Badge>
              )}
            </div>

            {/* Línea 2: Cantidad grande */}
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {payment.cantidad?.toFixed(2)}€
            </p>

            {/* Línea 3: Info extra */}
            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
              {payment.temporada && <span>Temporada {payment.temporada}</span>}
              {payment.metodo_pago && payment.estado !== "Pendiente" && (
                <span className="ml-2">• {payment.metodo_pago}</span>
              )}
              {payment.fecha_pago && (
                <span className="ml-2">• {new Date(payment.fecha_pago).toLocaleDateString('es-ES')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: acciones */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Justificante subido */}
          {payment.justificante_url && (
            <a
              href={payment.justificante_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              Ver justificante
            </a>
          )}

          {/* Botón pagar */}
          {showPayButton && payment.estado === "Pendiente" && (
            <Button
              size="sm"
              onClick={() => onPayClick(player, payment)}
              className="bg-orange-600 hover:bg-orange-700 text-xs h-8"
            >
              💳 Pagar
            </Button>
          )}

          {/* Recibo */}
          {payment.recibo_url && (
            <a
              href={payment.recibo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              Recibo
            </a>
          )}
        </div>
      </div>
    </div>
  );
}