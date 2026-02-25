import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Download, FileText, Lock } from "lucide-react";
import PrivateFileViewer from "../../utils/PrivateFileViewer";
import { logUploadButtonClick } from "../../utils/uploadLogger";
import CameraPermissionCheck from "../../upload/CameraPermissionCheck";
import { markCameraOpening } from "./useFormPersistence";

export default function StepDocuments({
  currentPlayer,
  setCurrentPlayer,
  fieldErrors,
  setFieldErrors,
  requiresDNI,
  isAdultPlayerSelfRegistration,
  uploadingDNI,
  uploadingLibroFamilia,
  onDNIUpload,
  onLibroFamiliaUpload
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" /> Documentación del Jugador
      </h3>

      {/* CHECK PERMISOS CÁMARA/ARCHIVOS */}
      <CameraPermissionCheck />

      {/* Tipo de documento */}
      <div className="space-y-2">
        <Label>Tipo de Documento del Jugador</Label>
        <Select value={currentPlayer.tipo_documento || "DNI"} onValueChange={(v) => setCurrentPlayer({ ...currentPlayer, tipo_documento: v })}>
          <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="z-[9999]">
            <SelectItem value="DNI" className="py-3 text-base cursor-pointer">🪪 DNI</SelectItem>
            <SelectItem value="Pasaporte" className="py-3 text-base cursor-pointer">🛂 Pasaporte</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DNI/Pasaporte número */}
      <div className="space-y-2">
        <Label className={fieldErrors.dni_jugador ? "text-red-600 font-bold" : ""}>
          {currentPlayer.tipo_documento === "Pasaporte" ? "Pasaporte" : "DNI"} del Jugador {requiresDNI ? "*" : "(opcional si menor de 14)"}
        </Label>
        <Input
          id="wiz-dni"
          value={currentPlayer.dni_jugador || ""}
          onChange={(e) => {
            setCurrentPlayer({ ...currentPlayer, dni_jugador: e.target.value });
            if (fieldErrors.dni_jugador) setFieldErrors(prev => ({ ...prev, dni_jugador: null }));
          }}
          placeholder={currentPlayer.tipo_documento === "Pasaporte" ? "ABC123456" : "12345678A"}
          className={fieldErrors.dni_jugador ? "border-2 border-red-500 bg-red-50" : ""}
        />
        {fieldErrors.dni_jugador && <p className="text-xs text-red-600">{fieldErrors.dni_jugador}</p>}
      </div>

      {/* Subir DNI escaneado */}
      <div className="space-y-2">
        <Label className={fieldErrors.dni_jugador_url ? "text-red-600 font-bold" : ""}>
          Subir {currentPlayer.tipo_documento === "Pasaporte" ? "Pasaporte" : "DNI"} Jugador (escaneado) {requiresDNI ? "*" : ""}
        </Label>
        <div className="flex items-center gap-2">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" onChange={onDNIUpload} className="hidden" id="wiz-dni-upload" style={{ display: 'none', visibility: 'hidden', position: 'absolute', width: 0, height: 0 }} />
          <Button
            type="button"
            variant={fieldErrors.dni_jugador_url ? "destructive" : "outline"}
            onClick={() => { markCameraOpening('wiz-dni-upload'); logUploadButtonClick('wiz-dni-upload', 'dni_jugador'); document.getElementById('wiz-dni-upload').click(); }}
            disabled={uploadingDNI}
            className="flex-1 min-h-[44px]"
          >
            {uploadingDNI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {currentPlayer.dni_jugador_url ? "✓ Cambiar documento" : "Subir documento"}
          </Button>
          {currentPlayer.dni_jugador_url && (
            <PrivateFileViewer fileUri={currentPlayer.dni_jugador_url} label="Ver DNI" />
          )}
        </div>
        {fieldErrors.dni_jugador_url && <p className="text-xs text-red-600 bg-red-100 p-2 rounded">⚠️ {fieldErrors.dni_jugador_url}</p>}
      </div>

      {/* Libro de Familia (menores sin DNI) */}
      {!requiresDNI && !isAdultPlayerSelfRegistration && (
        <div className="space-y-2">
          <Label className={fieldErrors.libro_familia_url ? "text-red-600 font-bold" : ""}>
            Libro de Familia (si no tiene DNI) *
          </Label>
          <div className="flex items-center gap-2">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" onChange={onLibroFamiliaUpload} className="hidden" id="wiz-libro-upload" style={{ display: 'none', visibility: 'hidden', position: 'absolute', width: 0, height: 0 }} />
            <Button
              type="button"
              variant={fieldErrors.libro_familia_url ? "destructive" : "outline"}
              onClick={() => { markCameraOpening('wiz-libro-upload'); logUploadButtonClick('wiz-libro-upload', 'libro_familia'); document.getElementById('wiz-libro-upload').click(); }}
              disabled={uploadingLibroFamilia}
              className="flex-1 min-h-[44px]"
            >
              {uploadingLibroFamilia ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {currentPlayer.libro_familia_url ? "✓ Cambiar Libro" : "Subir Libro de Familia"}
            </Button>
            {currentPlayer.libro_familia_url && (
              <PrivateFileViewer fileUri={currentPlayer.libro_familia_url} label="Ver Libro" />
            )}
          </div>
          <p className="text-xs text-blue-700">Si el jugador es menor de 14 años y no tiene DNI, sube el libro de familia</p>
          {fieldErrors.libro_familia_url && <p className="text-xs text-red-600 bg-red-100 p-2 rounded">⚠️ {fieldErrors.libro_familia_url}</p>}
        </div>
      )}
    </div>
  );
}