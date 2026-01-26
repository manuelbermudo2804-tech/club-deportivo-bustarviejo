import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CreditCard, Banknote, Shield, Gift, Loader2 } from "lucide-react";

export default function PayModal({ open, onClose, player, payment, onPayCard, onChooseTransfer, onUploadTransfer }) {
  const [openingStripe, setOpeningStripe] = useState(false);
  const [file, setFile] = useState(null);
  if (!payment || !player) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="w-[92vw] max-w-md p-0 overflow-hidden rounded-2xl max-h-[85vh] sm:mt-8">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4">
          <h3 className="text-lg font-bold">Pagar cuota</h3>
          <p className="text-sm opacity-90">{player.nombre} • {payment.mes} • {Number(payment.cantidad).toFixed(2)}€</p>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {player.tiene_descuento_hermano && Number(player.descuento_aplicado) > 0 && payment.mes === 'Junio' && (
            <div className="mb-3 flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 text-xs rounded-lg px-3 py-2">
              <Gift className="w-3.5 h-3.5" />
              <span>Descuento familiar aplicado: -{Number(player.descuento_aplicado).toFixed(2)}€ (Junio)</span>
            </div>
          )}
          <Tabs defaultValue="card" className="w-full">
            <TabsList className="grid grid-cols-2 w-full sticky top-0 bg-white">
              <TabsTrigger value="card" className="flex items-center gap-2"><CreditCard className="w-4 h-4"/>Tarjeta</TabsTrigger>
              <TabsTrigger value="transfer" className="flex items-center gap-2"><Banknote className="w-4 h-4"/>Transferencia</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-4">
              <div className="space-y-3">
                <p className="text-sm text-slate-700">Pagarás con tarjeta mediante Stripe. Es rápido y seguro.</p>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Shield className="w-4 h-4"/> Pagos protegidos por Stripe.
                </div>
                <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => { setOpeningStripe(true); onPayCard?.(); }} disabled={openingStripe}>
                  {openingStripe ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Abriendo Stripe...</>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2"/> Pagar {Number(payment.cantidad).toFixed(2)}€ con tarjeta</>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="mt-4">
              <div className="space-y-4">
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
                  <p className="text-xs font-bold text-orange-900 mb-1">Concepto sugerido</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono font-bold text-orange-900 truncate">{`CDB CUOTA ${payment.mes} ${(payment.temporada||'').replace(/-/g,'/')} ${(player.nombre||'').trim().split(' ').slice(-1)[0]?.toUpperCase()}`}</p>
                    <Button size="sm" variant="outline" className="bg-white" onClick={() => navigator.clipboard.writeText(`CDB CUOTA ${payment.mes} ${(payment.temporada||'').replace(/-/g,'/')} ${(player.nombre||'').trim().split(' ').slice(-1)[0]?.toUpperCase()}`)}>Copiar</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">Sube el justificante para esta cuota y lo pondremos en revisión al momento.</p>
                  <input type="file" accept="image/*,application/pdf" onChange={(e)=> setFile(e.target.files?.[0] || null)} className="w-full" />
                  <Button className="w-full bg-orange-600 hover:bg-orange-700" disabled={!file} onClick={() => file && onUploadTransfer?.(file)}>
                    Enviar justificante ahora
                  </Button>
                  <Button variant="outline" className="w-full" onClick={onChooseTransfer}>
                    Prefiero el formulario completo
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}