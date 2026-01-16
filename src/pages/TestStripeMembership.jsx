import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";

function computeSeason() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 9) return `${y}-${y + 1}`; // Septiembre o más
  return `${y - 1}-${y}`;
}

export default function TestStripeMembership() {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");

  const season = useMemo(() => computeSeason(), []);

  // Si volvemos de Stripe con éxito, confirmar el pago y registrar/actualizar socio
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const sid = params.get("session_id");
    if (success === "1" && sid && !result && !confirming) {
      setSessionId(sid);
      handleConfirm(sid);
    }
  }, []); // eslint-disable-line

  const handleCreateCheckout = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      // Éxito/cancel URLs apuntando a esta misma página
      const successUrl = `${window.location.origin}${createPageUrl("TestStripeMembership")}?success=1&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}${createPageUrl("TestStripeMembership")}?canceled=1`;

      const { data } = await base44.functions.invoke("stripeCheckout", {
        amount: 1, // 1€ test
        name: "Test Membresía Club",
        currency: "eur",
        successUrl,
        cancelUrl,
        metadata: {
          origen: "test_membership",
          tipo_inscripcion: "Nueva Inscripción",
          temporada: season,
        },
      });

      const url = data?.url;
      if (!url) throw new Error("No se recibió URL de checkout");
      setCheckoutUrl(url);
    } catch (e) {
      setError(e?.message || "Error creando checkout");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (sid) => {
    try {
      setConfirming(true);
      setError("");
      const { data } = await base44.functions.invoke("confirmStripeMembership", { sessionId: sid });
      setResult(data);
    } catch (e) {
      setError(e?.message || "Error confirmando membresía");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">Prueba de Membresía (Stripe)</h1>
          <p className="text-slate-600 text-sm">Modo test con tarjeta 4242 4242 4242 4242</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Crear Checkout de Prueba
              <Badge variant="outline">Temporada {season}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleCreateCheckout} className="gradient-orange text-white" disabled={loading}>
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creando…</>) : "Crear checkout (1€)"}
              </Button>
              {checkoutUrl && (
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button variant="outline" className="gap-2">
                    Abrir Checkout <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>

            {checkoutUrl && (
              <div className="text-xs text-slate-500">
                Si estás en el constructor (preview en iframe), usa el botón "Abrir Checkout" (nueva pestaña) y paga con 4242 4242 4242 4242.
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Confirmación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input placeholder="session_id" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
              <Button variant="outline" onClick={() => handleConfirm(sessionId)} disabled={!sessionId || confirming}>
                {confirming ? (<><Loader2 className="w-4 h-4 animate-spin" /> Confirmando…</>) : "Confirmar manualmente"}
              </Button>
            </div>

            {result && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Pago verificado y socio grabado
                </div>
                <pre className="text-xs text-slate-700 overflow-auto max-h-72 whitespace-pre-wrap">
{JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}