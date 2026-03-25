import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function StepPago({
  formData,
  setFormData,
  seasonConfig,
  cuotaSocio,
  isIframe,
}) {
  const [tipoPago, setTipoPago] = useState("unico");
  const [loading, setLoading] = useState(false);

  const handleStripeCheckout = async () => {
    if (isIframe) {
      toast.error("El pago solo funciona desde la app publicada.");
      return;
    }
    if (!formData.nombre_completo || !formData.email) {
      toast.error("Faltan datos obligatorios (nombre y email).");
      return;
    }
    setLoading(true);
    try {
      const baseUrl = window.location.href.split('?')[0].split('#')[0];
      const { data } = await base44.functions.invoke('publicMemberCheckout', {
        nombre_completo: formData.nombre_completo,
        dni: formData.dni || '',
        telefono: formData.telefono || '',
        email: formData.email,
        direccion: formData.direccion || '',
        municipio: formData.municipio || '',
        fecha_nacimiento: formData.fecha_nacimiento || '',
        tipo_pago: tipoPago === 'suscripcion' ? 'suscripcion' : 'unico',
        referido_por: formData.referido_por || '',
        es_segundo_progenitor: formData.es_segundo_progenitor || false,
        success_url: `${baseUrl}?paid=stripe&membership_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}?canceled=socio`,
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.error || "Error al crear la sesión de pago");
      }
    } catch (err) {
      console.error("Stripe checkout error:", err);
      const rawMsg = err?.response?.data?.error || err?.message || '';
      let userMsg = 'Error al conectar con el sistema de pago.';
      if (rawMsg.includes('network') || rawMsg.includes('Network') || rawMsg.includes('Failed to fetch')) {
        userMsg = 'Error de conexión. Comprueba tu conexión a internet e inténtalo de nuevo.';
      } else if (rawMsg.includes('timeout') || rawMsg.includes('Timeout')) {
        userMsg = 'La conexión tardó demasiado. Inténtalo de nuevo en unos segundos.';
      } else if (rawMsg.includes('500') || rawMsg.includes('Internal')) {
        userMsg = 'Error temporal del servidor de pagos. Espera unos segundos e inténtalo de nuevo.';
      } else if (rawMsg) {
        userMsg = `Error en el pago: ${rawMsg}`;
      }
      toast.error(userMsg, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 border-2 border-green-300 rounded-xl p-6 bg-gradient-to-br from-green-50 to-green-100">
      <h3 className="font-bold text-green-900 flex items-center gap-2 text-lg">
        <CreditCard className="w-6 h-6" />
        Pago con tarjeta: {seasonConfig?.precio_socio || cuotaSocio}€
      </h3>

      <div className="space-y-3">
        <Label className="font-semibold">¿Cómo quieres pagar la cuota?</Label>
        <RadioGroup
          value={tipoPago}
          onValueChange={setTipoPago}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-400 transition-colors">
            <RadioGroupItem value="unico" id="pago-unico" />
            <Label htmlFor="pago-unico" className="cursor-pointer flex-1">
              <span className="font-semibold">💰 Pago solo este año ({seasonConfig?.precio_socio || cuotaSocio}€)</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-colors relative">
            <RadioGroupItem value="suscripcion" id="pago-suscripcion" />
            <Label htmlFor="pago-suscripcion" className="cursor-pointer flex-1">
              <span className="font-semibold">🔄 Renovación automática anual</span>
              <span className="block text-xs text-slate-500 mt-0.5">Se cobra automáticamente cada año. Puedes cancelar cuando quieras.</span>
            </Label>
            <span className="absolute -top-2 right-3 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">Recomendado</span>
          </div>
        </RadioGroup>
      </div>

      <Button
        type="button"
        onClick={handleStripeCheckout}
        disabled={loading || isIframe}
        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-6 text-lg rounded-xl shadow-lg"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Conectando con Stripe...</>
        ) : (
          <>💳 Continuar al pago</>
        )}
      </Button>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
        <p className="text-xs text-blue-900 font-semibold mb-1">💡 Pago seguro con Stripe</p>
        <p className="text-xs text-blue-800">
          No necesitas subir justificante. El pago se procesa automáticamente y tu membresía se activa al instante.
        </p>
      </div>

      {/* Aviso de Protección de Datos */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-800">🔒 Protección de Datos:</strong> Al continuar, consientes el
          tratamiento de tus datos personales por parte del CD Bustarviejo para gestionar tu membresía.
          Tus datos serán tratados de forma confidencial conforme al RGPD. Puedes ejercer tus derechos
          enviando un email a{" "}
          <a href="mailto:info@cdbustarviejo.com" className="text-orange-600 underline">
            info@cdbustarviejo.com
          </a>.
        </p>
      </div>
    </div>
  );
}