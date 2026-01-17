import React from "react";
import { Button } from "@/components/ui/button";

export default function PaymentsCartBar({ selectedCount, total, onPayCard, onTransfer }) {
  if (!selectedCount) return null;
  return (
    <div className="fixed bottom-24 left-4 right-4 lg:left-80 z-50">
      <div className="bg-white border rounded-2xl shadow-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
        <div className="text-sm font-medium text-slate-800">
          Selecciona varias cuotas de diferentes jugadores y págalo todo junto.
          <br className="hidden sm:block" />
          {selectedCount} cuota{selectedCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''}
          <span className="ml-2 font-bold">Total: {total.toFixed(2)}€</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button className="flex-1 sm:flex-initial bg-orange-600 hover:bg-orange-700" onClick={onPayCard} title="Revisar y pagar">
            💳 Pagar con tarjeta
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-initial" onClick={onTransfer}>
            🧾 Generar transferencia
          </Button>
        </div>
      </div>
    </div>
  );
}