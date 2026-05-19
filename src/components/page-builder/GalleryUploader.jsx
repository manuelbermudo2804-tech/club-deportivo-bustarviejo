import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Uploader específico para galerías: sube múltiples imágenes y devuelve un array de URLs.
export default function GalleryUploader({ items = [], onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size <= 8 * 1024 * 1024);
    if (!valid.length) {
      toast.error("Selecciona imágenes válidas (máx 8MB)");
      return;
    }
    setUploading(true);
    try {
      const uploads = await Promise.all(
        valid.map((file) => base44.integrations.Core.UploadFile({ file }).then((r) => r.file_url))
      );
      onChange([...items, ...uploads.filter(Boolean)]);
      toast.success(`${uploads.length} imágenes añadidas`);
    } catch (err) {
      console.error(err);
      toast.error("Error al subir alguna imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (idx) => onChange(items.filter((_, i) => i !== idx));

  const moveItem = (idx, dir) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((url, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => removeAt(idx)}
                  className="bg-white/90 hover:bg-white text-red-600 rounded-full p-2 shadow-lg"
                  title="Eliminar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-1 left-1 flex gap-0.5">
                <button
                  onClick={() => moveItem(idx, -1)}
                  className="bg-black/60 text-white rounded text-xs px-1.5"
                  disabled={idx === 0}
                  title="Anterior"
                >◀</button>
                <button
                  onClick={() => moveItem(idx, 1)}
                  className="bg-black/60 text-white rounded text-xs px-1.5"
                  disabled={idx === items.length - 1}
                  title="Siguiente"
                >▶</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full gap-2"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? "Subiendo..." : items.length === 0 ? "Subir imágenes" : "Añadir más"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      <p className="text-xs text-slate-500">
        Puedes seleccionar varias a la vez. Máx 8MB por imagen.
      </p>
    </div>
  );
}