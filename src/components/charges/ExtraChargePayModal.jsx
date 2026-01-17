import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CreditCard, Banknote } from "lucide-react";

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

  const toggleItem = (nombre, v) => {
    const checked = v === true;
    setSelection(prev => prev.map(s => s.nombre === nombre ? { ...s, cantidad: checked ? (s.cantidad && s.cantidad > 0 ? s.cantidad : 1) : 0 } : s));
  };

  const changeQty = (nombre, qty) => {
    setSelection(prev => prev.map(s => s.nombre === nombre ? { ...s, cantidad: Math.max(0, Number(qty||0)) } : s));
  };

  // Reset selección al abrir o cambiar de cobro
  React.useEffect(() => {
    setSelection((charge?.items || []).map(i => ({ nombre: i.nombre, cantidad: i.obligatorio ? 1 : 0 })));
  }, [charge?.id, open]);

  const isEmbedded = typeof window !== 'undefined' && window.top !== window.self;
  const cardAllowed = !!charge?.metodos?.includes('Tarjeta');
  const transferAllowed = !!charge?.metodos?.includes('Transferencia');
  const cardDisabled = total <= 0 || !cardAllowed || isEmbedded;
  const transferDisabled = total <= 0 || !transferAllowed;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="w-[95vw] sm:max-w-lg p-0 overflow-hidden rounded-2xl">
        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{charge?.titulo || 'Pago Extra'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {(charge?.items?.length || 0) > 1 && (
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelection((charge?.items || []).map(i => ({ nombre: i.nombre, cantidad: i.obligatorio ? 1 : 1 })))}>
                  Seleccionar todo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelection((charge?.items || []).map(i => ({ nombre: i.nombre, cantidad: i.obligatorio ? 1 : 0 })))}>
                  Quitar selección
                </Button>
              </div>
            )}

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
                    <p className="text-xs text-slate-600">{item.obligatorio ? 'Obligatorio (pago requerido)' : 'Opcional (elige si lo necesitas)'} • {Number(item.precio).toFixed(2)}€</p>
                  </div>
                </div>
                {item.permite_cantidad && (
                  <Input type="number" min={item.obligatorio ? 1 : 0} className="w-20" value={selection.find(s => s.nombre === item.nombre)?.cantidad || (item.obligatorio ? 1 : 0)} onChange={(e) => changeQty(item.nombre, e.target.value)} />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
            <p className="text-lg font-bold">Total: {total.toFixed(2)}€</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => onPayCard?.(selection)} className="bg-orange-600 hover:bg-orange-700" disabled={cardDisabled}>
                <CreditCard className="w-4 h-4 mr-1" /> Pagar con tarjeta
              </Button>
              <Button variant="outline" onClick={() => onChooseTransfer?.(selection)} disabled={transferDisabled}>
                <Banknote className="w-4 h-4 mr-1" /> Registrar transferencia
              </Button>
            </div>
          </div>
          {isEmbedded && cardAllowed && (
            <p className="text-xs text-slate-500 mt-1">
              Para pagar con tarjeta abre la app publicada (fuera del editor).
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}