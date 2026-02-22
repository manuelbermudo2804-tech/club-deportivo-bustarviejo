import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X } from "lucide-react";

export default function DropzoneWithPreview({ id, accept = "image/*", preview, onFile, onClear, onPaste }) {
  const inputRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [dimensions, setDimensions] = useState(null);

  useEffect(() => {
    if (!preview) { setDimensions(null); return; }
    const img = new Image();
    img.onload = () => setDimensions({ w: img.width, h: img.height });
    img.src = preview;
  }, [preview]);

  const quality = (() => {
    if (!dimensions) return null;
    const { w, h } = dimensions;
    const px = w * h;
    if (px >= 1200 * 900) return { label: "Alta", color: "text-green-700" };
    if (px >= 900 * 600) return { label: "Media", color: "text-yellow-700" };
    return { label: "Baja", color: "text-red-700" };
  })();

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${hover ? 'border-orange-500' : 'border-slate-300'}`}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault(); setHover(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile?.(file);
      }}
      onPaste={onPaste}
      tabIndex={0}
      role="button"
      aria-label="Subir imagen"
    >
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept === "image/*" ? "image/jpeg,image/png,image/webp,image/heic,image/heif" : accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile?.(file);
          // Reset input to allow re-selecting the same file
          if (inputRef.current) inputRef.current.value = '';
        }}
        className="hidden"
      />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Previsualización" className="max-h-64 mx-auto rounded-lg shadow" />
          <div className="mt-2 text-xs text-slate-600 flex items-center justify-center gap-3">
            {dimensions && (
              <span>
                {dimensions.w}×{dimensions.h}px · Calidad: <span className={quality?.color}>{quality?.label}</span>
              </span>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              Cambiar
            </Button>
            <Button type="button" size="icon" variant="destructive" onClick={onClear} aria-label="Quitar imagen">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <label htmlFor={id} className="cursor-pointer block">
          <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">Clic para seleccionar, arrastra aquí o Ctrl+V para pegar</p>
        </label>
      )}
    </div>
  );
}