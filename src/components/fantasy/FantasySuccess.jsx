import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function FantasySuccess({ entry, config }) {
  const [loading, setLoading] = useState(false);
  const precio = config?.precio_inscripcion ?? 10;

  const handlePay = async () => {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/Fantasy?payment=success&entry_id=${entry.id}`;
      const cancelUrl = `${origin}/Fantasy?payment=cancel&entry_id=${entry.id}`;

      const res = await base44.functions.invoke("stripeCheckout", {
        amount: precio,
        name: `Fantasy Mundial CDB - ${entry.nickname}`,
        currency: "eur",
        successUrl,
        cancelUrl,
        metadata: {
          tipo: "fantasy_mundial",
          fantasy_entry_id: entry.id,
          nickname: entry.nickname,
          email: entry.email,
        },
      });

      const url = res?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error(res?.data?.error || "No se pudo abrir el pago");
      }
    } catch (e) {
      toast.error(e?.message || "Error al iniciar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardContent className="p-6 lg:p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">¡Predicciones guardadas!</h2>
        <p className="text-slate-700 mb-6">Para confirmar tu inscripción, paga la cuota con tarjeta:</p>

        <div className="bg-white rounded-2xl p-5 mb-4 border-2 border-emerald-200">
          <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-4 py-3 mb-4">
            <div className="text-left">
              <div className="text-xs text-slate-500 font-bold uppercase">Importe</div>
              <div className="text-3xl font-black text-emerald-600">{precio}€</div>
            </div>
            <CreditCard className="w-10 h-10 text-emerald-500" />
          </div>

          <Button
            onClick={handlePay}
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-base font-bold"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Abriendo pago seguro...</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-2" /> Pagar {precio}€ con tarjeta</>
            )}
          </Button>
          <p className="text-xs text-slate-500 mt-3">Pago seguro con Stripe · Visa, Mastercard, Apple Pay, Google Pay</p>
        </div>

        <p className="text-xs text-slate-600">
          Si cierras esta ventana sin pagar, tu inscripción queda como <strong>pendiente</strong>.
          Podrás completar el pago más tarde con el enlace que te enviaremos a <strong>{entry?.email}</strong>.
        </p>
      </CardContent>
    </Card>
  );
}