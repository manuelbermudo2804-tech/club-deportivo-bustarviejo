import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, Download, Users, X, CheckCircle2, Lock } from "lucide-react";
import PrivateFileViewer from "../../utils/PrivateFileViewer";
import { logUploadButtonClick } from "../../utils/uploadLogger";

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
  onDNITutorUpload
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
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-green-900 flex items-center gap-2">
        <Users className="w-5 h-5 text-green-600" /> Datos del Padre/Madre/Tutor Legal *
      </h3>

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
      <div className="space-y-2">
        <Label className={fieldErrors.nombre_tutor_legal ? "text-red-600 font-bold" : ""}>Nombre y Apellidos *</Label>
        <Input
          value={currentPlayer.nombre_tutor_legal || ""}
          onChange={(e) => {
            setCurrentPlayer({ ...currentPlayer, nombre_tutor_legal: e.target.value });
            if (fieldErrors.nombre_tutor_legal) setFieldErrors(prev => ({ ...prev, nombre_tutor_legal: null }));
          }}
          placeholder="Ej: María García López"
          className={fieldErrors.nombre_tutor_legal ? "border-2 border-red-500 bg-red-50" : ""}
        />
        {fieldErrors.nombre_tutor_legal && <p className="text-xs text-red-600">{fieldErrors.nombre_tutor_legal}</p>}
      </div>

      {/* Tipo documento tutor + DNI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Documento</Label>
          <Select value={currentPlayer.tipo_documento_tutor || "DNI"} onValueChange={(v) => setCurrentPlayer({ ...currentPlayer, tipo_documento_tutor: v })}>
            <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="z-[9999]">
              <SelectItem value="DNI" className="py-3 text-base cursor-pointer">🪪 DNI</SelectItem>
              <SelectItem value="Pasaporte" className="py-3 text-base cursor-pointer">🛂 Pasaporte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={fieldErrors.dni_tutor_legal ? "text-red-600 font-bold" : ""}>
            {currentPlayer.tipo_documento_tutor === "Pasaporte" ? "Pasaporte" : "DNI"} *
          </Label>
          <Input
            value={currentPlayer.dni_tutor_legal || ""}
            onChange={(e) => {
              setCurrentPlayer({ ...currentPlayer, dni_tutor_legal: e.target.value });
              if (fieldErrors.dni_tutor_legal) setFieldErrors(prev => ({ ...prev, dni_tutor_legal: null }));
            }}
            placeholder={currentPlayer.tipo_documento_tutor === "Pasaporte" ? "ABC123456" : "12345678A"}
            className={fieldErrors.dni_tutor_legal ? "border-2 border-red-500 bg-red-50" : ""}
          />
          {fieldErrors.dni_tutor_legal && <p className="text-xs text-red-600">{fieldErrors.dni_tutor_legal}</p>}
        </div>
      </div>

      {/* Subir DNI tutor */}
      <div className="space-y-2">
        <Label className={fieldErrors.dni_tutor_legal_url ? "text-red-600 font-bold" : ""}>
          Subir {currentPlayer.tipo_documento_tutor === "Pasaporte" ? "Pasaporte" : "DNI"} Tutor (escaneado) *
        </Label>
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*,application/pdf" onChange={onDNITutorUpload} className="hidden" id="wiz-dni-tutor-upload" />
          <Button
            type="button"
            variant={fieldErrors.dni_tutor_legal_url ? "destructive" : "outline"}
            onClick={() => { logUploadButtonClick('wiz-dni-tutor-upload', 'dni_tutor'); document.getElementById('wiz-dni-tutor-upload').click(); }}
            disabled={uploadingDNITutor}
            className="flex-1 min-h-[44px]"
          >
            {uploadingDNITutor ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {currentPlayer.dni_tutor_legal_url ? "✓ Cambiar documento" : "Subir documento"}
          </Button>
          {currentPlayer.dni_tutor_legal_url && (
            <PrivateFileViewer fileUri={currentPlayer.dni_tutor_legal_url} label="Ver DNI Tutor" />
          )}
        </div>
        {fieldErrors.dni_tutor_legal_url && <p className="text-xs text-red-600 bg-red-100 p-2 rounded">⚠️ {fieldErrors.dni_tutor_legal_url}</p>}
      </div>

      {/* Email y teléfono */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={fieldErrors.email_padre ? "text-red-600 font-bold" : ""}>Correo Electrónico *</Label>
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
        <div className="space-y-2">
          <Label className={fieldErrors.telefono ? "text-red-600 font-bold" : ""}>Teléfono *</Label>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={fieldErrors.direccion ? "text-red-600 font-bold" : ""}>Dirección Completa *</Label>
          <Input
            value={currentPlayer.direccion}
            onChange={(e) => {
              setCurrentPlayer({ ...currentPlayer, direccion: e.target.value });
              if (fieldErrors.direccion) setFieldErrors(prev => ({ ...prev, direccion: null }));
            }}
            placeholder="Calle, número, piso..."
            className={fieldErrors.direccion ? "border-2 border-red-500 bg-red-50" : ""}
          />
          {fieldErrors.direccion && <p className="text-xs text-red-600">{fieldErrors.direccion}</p>}
        </div>
        <div className="space-y-2">
          <Label className={fieldErrors.municipio ? "text-red-600 font-bold" : ""}>Municipio *</Label>
          <Input
            value={currentPlayer.municipio || ""}
            onChange={(e) => {
              setCurrentPlayer({ ...currentPlayer, municipio: e.target.value });
              if (fieldErrors.municipio) setFieldErrors(prev => ({ ...prev, municipio: null }));
            }}
            placeholder="Bustarviejo"
            className={fieldErrors.municipio ? "border-2 border-red-500 bg-red-50" : ""}
          />
          {fieldErrors.municipio && <p className="text-xs text-red-600">{fieldErrors.municipio}</p>}
        </div>
      </div>
    </div>
  );
}