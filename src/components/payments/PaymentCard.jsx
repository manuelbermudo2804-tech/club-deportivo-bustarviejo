import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2, Clock, AlertCircle, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

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
  feeAdjustment,
}) {
  const cfg = statusConfig[payment.estado] || statusConfig["Pendiente"];
  const StatusIcon = cfg.icon;
  const playerActivities = [...new Set([player?.categoria_principal, player?.deporte, ...(Array.isArray(player?.categorias) ? player.categorias : [])].filter(Boolean))];
  const paymentActivity = payment.categoria_actividad || (playerActivities.length === 1 ? playerActivities[0] : null);

  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(payment.recibo_url || null);

  useEffect(() => {
    if (payment.recibo_url) setReceiptUrl(payment.recibo_url);
  }, [payment.recibo_url]);

  const handleGenerateReceipt = async () => {
    if (payment.isVirtual || generatingReceipt || receiptUrl) return;
    setGeneratingReceipt(true);

    let pollTimer;
    let timeoutId;

    try {
      // La URL se guarda en el pago antes de que termine el envío de emails.
      // Esperamos a que esté guardada y actualizamos el botón sin abrir pestañas.
      const waitForSavedReceipt = new Promise((resolve) => {
        const startedAt = Date.now();
        const poll = async () => {
          try {
            const latestPayment = await base44.entities.Payment.get(payment.id);
            if (latestPayment?.recibo_url) {
              setReceiptUrl(latestPayment.recibo_url);
              resolve(latestPayment.recibo_url);
              return;
            }
          } catch (error) {
            console.warn('[PaymentCard] No se pudo consultar el recibo todavía:', error);
          }

          if (Date.now() - startedAt >= 60000) {
            resolve(null);
            return;
          }
          pollTimer = setTimeout(poll, 2000);
        };
        poll();
      });

      const generation = base44.functions.invoke('generatePaymentReceipt', { paymentId: payment.id })
        .then((res) => {
          const url = res?.data?.recibo_url;
          if (url) {
            setReceiptUrl(url);
            return url;
          }
          return new Promise(() => {});
        })
        .catch((error) => {
          console.error('[PaymentCard] Error generando recibo:', error);
          // No ocultar el fallo: la interfaz debe mostrar el error real al usuario.
          throw error;
        });

      const url = await Promise.race([
        waitForSavedReceipt,
        generation,
        new Promise((resolve) => {
          timeoutId = setTimeout(() => resolve(null), 60000);
        }),
      ]);

      if (url) {
        setReceiptUrl(url);
        toast.success('Recibo generado. Ya puedes descargarlo.');
      } else {
        toast.error('No se ha podido generar el recibo. Inténtalo de nuevo en unos segundos.');
      }
    } catch (error) {
      console.error('[PaymentCard] Error generando recibo:', error);
      const detail = error?.response?.data?.error || error?.data?.error || error?.message;
      toast.error(detail
        ? `No se ha podido generar el recibo: ${detail}`
        : 'No se ha podido generar el recibo. Revisa la consola para ver el error.');
    } finally {
      clearTimeout(pollTimer);
      clearTimeout(timeoutId);
      setGeneratingReceipt(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!receiptUrl) {
      toast.error('Primero genera el recibo.');
      return;
    }
    // La descarga es una acción independiente y directa del usuario.
    const link = document.createElement('a');
    link.href = receiptUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

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
              {paymentActivity && (
                <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-800 text-xs">
                  ⚽ {paymentActivity}
                </Badge>
              )}
              {!paymentActivity && playerActivities.length > 1 && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-xs">
                  ⚠️ Actividad pendiente de asignar
                </Badge>
              )}
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

            {/* Aportación solidaria incluida (si la hay) */}
            {Number(payment.aportacion_solidaria) > 0 && (
              <p className="text-xs text-green-700 font-semibold mt-1 inline-flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                💚 Incluye {Number(payment.aportacion_solidaria).toFixed(2)}€ al Fondo Solidario de Becas
              </p>
            )}

            {/* Ajuste de cuota visible para la familia */}
            {feeAdjustment?.cuota_ajustada != null && (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="line-through text-slate-400 text-xs">{feeAdjustment.cuota_original?.toFixed(0)}€ total</span>
                <span className="text-xs font-bold text-green-700">→ {feeAdjustment.cuota_ajustada?.toFixed(0)}€</span>
                <span className="text-[10px] text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded">{feeAdjustment.motivo}</span>
              </div>
            )}

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

          {/* Recibo: primero se genera y, cuando existe, se ofrece la descarga */}
          {payment.estado === "Pagado" && !payment.isVirtual && (
            <Button
              size="sm"
              variant="outline"
              onClick={receiptUrl ? handleDownloadReceipt : handleGenerateReceipt}
              disabled={generatingReceipt}
              className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
            >
              {generatingReceipt ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : receiptUrl ? (
                <Download className="w-3.5 h-3.5 mr-1" />
              ) : (
                <FileText className="w-3.5 h-3.5 mr-1" />
              )}
              {generatingReceipt ? 'Generando recibo…' : receiptUrl ? 'Descargar archivo' : 'Generar recibo'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}