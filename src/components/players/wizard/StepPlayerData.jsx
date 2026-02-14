import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StepPlayerData({
  currentPlayer,
  setCurrentPlayer,
  fieldErrors,
  setFieldErrors,
  playerAge,
  isMayorDeEdad,
  requiresDNI,
  uploadingPhoto,
  onPhotoUpload
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        👤 Datos del Jugador
      </h3>

      {/* FOTO TIPO CARNET */}
      <div className={`space-y-4 border-2 rounded-lg p-4 ${fieldErrors.foto_url ? 'border-red-500 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
        <div className="flex items-center gap-2">
          <Camera className={`w-5 h-5 ${fieldErrors.foto_url ? 'text-red-600' : 'text-orange-600'}`} />
          <span className={`font-bold ${fieldErrors.foto_url ? 'text-red-900' : 'text-orange-900'}`}>
            Foto Tipo Carnet * {fieldErrors.foto_url && <span className="text-red-500 text-xs ml-1">⚠️</span>}
          </span>
        </div>
        {fieldErrors.foto_url && <p className="text-xs text-red-600 font-medium bg-red-100 p-2 rounded">⚠️ {fieldErrors.foto_url}</p>}

        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            {currentPlayer.foto_url ? (
              <img src={currentPlayer.foto_url} alt="Foto carnet" className="w-28 h-36 object-cover border-4 border-orange-300 shadow-lg rounded-lg" />
            ) : (
              <div className="w-28 h-36 bg-slate-200 flex items-center justify-center text-slate-500 border-4 border-dashed border-orange-300 rounded-lg">
                <Camera className="w-8 h-8" />
              </div>
            )}
          </div>

          <input type="file" accept="image/*" capture="environment" onChange={onPhotoUpload} className="hidden" id="wiz-photo-camera" />
          <input type="file" accept="image/*" onChange={onPhotoUpload} className="hidden" id="wiz-photo-gallery" />

          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button type="button" variant="default" className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={uploadingPhoto} onClick={() => document.getElementById('wiz-photo-camera').click()}>
              {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
              📸 Hacer Foto
            </Button>
            <Button type="button" variant="outline" className="flex-1" disabled={uploadingPhoto} onClick={() => document.getElementById('wiz-photo-gallery').click()}>
              {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Subir desde galería
            </Button>
          </div>
          <p className="text-xs text-orange-700 text-center">Foto tipo carnet de frente, fondo claro</p>
        </div>
      </div>

      {/* Nombre */}
      <div className="space-y-2">
        <Label htmlFor="wiz-nombre" className={fieldErrors.nombre ? "text-red-600 font-bold" : ""}>
          Nombre y Apellidos del Jugador * {fieldErrors.nombre && <span className="text-red-500 text-xs">⚠️</span>}
        </Label>
        <Input
          id="wiz-nombre"
          name="name"
          autoComplete="name"
          value={currentPlayer.nombre}
          onChange={(e) => {
            setCurrentPlayer({ ...currentPlayer, nombre: e.target.value });
            if (fieldErrors.nombre) setFieldErrors(prev => ({ ...prev, nombre: null }));
          }}
          placeholder="Ej: Juan García López"
          className={fieldErrors.nombre ? "border-2 border-red-500 bg-red-50" : ""}
        />
        {fieldErrors.nombre && <p className="text-xs text-red-600">{fieldErrors.nombre}</p>}
      </div>

      {/* Fecha de nacimiento */}
      <div className="space-y-2">
        <Label htmlFor="wiz-fecha" className={fieldErrors.fecha_nacimiento ? "text-red-600 font-bold" : ""}>
          Fecha de Nacimiento * {fieldErrors.fecha_nacimiento && <span className="text-red-500 text-xs">⚠️</span>}
        </Label>
        <Input
          id="wiz-fecha"
          type="date"
          value={currentPlayer.fecha_nacimiento}
          onChange={(e) => {
            setCurrentPlayer({ ...currentPlayer, fecha_nacimiento: e.target.value });
            if (fieldErrors.fecha_nacimiento) setFieldErrors(prev => ({ ...prev, fecha_nacimiento: null }));
          }}
          className={fieldErrors.fecha_nacimiento ? "border-2 border-red-500 bg-red-50" : ""}
        />
        {fieldErrors.fecha_nacimiento && <p className="text-xs text-red-600">{fieldErrors.fecha_nacimiento}</p>}
        {playerAge !== null && (
          <p className="text-xs text-slate-600">
            Edad: <strong>{playerAge} años</strong> {isMayorDeEdad ? "(Mayor de edad)" : requiresDNI ? "(Requiere DNI)" : "(Menor de 14)"}
          </p>
        )}
      </div>
    </div>
  );
}