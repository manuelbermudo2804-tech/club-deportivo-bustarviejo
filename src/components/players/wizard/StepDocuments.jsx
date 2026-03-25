import React from "react";
import { Label } from "@/components/ui/label";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Download, FileText, Lock } from "lucide-react";
import PrivateFileViewer from "../../utils/PrivateFileViewer";
import { logUploadButtonClick } from "../../utils/uploadLogger";
import CameraPermissionCheck from "../../upload/CameraPermissionCheck";
import { markCameraOpening } from "./useFormPersistence";
import PasteFromClipboard from "../../upload/PasteFromClipboard";

export default function StepDocuments({
  currentPlayer,
  setCurrentPlayer,
  fieldErrors,
  setFieldErrors,
  requiresDNI,
  isAdultPlayerSelfRegistration,
  uploadingDNI,
  uploadingDNITrasero,
  uploadingLibroFamilia,
  onDNIUpload,
  onDNITraseroUpload,
  onLibroFamiliaUpload,
  dniUploadFailed = false,
  libroUploadFailed = false
}) {
  const docLabel = currentPlayer.tipo_documento === "Pasaporte" ? "Pasaporte" : "DNI";

  const DocumentUploadCard = ({ label, uploaded, uploading, onUpload, inputId, error, children }) => (
    <div className={`rounded-2xl overflow-hidden ${error ? 'ring-2 ring-red-500' : uploaded ? 'ring-1 ring-green-300' : 'ring-1 ring-slate-200'}`}>
      <div className={`px-4 py-2.5 flex items-center justify-between ${error ? 'bg-red-50' : uploaded ? 'bg-green-50' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${error ? 'bg-red-100' : uploaded ? 'bg-green-100' : 'bg-slate-200'}`}>
            {uploaded ? <span className="text-green-600 text-xs font-bold">✓</span> : <FileText className={`w-3.5 h-3.5 ${error ? 'text-red-500' : 'text-slate-500'}`} />}
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
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <CameraPermissionCheck />

      {/* Tipo de documento */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Tipo de Documento</Label>
        <Select value={currentPlayer.tipo_documento || "DNI"} onValueChange={(v) => setCurrentPlayer({ ...currentPlayer, tipo_documento: v })}>
          <SelectTrigger className="min-h-[44px] rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="z-[9999]">
            <SelectItem value="DNI" className="py-3 text-base cursor-pointer">🪪 DNI</SelectItem>
            <SelectItem value="Pasaporte" className="py-3 text-base cursor-pointer">🛂 Pasaporte</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Número de documento */}
      <div className="space-y-1.5">
        <Label className={`text-sm font-medium ${fieldErrors.dni_jugador ? "text-red-600" : "text-slate-700"}`}>
          Número de {docLabel} {requiresDNI ? "*" : "(opcional)"}
        </Label>
        <ValidatedInput
        id="wiz-dni"
        validationType="dni"
        value={currentPlayer.dni_jugador || ""}
        onChange={(e) => {
          setCurrentPlayer({ ...currentPlayer, dni_jugador: e.target.value });
          if (fieldErrors.dni_jugador) setFieldErrors(prev => ({ ...prev, dni_jugador: null }));
        }}
        placeholder={currentPlayer.tipo_documento === "Pasaporte" ? "ABC123456" : "12345678A"}
        className={`rounded-xl h-12 text-base ${fieldErrors.dni_jugador ? "border-2 border-red-500 bg-red-50" : "border-slate-200"}`}
        />
        {fieldErrors.dni_jugador && <p className="text-xs text-red-600 mt-1">{fieldErrors.dni_jugador}</p>}
      </div>

      {/* Cara delantera */}
      <DocumentUploadCard
        label={`${docLabel} — Cara delantera ${requiresDNI ? "*" : ""}`}
        uploaded={currentPlayer.dni_jugador_url}
        uploading={uploadingDNI}
        onUpload={onDNIUpload}
        inputId="wiz-dni-upload"
        error={fieldErrors.dni_jugador_url}
      >
        {!currentPlayer.dni_jugador_url && dniUploadFailed && (
          <div className="mt-2">
            <PasteFromClipboard label="cara delantera" disabled={uploadingDNI} onUploadComplete={(url) => {
              setCurrentPlayer(prev => ({ ...prev, dni_jugador_url: url }));
              if (fieldErrors.dni_jugador_url) setFieldErrors(prev => ({ ...prev, dni_jugador_url: null }));
            }} />
          </div>
        )}
      </DocumentUploadCard>

      {/* Cara trasera (solo DNI) */}
      {currentPlayer.tipo_documento === "DNI" && (
        <DocumentUploadCard
          label={`DNI — Cara trasera ${requiresDNI ? "*" : "(recomendado)"}`}
          uploaded={currentPlayer.dni_jugador_trasero_url}
          uploading={uploadingDNITrasero}
          onUpload={onDNITraseroUpload}
          inputId="wiz-dni-trasero-upload"
          error={fieldErrors.dni_jugador_trasero_url}
        />
      )}

      {/* Libro de Familia (menores sin DNI) */}
      {!requiresDNI && !isAdultPlayerSelfRegistration && (
        <DocumentUploadCard
          label="Libro de Familia *"
          uploaded={currentPlayer.libro_familia_url}
          uploading={uploadingLibroFamilia}
          onUpload={onLibroFamiliaUpload}
          inputId="wiz-libro-upload"
          error={fieldErrors.libro_familia_url}
        >
          <p className="text-xs text-slate-500 mt-2">📌 Solo la página donde aparece el jugador</p>
          {!currentPlayer.libro_familia_url && libroUploadFailed && (
            <div className="mt-2">
              <PasteFromClipboard label="libro de familia" disabled={uploadingLibroFamilia} onUploadComplete={(url) => {
                setCurrentPlayer(prev => ({ ...prev, libro_familia_url: url }));
                if (fieldErrors.libro_familia_url) setFieldErrors(prev => ({ ...prev, libro_familia_url: null }));
              }} />
            </div>
          )}
        </DocumentUploadCard>
      )}

      <p className="text-xs text-slate-400 text-center">💡 Si no ves la vista previa del documento, no te preocupes — está guardado</p>
    </div>
  );
}