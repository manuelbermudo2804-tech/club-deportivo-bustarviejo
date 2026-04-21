import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Camera, AlertCircle, ShieldCheck, ShieldX, Smartphone, AlertTriangle } from "lucide-react";
import EmailInputWithTypoCheck from "@/components/ui/EmailInputWithTypoCheck";
// base44 import removed - categoryConfigs now passed as prop

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
  isEditing,
  playerAge,
  categoryConfigs = []
}) {
  const privacyRef = useRef(null);
  const photoRef = useRef(null);
  const privacyScrolled = useScrollToBottom(privacyRef);
  const photoScrolled = useScrollToBottom(photoRef);

  // Detectar si la categoría es complementaria (sin competición → sin acceso juvenil)
  const isComplementaria = React.useMemo(() => {
    if (!currentPlayer.deporte) return false;
    const catConfig = categoryConfigs.find(c => c.nombre === currentPlayer.deporte);
    return catConfig?.es_actividad_complementaria === true;
  }, [currentPlayer.deporte, categoryConfigs]);

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

      {/* Responsabilidad desplazamiento - solo menores en creación */}
      {!isEditing && !isAdultPlayerSelfRegistration && (
        <div className={`space-y-4 border-2 rounded-lg p-4 ${fieldErrors.acepta_responsabilidad_desplazamiento ? 'border-red-500 bg-red-50' : currentPlayer.acepta_responsabilidad_desplazamiento ? 'border-green-300 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-amber-900">RESPONSABILIDAD DE DESPLAZAMIENTO *</span>
          </div>
          <div className="bg-white rounded-lg p-3 text-xs max-h-48 overflow-y-auto border text-slate-700 space-y-2">
            <p className="font-semibold text-slate-900">DECLARACIÓN DE RESPONSABILIDAD — CUSTODIA, DESPLAZAMIENTO Y SEGURO DE MENORES</p>
            <p className="text-[10px] text-slate-400 italic">Versión v2.0 — Abril 2026</p>

            <p className="font-semibold text-slate-900 mt-3">1. HORARIO DE LA ACTIVIDAD Y LÍMITES DE RESPONSABILIDAD DEL CLUB</p>
            <p>Cada categoría tiene un <strong>horario de entrenamiento y partido determinado</strong>, que será comunicado a las familias al inicio de la temporada y ante cualquier cambio. Los entrenadores del CD Bustarviejo son responsables de los menores <strong>única y exclusivamente durante el horario de la actividad deportiva programada</strong> de su grupo.</p>
            <p><strong>Fuera de ese horario — tanto antes del inicio como después de la finalización — los entrenadores no ejercen función de custodia ni supervisión sobre los menores.</strong> El club no se responsabiliza de ningún menor que permanezca en las instalaciones fuera de su franja horaria asignada.</p>

            <p className="font-semibold text-slate-900 mt-3">2. RECOGIDA PUNTUAL — OBLIGACIÓN DE LOS PADRES/TUTORES</p>
            <p>Los padres, madres o tutores legales tienen la <strong>obligación de recoger al menor puntualmente</strong> a la hora de finalización de su entrenamiento o partido. El campo de fútbol <strong>no es un servicio de guardería</strong>: los entrenadores no pueden quedarse custodiando menores más allá de su horario de trabajo.</p>
            <p><strong>El retraso reiterado en la recogida podrá ser comunicado a las autoridades competentes en materia de protección del menor</strong>, conforme a la Ley Orgánica 8/2021 (LOPIVI).</p>

            <p className="font-semibold text-slate-900 mt-3">3. TRANSICIÓN ENTRE GRUPOS DE ENTRENAMIENTO</p>
            <p>Los entrenamientos de distintas categorías pueden realizarse de forma consecutiva, con un intervalo de transición entre la finalización de un grupo y el inicio del siguiente. Durante este intervalo, <strong>ningún entrenador tiene la obligación de supervisar a menores de un grupo diferente al suyo</strong>.</p>
            <p>Si su hijo/a llega antes del inicio de su sesión o permanece tras la finalización, <strong>la responsabilidad recae íntegramente en los padres/tutores</strong>. El club no se hace responsable de incidencias, comportamientos o interacciones entre menores de distintas categorías y edades que puedan producirse fuera de la actividad programada de cada grupo.</p>
            <p>Los padres/tutores deben ajustar los horarios de llegada y recogida al horario exacto de la categoría de su hijo/a, <strong>evitando que los menores permanezcan en las instalaciones sin supervisión antes o después de su actividad</strong>.</p>

            <p className="font-semibold text-slate-900 mt-3">4. DESPLAZAMIENTO DE IDA Y VUELTA AL CAMPO</p>
            <p>El campo de fútbol municipal de Bustarviejo se encuentra en una zona cuyo acceso <strong>no dispone de acera peatonal</strong> en algunos tramos. El recorrido incluye tramos por <strong>arcén de carretera</strong> con tráfico rodado. En meses de invierno (octubre a marzo), la <strong>visibilidad es reducida</strong>. El club <strong>recomienda encarecidamente</strong> el uso de <strong>chaleco reflectante</strong> en esos meses.</p>
            <p>Conforme al <strong>Art. 1903 del Código Civil</strong>, la responsabilidad del desplazamiento de ida y vuelta al campo <strong>recae íntegramente en los padres, madres o tutores legales</strong>. Si el padre/madre/tutor autoriza a su hijo/a a <strong>acudir o regresar solo/a</strong>, asume toda la responsabilidad derivada de dicho desplazamiento, eximiendo al club y a sus entrenadores de cualquier incidencia fuera del horario y recinto de la actividad.</p>

            <p className="font-semibold text-slate-900 mt-3">5. COBERTURA DEL SEGURO DEPORTIVO</p>
            <p>El seguro deportivo federativo contratado por el club cubre <strong>exclusivamente los accidentes que se produzcan durante la actividad deportiva programada</strong> (entrenamientos y partidos oficiales) y en el recinto donde esta se desarrolle.</p>
            <p><strong>Cualquier incidente fuera del horario de la actividad o fuera de las instalaciones deportivas NO está cubierto por el seguro del club.</strong> Esto incluye, sin limitación: el trayecto de ida y vuelta, el tiempo de espera antes o después de la actividad, la permanencia en las instalaciones fuera del horario establecido, y cualquier incidencia durante los intervalos de transición entre grupos.</p>
          </div>
          <div className={`flex items-start gap-3 p-3 bg-white rounded-lg border-2 ${fieldErrors.acepta_responsabilidad_desplazamiento ? 'border-red-500' : currentPlayer.acepta_responsabilidad_desplazamiento ? 'border-green-400' : 'border-amber-300'}`}>
            <Checkbox
              id="wiz-desplazamiento"
              checked={currentPlayer.acepta_responsabilidad_desplazamiento === true}
              onCheckedChange={(c) => {
                setCurrentPlayer({ ...currentPlayer, acepta_responsabilidad_desplazamiento: c });
                if (fieldErrors.acepta_responsabilidad_desplazamiento) setFieldErrors(prev => ({ ...prev, acepta_responsabilidad_desplazamiento: null }));
              }}
            />
            <label htmlFor="wiz-desplazamiento" className={`text-sm font-semibold cursor-pointer ${fieldErrors.acepta_responsabilidad_desplazamiento ? 'text-red-600' : 'text-amber-900'}`}>
              ✅ DECLARO que he sido informado/a de: (1) los horarios de actividad y límites de responsabilidad del club, (2) la obligación de recogida puntual, (3) las condiciones durante la transición entre grupos de entrenamiento, (4) las condiciones de desplazamiento al campo, y (5) la cobertura del seguro deportivo. ACEPTO la plena responsabilidad sobre la custodia y el desplazamiento de mi hijo/a fuera del horario de la actividad deportiva programada de su categoría.
              {fieldErrors.acepta_responsabilidad_desplazamiento && <span className="block text-xs text-red-500 mt-1">⚠️ Debes aceptar esta declaración</span>}
            </label>
          </div>
        </div>
      )}

      {/* Acceso juvenil - solo menores 13-17 en creación Y categoría competitiva */}
      {!isEditing && !isAdultPlayerSelfRegistration && playerAge >= 13 && playerAge < 18 && !isComplementaria && (
        <div className="space-y-4 border-2 border-teal-200 rounded-lg p-4 bg-teal-50">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-teal-600" />
            <span className="font-bold text-teal-900">⚽ ACCESO JUVENIL A LA APP (Opcional)</span>
          </div>
          
          <p className="text-sm text-teal-800">
            Tu hijo/a tiene <strong>{playerAge} años</strong> y puede tener su propia cuenta en la app del club para ver convocatorias, clasificaciones, calendario, etc.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="font-semibold text-green-800 text-xs mb-2 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Podrá:
              </p>
              <ul className="text-xs text-green-700 space-y-1">
                <li>✅ Ver y confirmar convocatorias</li>
                <li>✅ Ver calendario y horarios</li>
                <li>✅ Ver clasificaciones y resultados</li>
                <li>✅ Leer anuncios del club</li>
                <li>✅ Ver la galería de fotos</li>
                <li>✅ Confirmar asistencia a eventos</li>
                <li>✅ Responder encuestas</li>
              </ul>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="font-semibold text-red-800 text-xs mb-2 flex items-center gap-1">
                <ShieldX className="w-4 h-4" /> No podrá:
              </p>
              <ul className="text-xs text-red-700 space-y-1">
                <li>❌ Chats con entrenadores/familias</li>
                <li>❌ Pagos ni datos financieros</li>
                <li>❌ Firmas de federación</li>
                <li>❌ Editar datos personales</li>
                <li>❌ Tienda, pedidos o lotería</li>
                <li>❌ Documentos oficiales</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 border-teal-300">
            <Checkbox
              id="wiz-acceso-menor"
              checked={currentPlayer.acceso_menor_autorizado === true}
              onCheckedChange={(c) => {
                setCurrentPlayer({
                  ...currentPlayer,
                  acceso_menor_autorizado: c,
                  acceso_menor_email: c ? currentPlayer.acceso_menor_email : "",
                });
              }}
            />
            <label htmlFor="wiz-acceso-menor" className="text-sm font-semibold text-teal-900 cursor-pointer">
              Sí, quiero activar el acceso juvenil para mi hijo/a
            </label>
          </div>

          {currentPlayer.acceso_menor_autorizado && (
            <div className="space-y-3 pl-2">
              {/* Qué pasará ahora - misma info que MinorAccessDialog */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2 text-sm">
                  🕐 ¿Qué pasará al activarlo?
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                    <p className="text-xs text-orange-900">Nos facilitas el <strong>email de tu hijo/a</strong> aquí abajo</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                    <p className="text-xs text-orange-900">Se le envía <strong>automáticamente un email</strong> con un código de acceso</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                    <p className="text-xs text-orange-900">Tu hijo/a se registra con el código y <strong>accede a su panel juvenil</strong></p>
                  </div>
                </div>
              </div>

              <div>
                <Label className={fieldErrors.acceso_menor_email ? "text-red-600 font-bold" : ""}>
                  Email de tu hijo/a *
                </Label>
                <EmailInputWithTypoCheck
                  placeholder="email.de.tu.hijo@gmail.com"
                  value={currentPlayer.acceso_menor_email || ""}
                  onChange={(e) => {
                    setCurrentPlayer({ ...currentPlayer, acceso_menor_email: e.target.value });
                    if (fieldErrors.acceso_menor_email) setFieldErrors(prev => ({ ...prev, acceso_menor_email: null }));
                  }}
                  className={fieldErrors.acceso_menor_email ? "border-2 border-red-500 bg-red-50" : ""}
                />
                {fieldErrors.acceso_menor_email && <p className="text-xs text-red-600">⚠️ {fieldErrors.acceso_menor_email}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  Se enviará automáticamente un código de acceso a este email.
                </p>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800 text-xs">
                  💡 <strong>Importante:</strong> Tú seguirás teniendo acceso completo y podrás desactivar el acceso de tu hijo/a en cualquier momento desde la ficha del jugador.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      )}
    </div>
  );
}