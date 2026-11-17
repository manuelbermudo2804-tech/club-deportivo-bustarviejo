import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Gift } from "lucide-react";

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

      {seasonConfig?.programa_referidos_activo && isExternalUser && (
        <Alert className="bg-purple-50 border-purple-200">
          <Gift className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-purple-800 text-sm">
            Para que la invitación quede registrada, debes acceder desde el enlace personal que te han enviado. Escribir un nombre no permite validar la invitación.
          </AlertDescription>
        </Alert>
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
                Al registrar este nuevo socio desde tu cuenta, recibirás una papeleta para el sorteo cuando su pago esté confirmado 🎟️
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}