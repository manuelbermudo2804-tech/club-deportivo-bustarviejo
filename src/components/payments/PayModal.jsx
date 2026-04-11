import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CreditCard, Banknote, Shield, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PayModal({ open, onClose, player, payment, onPayCard, onPaySubscription, onChooseTransfer, onUploadTransfer }) {
  const [openingStripe, setOpeningStripe] = useState(false);
  const [file, setFile] = useState(null);
  if (!payment || !player) return null;
  const isPlanMensual = payment.tipo_pago === "Plan Mensual";
  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="w-[92vw] max-w-md p-0 overflow-hidden rounded-2xl max-h-[85vh] sm:mt-8">
        <div className={`text-white p-4 ${isPlanMensual ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-orange-600 to-orange-700'}`}>
          <h3 className="text-lg font-bold">{isPlanMensual ? 'Activar Plan Mensual' : 'Pagar cuota'}</h3>
          <p className="text-sm opacity-90">{player.nombre} • {payment.mes} • {Number(payment.cantidad).toFixed(2)}€</p>
          {isPlanMensual && payment.plan_mensual_mensualidad > 0 && (
            <p className="text-xs opacity-80 mt-1">+ {payment.plan_mensual_meses}x {payment.plan_mensual_mensualidad}€/mes automático</p>
          )}
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {player.tiene_descuento_hermano && Number(player.descuento_aplicado) > 0 && payment.mes === 'Junio' && (
            <div className="mb-3 flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 text-xs rounded-lg px-3 py-2">
              <Gift className="w-3.5 h-3.5" />
              <span>Descuento familiar aplicado: -{Number(player.descuento_aplicado).toFixed(2)}€ (Junio)</span>
            </div>
          )}
          {isPlanMensual && (
            <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-bold text-emerald-900">🔄 Plan Mensual con Tarjeta</p>
              <p className="text-xs text-emerald-800">
                Pagarás <strong>{Number(payment.cantidad).toFixed(2)}€</strong> ahora y Stripe cobrará automáticamente <strong>{payment.plan_mensual_mensualidad}€/mes</strong> en tu tarjeta hasta <strong>{payment.plan_mensual_mes_fin || 'Mayo'}</strong>.
              </p>
              <p className="text-xs text-emerald-700">La suscripción se cancela sola al finalizar.</p>
            </div>
          )}
          <Tabs defaultValue="card" className="w-full">
            <TabsList className={`grid w-full sticky top-0 bg-white ${isPlanMensual ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <TabsTrigger value="card" className="flex items-center gap-2"><CreditCard className="w-4 h-4"/>{isPlanMensual ? 'Activar con Tarjeta' : 'Tarjeta'}</TabsTrigger>
              {!isPlanMensual && <TabsTrigger value="transfer" className="flex items-center gap-2"><Banknote className="w-4 h-4"/>Transferencia</TabsTrigger>}
            </TabsList>

            <TabsContent value="card" className="mt-4">
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  {isPlanMensual 
                    ? 'Se abrirá Stripe donde introducirás tu tarjeta. Se cobrará el pago inicial y las mensualidades automáticamente.' 
                    : 'Pagarás con tarjeta mediante Stripe. Es rápido y seguro.'}
                </p>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Shield className="w-4 h-4"/> Pagos protegidos por Stripe.
                </div>
                <Button className={`w-full ${isPlanMensual ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`} onClick={() => { setOpeningStripe(true); isPlanMensual ? onPaySubscription?.() : onPayCard?.(); }} disabled={openingStripe}>
                  {openingStripe ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Abriendo Stripe...</>
                  ) : isPlanMensual ? (
                    <><CreditCard className="w-4 h-4 mr-2"/> Activar Plan Mensual ({Number(payment.cantidad).toFixed(2)}€ + mensualidades)</>
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
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText('ES8200494447382010004048'); toast.success('IBAN copiado'); }}>Copiar</Button>
                  </div>
                  <p className="text-xs text-slate-600"><strong>Banco:</strong> Banco Santander</p>
                  <p className="text-xs text-slate-600"><strong>Beneficiario:</strong> CD Bustarviejo</p>
                </div>
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
                  <p className="text-xs font-bold text-orange-900 mb-1">Concepto (Obligatorio)</p>
                  {(() => {
                    const catMap = { 'Pre-Benjamín': 'PRE', 'Benjamín': 'BEN', 'Alevín': 'ALE', 'Infantil': 'INF', 'Cadete': 'CAD', 'Juvenil': 'JUV', 'Aficionado': 'AFI', 'Femenino': 'FEM', 'Baloncesto': 'BAS' };
                    const catCode = Object.entries(catMap).find(([k]) => (player.deporte || '').includes(k))?.[1] || '';
                    const cleanName = (player.nombre || '').trim().replace(/\s+/g, ' ').toUpperCase();
                    const monthCode = payment.mes || '';
                    const concept = [catCode, cleanName, monthCode].filter(Boolean).join(' ');
                    return (
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono font-bold text-orange-900 truncate">{concept}</p>
                        <Button size="sm" variant="outline" className="bg-white" onClick={() => { navigator.clipboard.writeText(concept); toast.success('Concepto copiado'); }}>Copiar</Button>
                      </div>
                    );
                  })()}
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