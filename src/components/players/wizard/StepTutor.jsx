import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, Download, Users, X, CheckCircle2, Lock } from "lucide-react";
import EmailInputWithTypoCheck from "@/components/ui/EmailInputWithTypoCheck";
import PrivateFileViewer from "../../utils/PrivateFileViewer";
import { logUploadButtonClick } from "../../utils/uploadLogger";
import { markCameraOpening } from "./useFormPersistence";
import PasteFromClipboard from "../../upload/PasteFromClipboard";

export default function StepTutor({
  currentPlayer,
  setCurrentPlayer,
  fieldErrors,
  setFieldErrors,
  isParent,
  isAdultPlayerSelfRegistration,
  existingFamilyPlayers,
  usePreviousTutorData,
  onLoadPreviousTutorData,
  onClearTutorData,
  uploadingDNITutor,
  onDNITutorUpload,
  uploadingDNITutorTrasero,
  onDNITutorTraseroUpload,
  dniTutorUploadFailed = false
}) {
  // Si es auto-registro +18, mostrar datos de contacto propios
  if (isAdultPlayerSelfRegistration) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" /> Tus Datos de Contacto
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className={fieldErrors.email_padre ? "text-red-600 font-bold" : ""}>Tu Correo Electrónico *</Label>
            <ValidatedInput
              validationType="email"
              type="email"
              value={currentPlayer.email_padre}
              onChange={(e) => setCurrentPlayer({ ...currentPlayer, email_padre: e.target.value, email_jugador: e.target.value })}
              disabled={true}
              className="bg-slate-100"
            />
          </div>
          <div className="space-y-2">
            <Label className={fieldErrors.telefono ? "text-red-600 font-bold" : ""}>Tu Teléfono *</Label>
            <ValidatedInput
              validationType="telefono"
              type="tel"
              value={currentPlayer.telefono}
              onChange={(e) => {
                setCurrentPlayer({ ...currentPlayer, telefono: e.target.value });
                if (fieldErrors.telefono) setFieldErrors(prev => ({ ...prev, telefono: null }));
              }}
              placeholder="600123456"
              className={fieldErrors.telefono ? "border-2 border-red-500 bg-red-50" : ""}
            />
            {fieldErrors.telefono && <p className="text-xs text-red-600">{fieldErrors.telefono}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-sm">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Datos del Tutor Legal</h3>
          <p className="text-xs text-slate-500">Padre, madre o tutor legal del jugador</p>
        </div>
      </div>

      {/* Copiar de otro hijo */}
      {existingFamilyPlayers.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-blue-900">👨‍👩‍👧‍👦 ¡Ya tienes hijos inscritos!</span>
          </div>
          {!usePreviousTutorData ? (
            <Select onValueChange={onLoadPreviousTutorData}>
              <SelectTrigger className="bg-white border-2 border-blue-300 min-h-[44px]">
                <SelectValue placeholder="📋 Copiar datos de otro hijo..." />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[9999]">
                {existingFamilyPlayers.map(p => (
                  <SelectItem key={p.id} value={p.id} className="py-3 cursor-pointer">👤 {p.nombre} - {p.deporte}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              <Alert className="bg-green-100 border-green-300">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">✅ Datos copiados. Puedes modificar cualquier campo.</AlertDescription>
              </Alert>
              <Button type="button" variant="outline" onClick={onClearTutorData} className="w-full text-red-600 border-red-300 hover:bg-red-50">
                <X className="w-4 h-4 mr-1" /> Limpiar y rellenar manualmente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Nombre tutor */}
      <div className="space-y-1.5">
        <Label className={`text-sm font-medium ${fieldErrors.nombre_tutor_legal ? "text-red-600" : "text-slate-700"}`}>Nombre y Apellidos *</Label>
        <Input
          value={currentPlayer.nombre_tutor_legal || ""}
          onChange={(e) => {
            setCurrentPlayer({ ...currentPlayer, nombre_tutor_legal: e.target.value });
            if (fieldErrors.nombre_tutor_legal) setFieldErrors(prev => ({ ...prev, nombre_tutor_legal: null }));
          }}
          placeholder="Ej: María García López"
          className={`rounded-xl h-12 text-base ${fieldErrors.nombre_tutor_legal ? "border-2 border-red-500 bg-red-50" : "border-slate-200"}`}
        />
        {fieldErrors.nombre_tutor_legal && <p className="text-xs text-red-600 mt-1">{fieldErrors.nombre_tutor_legal}</p>}
      </div>

      {/* Tipo documento tutor + DNI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Tipo de Documento</Label>
          <Select value={currentPlayer.tipo_documento_tutor || "DNI"} onValueChange={(v) => setCurrentPlayer({ ...currentPlayer, tipo_documento_tutor: v })}>
            <SelectTrigger className="min-h-[44px] rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="z-[9999]">
              <SelectItem value="DNI" className="py-3 text-base cursor-pointer">🪪 DNI</SelectItem>
              <SelectItem value="Pasaporte" className="py-3 text-base cursor-pointer">🛂 Pasaporte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className={`text-sm font-medium ${fieldErrors.dni_tutor_legal ? "text-red-600" : "text-slate-700"}`}>
            {currentPlayer.tipo_documento_tutor === "Pasaporte" ? "Pasaporte" : "DNI"} *
          </Label>
          <Input
            value={currentPlayer.dni_tutor_legal || ""}
            onChange={(e) => {
              setCurrentPlayer({ ...currentPlayer, dni_tutor_legal: e.target.value });
              if (fieldErrors.dni_tutor_legal) setFieldErrors(prev => ({ ...prev, dni_tutor_legal: null }));
            }}
            placeholder={currentPlayer.tipo_documento_tutor === "Pasaporte" ? "ABC123456" : "12345678A"}
            className={`rounded-xl h-12 text-base ${fieldErrors.dni_tutor_legal ? "border-2 border-red-500 bg-red-50" : "border-slate-200"}`}
          />
          {fieldErrors.dni_tutor_legal && <p className="text-xs text-red-600 mt-1">{fieldErrors.dni_tutor_legal}</p>}
        </div>
      </div>

      {/* Subidas DNI tutor - tarjetas compactas */}
      {(() => {
        const tutorDocLabel = currentPlayer.tipo_documento_tutor === "Pasaporte" ? "Pasaporte" : "DNI";
        const TutorDocCard = ({ label, uploaded, uploading, onUpload, inputId, error }) => (
          <div className={`rounded-2xl overflow-hidden ${error ? 'ring-2 ring-red-500' : uploaded ? 'ring-1 ring-green-300' : 'ring-1 ring-slate-200'}`}>
            <div className={`px-4 py-2.5 flex items-center justify-between ${error ? 'bg-red-50' : uploaded ? 'bg-green-50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${error ? 'bg-red-100' : uploaded ? 'bg-green-100' : 'bg-slate-200'}`}>
                  {uploaded ? <span className="text-green-600 text-xs font-bold">✓</span> : <Upload className={`w-3.5 h-3.5 ${error ? 'text-red-500' : 'text-slate-500'}`} />}
                </div>
                <span className={`text-sm font-medium ${error ? 'text-red-800' : uploaded ? 'text-green-800' : 'text-slate-700'}`}>{label}</span>
              </div>
              {uploaded && <PrivateFileViewer fileUri={uploaded} label="Ver" />}
            </div>
            <div className="p-3 bg-white">
              {error && <p className="text-xs text-red-600 mb-2">⚠️ {error}</p>}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" onChange={onUpload} className="hidden" id={inputId} style={{ display: 'none', visibility: 'hidden', position: 'absolute', width: 0, height: 0 }} />
              <Button
                type="button"
                variant={uploaded ? "outline" : "default"}
                onClick={() => { markCameraOpening(inputId); logUploadButtonClick(inputId, label); document.getElementById(inputId).click(); }}
                disabled={uploading}
                className={`w-full rounded-xl ${uploaded ? 'border-green-300 text-green-700 hover:bg-green-50' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                style={{ minHeight: '44px' }}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploaded ? "Cambiar documento" : "Subir documento"}
              </Button>
            </div>
          </div>
        );
        return (
          <>
            <TutorDocCard
              label={`${tutorDocLabel} — Cara delantera *`}
              uploaded={currentPlayer.dni_tutor_legal_url}
              uploading={uploadingDNITutor}
              onUpload={onDNITutorUpload}
              inputId="wiz-dni-tutor-upload"
              error={fieldErrors.dni_tutor_legal_url}
            />
            {currentPlayer.tipo_documento_tutor === "DNI" && (
              <TutorDocCard
                label="DNI — Cara trasera *"
                uploaded={currentPlayer.dni_tutor_legal_trasero_url}
                uploading={uploadingDNITutorTrasero}
                onUpload={onDNITutorTraseroUpload}
                inputId="wiz-dni-tutor-trasero-upload"
              />
            )}
          </>
        );
      })()}

      {/* Email y teléfono */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={`text-sm font-medium ${fieldErrors.email_padre ? "text-red-600" : "text-slate-700"}`}>Correo Electrónico *</Label>
          <ValidatedInput
            validationType="email"
            type="email"
            value={currentPlayer.email_padre}
            onChange={(e) => {
              setCurrentPlayer({ ...currentPlayer, email_padre: e.target.value });
              if (fieldErrors.email_padre) setFieldErrors(prev => ({ ...prev, email_padre: null }));
            }}
            disabled={isParent}
            className={`${isParent ? "bg-slate-100" : ""} ${fieldErrors.email_padre ? "border-2 border-red-500 bg-red-50" : ""}`}
          />
          {fieldErrors.email_padre && <p className="text-xs text-red-600">{fieldErrors.email_padre}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={`text-sm font-medium ${fieldErrors.telefono ? "text-red-600" : "text-slate-700"}`}>Teléfono *</Label>
          <ValidatedInput
            validationType="telefono"
            type="tel"
            value={currentPlayer.telefono}
            onChange={(e) => {
              setCurrentPlayer({ ...currentPlayer, telefono: e.target.value });
              if (fieldErrors.telefono) setFieldErrors(prev => ({ ...prev, telefono: null }));
            }}
            placeholder="600123456"
            className={fieldErrors.telefono ? "border-2 border-red-500 bg-red-50" : ""}
          />
          {fieldErrors.telefono && <p className="text-xs text-red-600">{fieldErrors.telefono}</p>}
        </div>
      </div>

      {/* Dirección */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={`text-sm font-medium ${fieldErrors.direccion ? "text-red-600" : "text-slate-700"}`}>Dirección Completa *</Label>
          <Input
            value={currentPlayer.direccion}
            onChange={(e) => {
              setCurrentPlayer({ ...currentPlayer, direccion: e.target.value });
              if (fieldErrors.direccion) setFieldErrors(prev => ({ ...prev, direccion: null }));
            }}
            placeholder="Calle, número, piso..."
            className={`rounded-xl h-12 text-base ${fieldErrors.direccion ? "border-2 border-red-500 bg-red-50" : "border-slate-200"}`}
          />
          {fieldErrors.direccion && <p className="text-xs text-red-600 mt-1">{fieldErrors.direccion}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={`text-sm font-medium ${fieldErrors.municipio ? "text-red-600" : "text-slate-700"}`}>Municipio *</Label>
          <Input
            value={currentPlayer.municipio || ""}
            onChange={(e) => {
              setCurrentPlayer({ ...currentPlayer, municipio: e.target.value });
              if (fieldErrors.municipio) setFieldErrors(prev => ({ ...prev, municipio: null }));
            }}
            placeholder="Escribe tu municipio"
            className={`rounded-xl h-12 text-base ${fieldErrors.municipio ? "border-2 border-red-500 bg-red-50" : "border-slate-200"}`}
          />
          {fieldErrors.municipio && <p className="text-xs text-red-600 mt-1">{fieldErrors.municipio}</p>}
        </div>
      </div>
    </div>
  );
}