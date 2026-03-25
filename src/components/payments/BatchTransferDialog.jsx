import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function BatchTransferDialog({ open, onClose, concept, total, onConfirm }) {
  const [file, setFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`IBAN: ES8200494447382010004048\nConcepto: ${concept}\nImporte: ${Number(total).toFixed(2)}€`)}`;
  return (
    <Dialog open={open} onOpenChange={(v)=>{ if(!v) onClose(); }}>
      <DialogContent className="w-[92vw] max-w-sm p-0 overflow-hidden rounded-2xl max-h-[85vh] sm:mt-8">
        <div className="bg-slate-900 text-white p-4">
          <h3 className="text-lg font-bold">Transferencia bancaria</h3>
          <p className="text-sm opacity-90">Concepto: {concept}</p>
          <p className="text-sm">Importe total: {total.toFixed(2)}€</p>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Datos para transferencia</h4>
            <div className="bg-slate-50 border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600">IBAN</p>
                  <p className="font-mono font-bold tracking-wider">ES8200494447382010004048</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText('ES8200494447382010004048')}>Copiar</Button>
              </div>
              <p className="text-xs text-slate-600"><strong>Banco:</strong> Banco Santander</p>
              <p className="text-xs text-slate-600"><strong>Beneficiario:</strong> CD Bustarviejo</p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
              <p className="text-xs font-bold text-orange-900 mb-1">Concepto (Obligatorio)</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-bold text-orange-900 truncate">{concept}</p>
                <Button size="sm" variant="outline" className="bg-white" onClick={() => navigator.clipboard.writeText(concept)}>Copiar</Button>
              </div>
            </div>
            <div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  const txt = `DATOS PARA TRANSFERENCIA\nIBAN: ES8200494447382010004048\nBanco: Banco Santander\nBeneficiario: CD Bustarviejo\nConcepto: ${concept}\nImporte: ${total.toFixed(2)}€`;
                  navigator.clipboard.writeText(txt);
                }}
              >
                Copiar todos los datos
              </Button>
            </div>

            {/* QR de pago con datos */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900">Código QR (datos de pago)</h4>
              <div className="bg-white p-4 rounded-xl border flex flex-col items-center">
                <img src={qrUrl} alt="QR Transferencia" className="w-40 h-40 border rounded" />
                <p className="text-xs text-slate-600 mt-2">Escanea para ver IBAN, concepto e importe</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-700">Sube un único justificante para este lote. Se registrará como <strong>pago múltiple</strong> con el detalle de jugadores.</p>
          <input type="file" accept="image/*,application/pdf" onChange={(e)=> setFile(e.target.files?.[0] || null)} className="w-full" />
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSending} className="w-full sm:w-auto">Cancelar</Button>
            <Button 
              onClick={async () => {
                if (!file || isSending) return;
                setIsSending(true);
                try {
                  await onConfirm(file);
                } finally {
                  setIsSending(false);
                }
              }} 
              disabled={!file || isSending} 
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar justificante'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}