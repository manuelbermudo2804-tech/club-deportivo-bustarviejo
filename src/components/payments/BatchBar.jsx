import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload } from "lucide-react";

export default function BatchBar({ visible, count, total, onPayCard, onTransfer }) {
  const fileRef = useRef(null);
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-80 z-40">
      <div className="mx-auto max-w-4xl bg-white border shadow-xl rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-700">
          <span className="font-semibold">{count}</span> seleccionada{count !== 1 ? 's' : ''}
          <span className="mx-2">·</span>
          Total <span className="font-bold">{total.toFixed(2)}€</span>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={onPayCard}>
            <CreditCard className="w-4 h-4 mr-2"/> Pagar con tarjeta
          </Button>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onTransfer(file);
            e.target.value = '';
          }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2"/> Subir justificante (transferencia)
          </Button>
        </div>
      </div>
    </div>
  );
}