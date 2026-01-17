import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export default function ExtraChargePayModal({ open, onClose, charge, onPayCard, onChooseTransfer }) {
  const [selection, setSelection] = useState(() => (charge?.items || []).map(i => ({ nombre: i.nombre, cantidad: i.obligatorio ? 1 : 0 })));

  const total = useMemo(() => {
    return (selection || []).reduce((sum, s) => {
      const def = charge?.items?.find(i => i.nombre === s.nombre);
      const qty = Number(s.cantidad || 0);
      const unit = Number(def?.precio || 0);
      return sum + (qty * unit);
    }, 0);
  }, [selection, charge]);

  const toggleItem = (nombre, checked) => {
    setSelection(prev => prev.map(s => s.nombre === nombre ? { ...s, cantidad: checked ? (s.cantidad || 1) : 0 } : s));
  };

  const changeQty = (nombre, qty) => {
    setSelection(prev => prev.map(s => s.nombre === nombre ? { ...s, cantidad: Math.max(0, Number(qty||0)) } : s));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="w-[92vw] max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{charge?.titulo || 'Pago Extra'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {(charge?.items || []).map((item) => (
              <div key={item.nombre} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={(selection.find(s => s.nombre === item.nombre)?.cantidad || 0) > 0}
                    onCheckedChange={(v) => toggleItem(item.nombre, v)}
                    disabled={item.obligatorio}
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{item.nombre}</p>
                    <p className="text-xs text-slate-600">{item.obligatorio ? 'Obligatorio' : 'Opcional'} • {Number(item.precio).toFixed(2)}€</p>
                  </div>
                </div>
                {item.permite_cantidad && (
                  <Input type="number" min={item.obligatorio ? 1 : 0} className="w-20" value={selection.find(s => s.nombre === item.nombre)?.cantidad || (item.obligatorio ? 1 : 0)} onChange={(e) => changeQty(item.nombre, e.target.value)} />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-lg font-bold">Total: {total.toFixed(2)}€</p>
            <div className="flex gap-2">
              <Button onClick={() => onPayCard?.(selection)} className="bg-orange-600 hover:bg-orange-700" disabled={total <= 0 || !charge?.metodos?.includes('Tarjeta')}>Pagar con tarjeta</Button>
              <Button variant="outline" onClick={() => onChooseTransfer?.(selection)} disabled={total <= 0 || !charge?.metodos?.includes('Transferencia')}>Registrar transferencia</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}