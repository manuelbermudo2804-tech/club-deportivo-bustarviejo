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
  onPhotoUpload,
  photoUploadFailed = false
}) {
  return (
    <div className="space-y-5">


      {/* FOTO TIPO CARNET */}
      <div className={`rounded-2xl overflow-hidden ${fieldErrors.foto_url ? 'ring-2 ring-red-500' : 'ring-1 ring-slate-200'}`}>
        <div className={`px-4 py-3 ${fieldErrors.foto_url ? 'bg-red-50' : 'bg-gradient-to-r from-orange-50 to-amber-50'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${fieldErrors.foto_url ? 'bg-red-100' : 'bg-orange-100'}`}>
              <Camera className={`w-4 h-4 ${fieldErrors.foto_url ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className={`font-semibold text-sm ${fieldErrors.foto_url ? 'text-red-900' : 'text-slate-900'}`}>Foto Tipo Carnet *</p>
              <p className="text-xs text-slate-500">De frente, fondo claro</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-white">
          {fieldErrors.foto_url && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700 font-medium">⚠️ {fieldErrors.foto_url}</p>
            </div>
          )}

          {/* Foto centrada arriba */}
          <div className="flex justify-center mb-4">
            {currentPlayer.foto_url ? (
              <div className="relative">
                <img src={currentPlayer.foto_url} alt="Foto carnet" className="w-28 h-36 object-cover rounded-xl border-2 border-green-400 shadow-md" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>
            ) : (
              <div className="w-28 h-36 bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                <Camera className="w-7 h-7 mb-1" />
                <span className="text-[11px]">Sin foto</span>
              </div>
            )}
          </div>

          <input type="file" accept="image/*" onChange={onPhotoUpload} className="hidden" id="wiz-photo-main" style={{ display: 'none', visibility: 'hidden', position: 'absolute', width: 0, height: 0 }} />

          <Button
            type="button"
            variant="default"
            className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 font-semibold rounded-xl text-sm"
            style={{ minHeight: '52px', WebkitAppearance: 'none' }}
            disabled={uploadingPhoto}
            onClick={() => document.getElementById('wiz-photo-main').click()}
          >
            {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
            {currentPlayer.foto_url ? 'Cambiar foto' : '📷 Seleccionar Foto'}
          </Button>

          {currentPlayer.foto_url && (
            <p className="text-xs text-green-700 font-medium text-center mt-2">✅ Foto guardada correctamente</p>
          )}


          

        </div>
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <Label htmlFor="wiz-nombre" className={`text-sm font-medium ${fieldErrors.nombre ? "text-red-600" : "text-slate-700"}`}>
          Nombre y Apellidos *
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
          className={`rounded-xl h-12 text-base ${fieldErrors.nombre ? "border-2 border-red-500 bg-red-50" : "border-slate-200"}`}
        />
        {fieldErrors.nombre && <p className="text-xs text-red-600 mt-1">{fieldErrors.nombre}</p>}
      </div>

      {/* Fecha de nacimiento */}
      <div className="space-y-1.5">
        <Label htmlFor="wiz-fecha" className={`text-sm font-medium ${fieldErrors.fecha_nacimiento ? "text-red-600" : "text-slate-700"}`}>
          Fecha de Nacimiento *
        </Label>
        <Input
          id="wiz-fecha"
          type="date"
          value={currentPlayer.fecha_nacimiento}
          onChange={(e) => {
            setCurrentPlayer({ ...currentPlayer, fecha_nacimiento: e.target.value });
            if (fieldErrors.fecha_nacimiento) setFieldErrors(prev => ({ ...prev, fecha_nacimiento: null }));
          }}
          className={`rounded-xl h-12 text-base ${fieldErrors.fecha_nacimiento ? "border-2 border-red-500 bg-red-50" : "border-slate-200"}`}
        />
        {fieldErrors.fecha_nacimiento && <p className="text-xs text-red-600 mt-1">{fieldErrors.fecha_nacimiento}</p>}
        {playerAge !== null && (
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isMayorDeEdad ? 'bg-purple-100 text-purple-800' : requiresDNI ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
              {playerAge} años {isMayorDeEdad ? "· Mayor de edad" : requiresDNI ? "· Requiere DNI" : "· Menor de 14"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}