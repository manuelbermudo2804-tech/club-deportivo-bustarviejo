import React from "react";
import { Button } from "@/components/ui/button";

export default function PaymentsCartBar({ selectedCount, total, onPayCard, onTransfer }) {
  if (!selectedCount) return null;
  return (
    <div className="fixed left-4 right-4 lg:left-80 z-[45] bottom-40 sm:bottom-36 md:bottom-32 lg:bottom-28 xl:bottom-24">
      <div className="bg-white border rounded-2xl shadow-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-800">
          Selecciona varias cuotas de diferentes jugadores y págalo todo junto.
          <br className="hidden sm:block" />
          {selectedCount} cuota{selectedCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''}
          <span className="ml-2 font-bold">Total: {total.toFixed(2)}€</span>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 whitespace-normal text-center leading-tight" onClick={onPayCard} title="Revisar y pagar">
            💳 Pagar con tarjeta
          </Button>
          <Button variant="outline" className="w-full sm:w-auto whitespace-normal text-center leading-tight" onClick={onTransfer}>
            🧾 Generar transferencia
          </Button>
        </div>
      </div>
    </div>
  );
}