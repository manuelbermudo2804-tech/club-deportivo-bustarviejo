import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, X, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Uploader de documentos para el bloque "Documentos descargables".
// Cada item: { nombre, url, descripcion }
export default function DocumentosUploader({ items = [], onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    const valid = Array.from(files).filter((f) => f.size <= 20 * 1024 * 1024);
    if (!valid.length) {
      toast.error("Selecciona archivos válidos (máx 20MB)");
      return;
    }
    setUploading(true);
    try {
      const uploads = await Promise.all(
        valid.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return { nombre: file.name, url: file_url, descripcion: "" };
        })
      );
      onChange([...items, ...uploads.filter((u) => u.url)]);
      toast.success(`${uploads.length} documento(s) añadido(s)`);
    } catch (err) {
      console.error(err);
      toast.error("Error al subir algún documento");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateAt = (idx, key, value) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  return (
    <div className="space-y-3">
      {items.map((doc, idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              value={doc.nombre || ""}
              onChange={(e) => updateAt(idx, "nombre", e.target.value)}
              placeholder="Nombre del documento"
              className="flex-1"
            />
            <button
              onClick={() => removeAt(idx)}
              className="text-red-500 hover:text-red-700 shrink-0"
              title="Eliminar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <Input
            value={doc.descripcion || ""}
            onChange={(e) => updateAt(idx, "descripcion", e.target.value)}
            placeholder="Descripción (opcional)"
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full gap-2"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? "Subiendo..." : items.length === 0 ? "Subir documentos" : "Añadir más"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <p className="text-xs text-slate-500">
        PDF, Word, Excel, etc. Máx 20MB por archivo.
      </p>
    </div>
  );
}