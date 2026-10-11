import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function StripeDescuadres({ descuadres, sinVincular, onChange }) {
  const [busy, setBusy] = useState(null);
  const marcar = async (d) => {
    setBusy(d.payment_id);
    await base44.functions.invoke("stripeCotejo", { action: "marcar", payment_id: d.payment_id, fecha: d.fecha });
    toast.success(`${d.jugador} marcado como pagado`);
    setBusy(null);
    onChange();
  };
  const lista = [...descuadres, ...sinVincular.map((s) => ({ ...s, problema: "sin_vincular" }))];

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Descuadres entre Stripe y la app</CardTitle></CardHeader>
      <CardContent>
        {lista.length === 0 ? (
          <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="w-5 h-5" /> Todo cuadra: cada cobro de Stripe está como pagado en la app.</div>
        ) : (
          <div className="space-y-2">
            {lista.map((d, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-amber-50">
                <div className="text-sm">
                  <p className="font-semibold">{d.jugador || d.email || "Cobro sin identificar"} {d.mes ? `· ${d.mes}` : ""}</p>
                  <p className="text-slate-600">
                    {d.fecha} · {d.importe.toFixed(2)} € cobrados en Stripe ·{" "}
                    {d.problema === "pendiente_en_app" && `en la app figura "${d.estado_app}"`}
                    {d.problema === "no_existe" && "el pago ya no existe en la app"}
                    {d.problema === "sin_vincular" && "no está asociado a ningún pago"}
                  </p>
                </div>
                {d.problema === "pendiente_en_app" && (
                  <Button size="sm" onClick={() => marcar(d)} disabled={busy === d.payment_id} className="bg-green-600 hover:bg-green-700">
                    {busy === d.payment_id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Marcar como pagado"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}