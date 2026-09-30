import React from "react";
import { AlertTriangle } from "lucide-react";
import PaymentCard from "@/components/payments/PaymentCard";
import { sameSeason } from "@/lib/sameSeason";

// Cuotas pendientes de temporadas anteriores: se muestran para poder pagarlas (tarjeta o transferencia)
export default function DeudaAnteriorBlock({ player, payments, currentSeason, onPayClick, onUpload, uploadingPaymentId }) {
  const deuda = payments.filter(p =>
    p.jugador_id === player.id && p.estado === "Pendiente" && p.temporada && !sameSeason(p.temporada, currentSeason)
  );
  if (deuda.length === 0) return null;
  const total = deuda.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);

  return (
    <div className="mb-4 p-3 rounded-lg border-2 border-red-300 bg-red-50 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-900">Cuotas pendientes de temporadas anteriores: {total}€</p>
          <p className="text-xs text-red-700">Hay que pagarlas antes de poder renovar. Puedes pagar con tarjeta o por transferencia.</p>
        </div>
      </div>
      {deuda.map(payment => (
        <PaymentCard
          key={payment.id}
          payment={payment}
          player={player}
          isUploading={uploadingPaymentId === payment.id}
          onUpload={onUpload}
          showPayButton
          onPayClick={onPayClick}
        />
      ))}
    </div>
  );
}