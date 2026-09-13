import React, { useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

// Selector de archivo pensado para móvil: dos botones grandes (cámara / galería)
export default function WebFilePicker({ file, onPick, pesoMb }) {
  const camaraRef = useRef(null);
  const galeriaRef = useRef(null);

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-green-200 bg-green-50 p-4">
        <ImagePlus className="w-6 h-6 text-green-700 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-600">{pesoMb.toFixed(1)} MB</p>
        </div>
        <button
          type="button"
          onClick={() => onPick(null)}
          className="rounded-full bg-white p-2 text-slate-500 shadow-sm active:scale-95"
          aria-label="Quitar archivo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <input ref={camaraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => onPick(e.target.files?.[0] || null)} />
      <input ref={galeriaRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] || null)} />

      <button
        type="button"
        onClick={() => camaraRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-3 py-6 text-orange-800 active:scale-[0.98]"
      >
        <Camera className="w-7 h-7" />
        <span className="text-sm font-bold">Hacer foto</span>
      </button>

      <button
        type="button"
        onClick={() => galeriaRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 px-3 py-6 text-green-800 active:scale-[0.98]"
      >
        <ImagePlus className="w-7 h-7" />
        <span className="text-sm font-bold">Elegir del móvil</span>
      </button>
    </div>
  );
}