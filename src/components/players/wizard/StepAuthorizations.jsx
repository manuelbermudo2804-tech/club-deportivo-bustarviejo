import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Camera } from "lucide-react";

export default function StepAuthorizations({
  currentPlayer,
  setCurrentPlayer,
  fieldErrors,
  setFieldErrors,
  isAdultPlayerSelfRegistration,
  isEditing
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        📋 Autorizaciones y Observaciones
      </h3>

      {/* Observaciones */}
      <div className="space-y-2">
        <Label>Observaciones (opcional)</Label>
        <Textarea
          value={currentPlayer.observaciones}
          onChange={(e) => setCurrentPlayer({ ...currentPlayer, observaciones: e.target.value })}
          rows={3}
          placeholder="Cualquier nota adicional sobre el jugador..."
        />
      </div>

      {/* RGPD - solo en creación */}
      {!isEditing && (
        <>
          <div className="space-y-4 border-2 border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              <span className="font-bold text-red-900">AUTORIZACIÓN TRATAMIENTO DE DATOS *</span>
            </div>
            <div className="bg-white rounded-lg p-3 text-xs max-h-48 overflow-y-auto border text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">POLÍTICA DE PROTECCIÓN DE DATOS - CLUB DEPORTIVO BUSTARVIEJO</p>
              <p>En cumplimiento del RGPD (UE) 2016/679, le informamos que sus datos serán tratados por el CD Bustarviejo para gestión de inscripciones, comunicaciones del club y gestión administrativa y deportiva.</p>
              <p><strong>Destinatarios:</strong> Federaciones deportivas, compañías de seguros, administraciones públicas cuando sea requerido.</p>
              <p><strong>Derechos:</strong> Acceso, rectificación, supresión, limitación, portabilidad y oposición en cdbustarviejo@gmail.com</p>
            </div>
            <div className={`flex items-start gap-3 p-3 bg-white rounded-lg border-2 ${fieldErrors.acepta_politica_privacidad ? 'border-red-500 bg-red-50' : 'border-red-300'}`}>
              <Checkbox
                id="wiz-acepta"
                checked={currentPlayer.acepta_politica_privacidad}
                onCheckedChange={(c) => {
                  setCurrentPlayer({ ...currentPlayer, acepta_politica_privacidad: c });
                  if (fieldErrors.acepta_politica_privacidad) setFieldErrors(prev => ({ ...prev, acepta_politica_privacidad: null }));
                }}
              />
              <label htmlFor="wiz-acepta" className={`text-sm font-semibold cursor-pointer ${fieldErrors.acepta_politica_privacidad ? 'text-red-600' : 'text-red-900'}`}>
                ✅ HE LEÍDO Y ACEPTO LA POLÍTICA DE PRIVACIDAD
                {fieldErrors.acepta_politica_privacidad && <span className="block text-xs text-red-500 mt-1">⚠️ Debes aceptar</span>}
              </label>
            </div>
          </div>

          {/* Autorización fotografías */}
          <div className={`space-y-4 border-2 rounded-lg p-4 ${fieldErrors.autorizacion_fotografia ? 'border-red-500 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-orange-600" />
              <span className="font-bold text-orange-900">AUTORIZACIÓN FOTOGRAFÍAS Y VÍDEOS *</span>
            </div>
            {fieldErrors.autorizacion_fotografia && <p className="text-xs text-red-600 bg-red-100 p-2 rounded">⚠️ {fieldErrors.autorizacion_fotografia}</p>}
            <RadioGroup
              value={currentPlayer.autorizacion_fotografia}
              onValueChange={(v) => {
                setCurrentPlayer({ ...currentPlayer, autorizacion_fotografia: v });
                if (fieldErrors.autorizacion_fotografia) setFieldErrors(prev => ({ ...prev, autorizacion_fotografia: null }));
              }}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border-2 border-green-300 hover:bg-green-50">
                <RadioGroupItem value="SI AUTORIZO" id="wiz-foto-si" className="mt-1" />
                <Label htmlFor="wiz-foto-si" className="cursor-pointer">
                  <span className="font-bold text-green-800">✅ SÍ AUTORIZO</span>
                  <p className="text-xs text-slate-600 mt-1">
                    Autorizo la captación y publicación de {isAdultPlayerSelfRegistration ? "mis imágenes" : "imágenes de mi hijo/a"} en medios del club.
                  </p>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border-2 border-red-300 hover:bg-red-50">
                <RadioGroupItem value="NO AUTORIZO" id="wiz-foto-no" className="mt-1" />
                <Label htmlFor="wiz-foto-no" className="cursor-pointer">
                  <span className="font-bold text-red-800">❌ NO AUTORIZO</span>
                  <p className="text-xs text-slate-600 mt-1">No autorizo la captación ni publicación de imágenes.</p>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </>
      )}
    </div>
  );
}