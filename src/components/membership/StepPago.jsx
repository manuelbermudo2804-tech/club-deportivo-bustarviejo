import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StepPago({
  formData,
  setFormData,
  seasonConfig,
  cuotaSocio,
  uploadingJustificante,
  onJustificanteUpload,
  isIframe,
}) {
  return (
    <div className="space-y-4 border-2 border-green-300 rounded-xl p-6 bg-gradient-to-br from-green-50 to-green-100">
      <h3 className="font-bold text-green-900 flex items-center gap-2 text-lg">
        <CreditCard className="w-6 h-6" />
        Pago: {seasonConfig?.precio_socio || cuotaSocio}€
      </h3>

      <div className="space-y-3">
        <Label className="font-semibold">Método de Pago *</Label>
        <RadioGroup
          value={formData.metodo_pago}
          onValueChange={(v) => setFormData({ ...formData, metodo_pago: v })}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-400 transition-colors">
            <RadioGroupItem value="Transferencia" id="transferencia" />
            <Label htmlFor="transferencia" className="cursor-pointer flex-1">
              <span className="font-semibold">🏦 Transferencia Bancaria</span>
            </Label>
          </div>
          {seasonConfig?.bizum_activo && (
            <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-400 transition-colors">
              <RadioGroupItem value="Bizum" id="bizum" />
              <Label htmlFor="bizum" className="cursor-pointer flex-1">
                <span className="font-semibold">📱 Bizum</span>
              </Label>
            </div>
          )}
          <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-400 transition-colors">
            <RadioGroupItem value="Tarjeta" id="tarjeta" />
            <Label htmlFor="tarjeta" className="cursor-pointer flex-1">
              <span className="font-semibold">💳 Tarjeta (Stripe)</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {formData.metodo_pago === "Transferencia" && (
        <div className="bg-white rounded-xl p-4 border-2 border-green-200">
          <p className="text-sm text-slate-700 mb-2 font-semibold">📋 Datos bancarios:</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <p className="text-sm font-mono bg-slate-100 p-2 rounded w-full sm:flex-1 overflow-x-auto whitespace-nowrap">
              ES8200494447382010004048
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText("ES8200494447382010004048");
                toast.success("IBAN copiado al portapapeles");
              }}
              className="self-end sm:self-auto sm:flex-shrink-0"
            >
              📋 Copiar
            </Button>
          </div>
          <p className="text-sm text-slate-600 mt-3">
            <strong>Concepto:</strong> SOCIO - {formData.nombre_completo || "Tu nombre"}
          </p>
        </div>
      )}

      {formData.metodo_pago === "Bizum" && seasonConfig?.bizum_telefono && (
        <div className="bg-white rounded-xl p-4 border-2 border-green-200">
          <p className="text-sm text-slate-700 mb-2 font-semibold">📱 Bizum al teléfono:</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-green-600 flex-1">{seasonConfig.bizum_telefono}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(seasonConfig.bizum_telefono);
                toast.success("Teléfono copiado al portapapeles");
              }}
              className="flex-shrink-0"
            >
              📋 Copiar
            </Button>
          </div>
          <p className="text-sm text-slate-600 mt-3">
            <strong>Concepto:</strong> SOCIO - {formData.nombre_completo || "Tu nombre"}
          </p>
        </div>
      )}

      {formData.metodo_pago === "Tarjeta" && (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 sm:p-8 border-2 border-orange-200">
          <div className="space-y-6">
            <div>
              <p className="text-base sm:text-lg text-slate-800 font-bold">💳 Elige tu forma de pago:</p>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 sm:mt-3">Selecciona la opción que mejor se adapte a ti</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-5">
              <button
                type="button"
                onClick={() => {
                  if (isIframe) {
                    toast.error("El pago solo funciona desde la app publicada.");
                    return;
                  }
                  window.open("https://buy.stripe.com/28E6oH3Ys3yBaKEdGrfrW00", "_blank");
                }}
                disabled={isIframe}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-bold py-6 sm:py-8 text-sm sm:text-base h-auto rounded-xl transition-all hover:shadow-lg disabled:shadow-none px-3 sm:px-4"
              >
                <div className="text-center w-full py-1 sm:py-2">
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">💰</div>
                  <span className="block font-bold leading-tight">Pago Único</span>
                  <span className="block text-xs font-normal opacity-90 mt-1">Paga una sola vez</span>
                  <span className="block text-lg sm:text-xl font-bold mt-2 sm:mt-3">25€</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isIframe) {
                    toast.error("El pago solo funciona desde la app publicada.");
                    return;
                  }
                  window.open("https://buy.stripe.com/aFaaEX1Qk4CF7yseKvfrW01", "_blank");
                }}
                disabled={isIframe}
                className="relative w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 disabled:from-slate-400 disabled:via-slate-500 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-bold py-6 sm:py-8 text-sm sm:text-base h-auto ring-2 ring-purple-300 ring-offset-3 shadow-xl hover:shadow-2xl disabled:shadow-none transition-all hover:scale-[1.02] disabled:scale-100 rounded-xl overflow-hidden px-3 sm:px-4"
              >
                <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold shadow-lg z-10">
                  ⭐ MÁS RECOMENDADO
                </div>
                <div className="text-center w-full py-1 sm:py-2 mt-3 sm:mt-1">
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🔄</div>
                  <span className="block font-bold leading-tight">Suscripción Automática</span>
                  <span className="block text-xs font-normal opacity-90 mt-1">Renovación automática cada año</span>
                  <span className="block text-lg sm:text-xl font-bold mt-2 sm:mt-3">25€/año</span>
                  <span className="block text-xs opacity-75 mt-1">✓ Conveniente</span>
                </div>
              </button>
            </div>

            <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl p-3 sm:p-5 border-2 border-blue-200">
              <p className="text-xs sm:text-sm text-blue-900 font-semibold mb-2">💡 Sin papeleos ni complicaciones</p>
              <p className="text-xs sm:text-sm text-blue-800">
                No necesitas subir justificante. Todo se gestiona automáticamente a través de Stripe.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subir justificante */}
      <div className="space-y-2">
        <Label className="font-semibold">Subir Justificante de Pago *</Label>
        <p className="text-xs text-slate-600">Obligatorio solo para Transferencia/Bizum. Si eliges Tarjeta no hace falta.</p>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onJustificanteUpload}
            className="hidden"
            id="justificante-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("justificante-upload").click()}
            disabled={uploadingJustificante || formData.metodo_pago === "Tarjeta"}
            className="flex-1"
          >
            {uploadingJustificante ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {formData.justificante_url ? "✅ Cambiar justificante" : "Subir justificante"}
          </Button>
          {formData.justificante_url && (
            <a href={formData.justificante_url} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Aviso de Protección de Datos */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-800">🔒 Protección de Datos:</strong> Al enviar este formulario, consientes el
          tratamiento de tus datos personales por parte del CD Bustarviejo con la finalidad de gestionar tu membresía como
          socio del club. Tus datos serán tratados de forma confidencial conforme al RGPD. Puedes ejercer tus derechos
          enviando un email a{" "}
          <a href="mailto:cdbustarviejo@gmail.com" className="text-orange-600 underline">
            cdbustarviejo@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}