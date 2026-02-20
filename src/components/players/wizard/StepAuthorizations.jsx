import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Camera, AlertCircle, ShieldCheck, ShieldX, Smartphone } from "lucide-react";

function useScrollToBottom(ref) {
  const [reached, setReached] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) setReached(true);
    };
    check();
    el.addEventListener("scroll", check);
    return () => el.removeEventListener("scroll", check);
  }, [ref]);
  return reached;
}

export default function StepAuthorizations({
  currentPlayer,
  setCurrentPlayer,
  fieldErrors,
  setFieldErrors,
  isAdultPlayerSelfRegistration,
  isEditing
}) {
  const privacyRef = useRef(null);
  const photoRef = useRef(null);
  const privacyScrolled = useScrollToBottom(privacyRef);
  const photoScrolled = useScrollToBottom(photoRef);

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
            <div ref={privacyRef} className="bg-white rounded-lg p-3 text-xs max-h-48 overflow-y-auto border text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">POLÍTICA DE PROTECCIÓN DE DATOS - CLUB DEPORTIVO BUSTARVIEJO</p>
              <p>En cumplimiento del RGPD (UE) 2016/679, le informamos que sus datos serán tratados por el CD Bustarviejo para gestión de inscripciones, comunicaciones del club y gestión administrativa y deportiva.</p>
              <p><strong>Destinatarios:</strong> Federaciones deportivas, compañías de seguros, administraciones públicas cuando sea requerido.</p>
              <p><strong>Derechos:</strong> Acceso, rectificación, supresión, limitación, portabilidad y oposición en cdbustarviejo@gmail.com</p>
            </div>
            {!privacyScrolled && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Desplázate hasta el final del texto para poder aceptar.</span>
              </div>
            )}
            <div className={`flex items-start gap-3 p-3 bg-white rounded-lg border-2 ${fieldErrors.acepta_politica_privacidad ? 'border-red-500 bg-red-50' : 'border-red-300'}`}>
              <Checkbox
                id="wiz-acepta"
                checked={currentPlayer.acepta_politica_privacidad}
                disabled={!privacyScrolled}
                onCheckedChange={(c) => {
                  setCurrentPlayer({ ...currentPlayer, acepta_politica_privacidad: c });
                  if (fieldErrors.acepta_politica_privacidad) setFieldErrors(prev => ({ ...prev, acepta_politica_privacidad: null }));
                }}
              />
              <label htmlFor="wiz-acepta" className={`text-sm font-semibold cursor-pointer ${!privacyScrolled ? 'text-slate-400' : fieldErrors.acepta_politica_privacidad ? 'text-red-600' : 'text-red-900'}`}>
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
            <div ref={photoRef} className="bg-white rounded-lg p-3 text-xs max-h-48 overflow-y-auto border text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">AUTORIZACIÓN DE IMAGEN - CLUB DEPORTIVO BUSTARVIEJO</p>
              <p>De conformidad con el derecho a la propia imagen recogido en la Ley Orgánica 1/1982, de 5 de mayo, y en el Reglamento (UE) 2016/679 (RGPD), el Club Deportivo Bustarviejo solicita su autorización para la captación, almacenamiento y publicación de fotografías y vídeos {isAdultPlayerSelfRegistration ? "del jugador inscrito" : "del menor inscrito"} durante entrenamientos, partidos, torneos y eventos organizados por el club.</p>
              <p><strong>Finalidad:</strong> Las imágenes podrán ser utilizadas en los canales oficiales del club, incluyendo página web, redes sociales (Instagram, Facebook, Twitter/X), materiales promocionales, prensa local y comunicaciones internas del club.</p>
              <p><strong>Difusión:</strong> Las imágenes se publicarán siempre en el contexto de la actividad deportiva del club, nunca con fines comerciales ajenos al mismo.</p>
              <p><strong>Revocación:</strong> Esta autorización puede ser revocada en cualquier momento comunicándolo por escrito a cdbustarviejo@gmail.com. La revocación no tendrá carácter retroactivo sobre las publicaciones ya realizadas.</p>
              <p><strong>Conservación:</strong> Las imágenes se conservarán mientras dure la vinculación con el club y durante un periodo razonable posterior para fines de archivo histórico.</p>
            </div>
            {!photoScrolled && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Desplázate hasta el final del texto para poder seleccionar.</span>
              </div>
            )}
            {fieldErrors.autorizacion_fotografia && <p className="text-xs text-red-600 bg-red-100 p-2 rounded">⚠️ {fieldErrors.autorizacion_fotografia}</p>}
            <RadioGroup
              value={currentPlayer.autorizacion_fotografia}
              disabled={!photoScrolled}
              onValueChange={(v) => {
                setCurrentPlayer({ ...currentPlayer, autorizacion_fotografia: v });
                if (fieldErrors.autorizacion_fotografia) setFieldErrors(prev => ({ ...prev, autorizacion_fotografia: null }));
              }}
              className="space-y-3"
            >
              <div className={`flex items-start space-x-3 p-3 bg-white rounded-lg border-2 border-green-300 ${photoScrolled ? 'hover:bg-green-50' : 'opacity-50'}`}>
                <RadioGroupItem value="SI AUTORIZO" id="wiz-foto-si" className="mt-1" disabled={!photoScrolled} />
                <Label htmlFor="wiz-foto-si" className={`cursor-pointer ${!photoScrolled ? 'text-slate-400' : ''}`}>
                  <span className={`font-bold ${photoScrolled ? 'text-green-800' : 'text-slate-400'}`}>✅ SÍ AUTORIZO</span>
                  <p className="text-xs text-slate-600 mt-1">
                    Autorizo la captación y publicación de {isAdultPlayerSelfRegistration ? "mis imágenes" : "imágenes de mi hijo/a"} en medios del club.
                  </p>
                </Label>
              </div>
              <div className={`flex items-start space-x-3 p-3 bg-white rounded-lg border-2 border-red-300 ${photoScrolled ? 'hover:bg-red-50' : 'opacity-50'}`}>
                <RadioGroupItem value="NO AUTORIZO" id="wiz-foto-no" className="mt-1" disabled={!photoScrolled} />
                <Label htmlFor="wiz-foto-no" className={`cursor-pointer ${!photoScrolled ? 'text-slate-400' : ''}`}>
                  <span className={`font-bold ${photoScrolled ? 'text-red-800' : 'text-slate-400'}`}>❌ NO AUTORIZO</span>
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