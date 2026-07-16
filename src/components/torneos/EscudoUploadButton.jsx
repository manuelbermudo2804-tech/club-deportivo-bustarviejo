import React, { useRef } from "react";
import { useImageUpload } from "@/components/utils/useImageUpload";
import { Loader2, ImagePlus, X } from "lucide-react";

// Botón compacto para subir/quitar el escudo de un equipo.
// Muestra la miniatura actual; al pulsar abre el selector de archivo.
export default function EscudoUploadButton({ value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [uploading, uploadFile] = useImageUpload();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await uploadFile(file);
    if (url) onChange(url);
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="w-7 h-7 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 hover:border-slate-400 transition-colors"
        title={value ? "Cambiar escudo" : "Subir escudo"}
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
        ) : value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {value && !uploading && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          className="text-slate-300 hover:text-red-400"
          title="Quitar escudo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}