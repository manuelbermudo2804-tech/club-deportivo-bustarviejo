import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function BatchSummaryDialog({ open, onClose, items = [], total = 0, onPayCard, onTransfer, mode = 'all' }) {
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(v)=>{ if(!v) onClose(); }}>
      <DialogContent className="w-[92vw] max-w-lg max-h-[85vh] rounded-2xl sm:mt-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold">Resumen de pago</h3>
            <p className="text-sm text-slate-600">{mode === 'transfer' ? 'Revisa el detalle antes de generar la transferencia.' : 'Has seleccionado varias cuotas. Revisa el detalle y elige cómo quieres pagar.'}</p>
          </div>
          <div className="max-h-64 overflow-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left p-2">Jugador</th>
                  <th className="text-left p-2">Mes</th>
                  <th className="text-left p-2">Temporada</th>
                  <th className="text-right p-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{it.player?.nombre || it.jugador_nombre}</td>
                    <td className="p-2">{it.payment?.mes || it.mes}</td>
                    <td className="p-2">{it.payment?.temporada || it.temporada}</td>
                    <td className="p-2 text-right">{Number(it.payment?.cantidad ?? it.cantidad).toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Descuentos familiares detectados */}
          {(() => {
            const notes = items.filter(it => {
              const p = it.player || {};
              const mes = it.payment?.mes || it.mes;
              return p.tiene_descuento_hermano && Number(p.descuento_aplicado) > 0 && mes === 'Junio';
            }).map(it => {
              const p = it.player || {};
              const surname = (p.nombre || it.jugador_nombre || '').trim().split(' ').slice(-1)[0]?.toUpperCase();
              return `• ${surname}: -${Number(p.descuento_aplicado).toFixed(2)}€ (aplicado en Junio)`;
            });
            return notes.length ? (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800">
                <p className="font-semibold mb-1">Descuento familiar</p>
                {notes.filter((v, i, a) => a.indexOf(v) === i).map((t, idx) => <p key={idx}>{t}</p>)}
              </div>
            ) : null;
          })()}
          <div className="flex items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{mode === 'transfer' ? 'Confirma el detalle para generar la transferencia.' : 'Puedes pagar todas juntas con tarjeta o generar una única transferencia.'}</p>
            <div className="text-right font-bold shrink-0">Total: {Number(total).toFixed(2)}€</div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="w-full sm:w-auto"
              disabled={isProcessingCard || isProcessingTransfer}
            >
              Seguir seleccionando
            </Button>
            <Button 
              onClick={async () => {
                setIsProcessingTransfer(true);
                await onTransfer();
                setIsProcessingTransfer(false);
              }} 
              className="w-full sm:w-auto bg-slate-800 text-white hover:bg-slate-900"
              disabled={isProcessingCard || isProcessingTransfer}
            >
              {isProcessingTransfer ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparando...
                </>
              ) : (
                <>🧾 Confirmar transferencia</>
              )}
            </Button>
            {mode !== 'transfer' && (
              <Button 
                className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto" 
                onClick={async () => {
                  setIsProcessingCard(true);
                  try {
                    await onPayCard();
                  } catch (error) {
                    setIsProcessingCard(false);
                  }
                }}
                disabled={isProcessingCard || isProcessingTransfer}
              >
                {isProcessingCard ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Abriendo Stripe...
                  </>
                ) : (
                  <>💳 Pagar con tarjeta</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}