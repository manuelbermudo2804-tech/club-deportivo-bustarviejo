import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function StepTipoInscripcion({
  formData,
  setFormData,
  wasPreviousMember,
  isExternalUser,
  invitadoPor,
  seasonConfig,
}) {
  return (
    <div className="space-y-6">
      {/* Tipo */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Tipo de Inscripción *</Label>
        <RadioGroup
          value={formData.tipo_inscripcion}
          onValueChange={(v) => setFormData({ ...formData, tipo_inscripcion: v })}
          className="space-y-2"
        >
          <div
            className={`flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 ${
              formData.tipo_inscripcion === "Nueva Inscripción"
                ? "border-green-400 ring-2 ring-green-200"
                : "border-green-200"
            } hover:border-green-400 transition-colors`}
          >
            <RadioGroupItem value="Nueva Inscripción" id="nueva" />
            <Label htmlFor="nueva" className="cursor-pointer flex-1">
              <span className="font-semibold">🆕 Nueva Inscripción</span>
              <p className="text-xs text-slate-600">Primera vez como socio del club</p>
            </Label>
          </div>
          <div
            className={`flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 ${
              formData.tipo_inscripcion === "Renovación"
                ? "border-blue-400 ring-2 ring-blue-200"
                : "border-blue-200"
            } hover:border-blue-400 transition-colors`}
          >
            <RadioGroupItem value="Renovación" id="renovacion" />
            <Label htmlFor="renovacion" className="cursor-pointer flex-1">
              <span className="font-semibold">🔄 Renovación</span>
              <p className="text-xs text-slate-600">Ya fui socio en temporadas anteriores</p>
            </Label>
            {wasPreviousMember && <Badge className="bg-blue-500 text-white text-xs">Detectado</Badge>}
          </div>
        </RadioGroup>
        {wasPreviousMember && (
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              ✅ Detectamos que <strong>{formData.email}</strong> ya fue socio anteriormente. ¡Gracias por renovar!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* ¿Es segundo progenitor? */}
      <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="segundo_progenitor"
            checked={formData.es_segundo_progenitor}
            onChange={(e) => setFormData({ ...formData, es_segundo_progenitor: e.target.checked })}
            className="mt-1 w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
          />
          <Label htmlFor="segundo_progenitor" className="cursor-pointer">
            <span className="font-semibold text-orange-900">👫 Soy el segundo progenitor de un jugador inscrito</span>
            <p className="text-xs text-orange-700 mt-1">
              Marca esta casilla si el jugador principal ya ha sido inscrito por otro tutor y quieres ser socio
            </p>
          </Label>
        </div>
      </div>

      {/* Campo de quién te invitó - SOLO para usuarios externos */}
      {seasonConfig?.programa_referidos_activo && isExternalUser && (
        <div
          className={`p-4 rounded-xl border-2 ${
            invitadoPor
              ? "bg-gradient-to-r from-green-50 to-green-100 border-green-300"
              : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <Gift className={`w-6 h-6 mt-1 flex-shrink-0 ${invitadoPor ? "text-green-600" : "text-purple-600"}`} />
            <div className="flex-1">
              {invitadoPor ? (
                <>
                  <Label className="font-semibold text-green-900 flex items-center gap-2">
                    ✅ ¡Te ha invitado {invitadoPor.full_name}!
                  </Label>
                  <p className="text-xs text-green-700 mt-1 mb-2">
                    Al registrarte, {invitadoPor.full_name} recibirá su premio automáticamente 🎉
                  </p>
                </>
              ) : (
                <>
                  <Label htmlFor="referido_por" className="font-semibold text-purple-900 flex items-center gap-2">
                    🎁 ¿Quién te ha invitado a hacerte socio?
                  </Label>
                  <p className="text-xs text-purple-700 mt-1 mb-2">
                    Si un amigo o familiar te invitó, escribe su nombre para que reciba su premio
                  </p>
                  <Input
                    id="referido_por"
                    value={formData.referido_por}
                    onChange={(e) => setFormData({ ...formData, referido_por: e.target.value })}
                    placeholder="Nombre de quien te invitó (opcional)"
                    className="bg-white"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mensaje informativo para padres con hijos */}
      {seasonConfig?.programa_referidos_activo && !isExternalUser && (
        <div className="p-4 rounded-xl border-2 bg-gradient-to-r from-green-50 to-green-100 border-green-300">
          <div className="flex items-start gap-3">
            <Gift className="w-6 h-6 mt-1 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <Label className="font-semibold text-green-900 flex items-center gap-2">
                🎁 ¡Este socio se sumará a tu programa de referidos!
              </Label>
              <p className="text-xs text-green-700 mt-1">
                Al registrar este nuevo socio desde tu panel, recibirás automáticamente tu crédito en ropa y participaciones en sorteos 🎉
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}