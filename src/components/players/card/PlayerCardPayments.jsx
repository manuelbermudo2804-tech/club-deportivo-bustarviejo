import React from "react";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

export default function PlayerCardPayments({
  currentSeason, allPaid, playerPayments, customPlan,
  paidCount, expectedPayments, pendingCount
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-700">💳 Pagos {currentSeason}:</span>
        {allPaid ? (
          <Badge className="bg-green-100 text-green-700 text-xs">✅ Completo</Badge>
        ) : playerPayments.length === 0 && !customPlan ? (
          <Badge className="bg-slate-200 text-slate-600 text-xs">Sin registrar</Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-700 text-xs">{paidCount}/{expectedPayments}</Badge>
        )}
      </div>

      {customPlan && customPlan.cuotas ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-bold text-purple-900">Plan Especial</span>
            </div>
            <span className="text-xs text-purple-700">{paidCount}/{customPlan.cuotas.length} pagadas</span>
          </div>
          <div className="flex gap-1 h-6 rounded-lg overflow-hidden bg-slate-200">
            {customPlan.cuotas
              .sort((a, b) => a.numero - b.numero)
              .map((cuota) => {
                const pagosCuota = playerPayments.filter(p =>
                  p.tipo_pago === "Plan Especial" &&
                  p.mes === `Cuota ${cuota.numero}`
                );
                let pagoCuota = null;
                if (pagosCuota.length > 0) {
                  pagoCuota = pagosCuota.find(p => p.estado === "Pagado") ||
                              pagosCuota.find(p => p.estado === "En revisión") ||
                              pagosCuota[0];
                }
                const isPaid = pagoCuota?.estado === "Pagado";
                const isReview = pagoCuota?.estado === "En revisión";

                return (
                  <div
                    key={cuota.numero}
                    className={`flex-1 flex items-center justify-center text-[10px] font-bold ${
                      isPaid ? 'bg-green-500 text-white' :
                      isReview ? 'bg-orange-400 text-white animate-pulse' :
                      'bg-red-400 text-white'
                    }`}
                    title={`Cuota ${cuota.numero}: ${cuota.cantidad}€ - ${isPaid ? 'Pagada' : isReview ? 'En revisión' : 'Pendiente'}`}
                  >
                    {cuota.numero} {isPaid ? '✓' : isReview ? '⏳' : '✗'}
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-purple-600 mt-1">
            💰 Total plan: {customPlan.deuda_final?.toFixed(0)}€ • {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
      ) : playerPayments.some(p => p.tipo_pago === "Único" || p.tipo_pago === "único") ? (
        <div className="flex h-6 rounded-lg overflow-hidden">
          {(() => {
            const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
            const isPaid = pagoUnico?.estado === "Pagado";
            const isReview = pagoUnico?.estado === "En revisión";

            return (
              <div className={`flex-1 flex items-center justify-center text-xs font-bold ${
                isPaid ? 'bg-green-500 text-white' :
                isReview ? 'bg-orange-400 text-white animate-pulse' :
                'bg-red-400 text-white'
              }`}>
                {isPaid ? '✅ Pago Único Completo' :
                 isReview ? '⏳ Pago Único en Revisión' :
                 '✗ Pago Único Pendiente'}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex gap-1 h-6 rounded-lg overflow-hidden bg-slate-200">
          {["Jun", "Sep", "Dic"].map((mes, idx) => {
            const mesCompleto = ["Junio", "Septiembre", "Diciembre"][idx];
            const pago = playerPayments.find(p => p.mes === mesCompleto);
            const isPaid = pago?.estado === "Pagado";
            const isReview = pago?.estado === "En revisión";
            const isPending = pago?.estado === "Pendiente";
            const noPayment = !pago;

            return (
              <div
                key={mes}
                className={`flex-1 flex items-center justify-center text-[10px] font-bold transition-all ${
                  isPaid ? 'bg-green-500 text-white' :
                  isReview ? 'bg-orange-400 text-white animate-pulse' :
                  isPending || noPayment ? 'bg-red-400 text-white' :
                  'bg-red-400 text-white'
                }`}
              >
                {mes} {isPaid ? '✓' : isReview ? '⏳' : '✗'}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}