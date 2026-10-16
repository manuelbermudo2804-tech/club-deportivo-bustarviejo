import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Input híbrido: pegar URL o subir archivo directamente.
export default function ImageUploadInput({ value, onChange, placeholder = "https://..." }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Máximo 8 MB");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success("Imagen subida");
    } catch (err) {
      console.error(err);
      toast.error("Error al subir");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img src={value} alt="Vista previa de la imagen seleccionada" className="w-full max-h-56 object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            title="Quitar imagen"
            aria-label="Quitar imagen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm min-w-0 flex-1"
          aria-label="URL de la imagen"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full sm:w-auto gap-1 flex-shrink-0"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{uploading ? "Subiendo imagen…" : "Subir imagen"}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            handleFile(file);
            e.target.value = "";
          }}
          aria-label="Seleccionar archivo de imagen"
          className="hidden"
        />
      </div>
    </div>
  );
}