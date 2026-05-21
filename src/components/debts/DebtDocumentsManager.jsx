import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText, Trash2, Eye, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { uploadPrivateFile, getSignedUrl } from "@/components/utils/privateUpload";

/**
 * Gestor de documentos adjuntos privados para una Deuda.
 * - Solo admin (ya restringido por RLS de Deuda).
 * - Archivos privados (file_uri, no URL pública).
 * - Permite subir múltiples, listar, ver/descargar (URL firmada 5min) y borrar individualmente.
 *
 * Props:
 *  - documentos: array actual (puede ser undefined)
 *  - onChange: callback(nuevoArray) — el padre persiste cuando guarde el formulario
 */
export default function DebtDocumentsManager({ documentos = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(null);
  const list = Array.isArray(documentos) ? documentos : [];

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    // Validar tamaño (max 10MB por archivo)
    const tooBig = files.find(f => f.size > 10 * 1024 * 1024);
    if (tooBig) {
      toast.error(`"${tooBig.name}" pesa más de 10MB. Comprime o reduce el archivo.`);
      return;
    }

    setUploading(true);
    try {
      const me = await base44.auth.me();
      const nuevos = [];
      for (const file of files) {
        const file_uri = await uploadPrivateFile(file);
        nuevos.push({
          nombre: file.name,
          file_uri,
          tipo: file.type || "application/octet-stream",
          tamano: file.size,
          subido_por: me.email,
          fecha_subida: new Date().toISOString(),
        });
      }
      onChange([...list, ...nuevos]);
      toast.success(`${nuevos.length} archivo(s) subido(s) 🔒`);
    } catch (err) {
      console.error("Error subiendo documento:", err);
      toast.error("Error al subir el archivo: " + (err.message || "desconocido"));
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc, index) => {
    setLoadingPreview(index);
    try {
      const url = await getSignedUrl(doc.file_uri);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("No se pudo generar el enlace");
    } catch (err) {
      toast.error("Error al abrir: " + err.message);
    } finally {
      setLoadingPreview(null);
    }
  };

  const handleDelete = (index) => {
    const doc = list[index];
    if (!confirm(`¿Eliminar "${doc.nombre}" de esta deuda? El archivo dejará de estar vinculado.`)) return;
    const updated = list.filter((_, i) => i !== index);
    onChange(updated);
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImage = (tipo) => tipo?.startsWith("image/");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">📎 Documentos adjuntos (privados, solo admin)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("debt-docs-upload").click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Subiendo...</>
          ) : (
            <><Upload className="w-4 h-4 mr-1" /> Añadir archivos</>
          )}
        </Button>
        <input
          id="debt-docs-upload"
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.eml,.msg"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          Sin archivos adjuntos. Puedes subir capturas, PDFs, conversaciones, justificantes... (máx. 10MB por archivo)
        </p>
      ) : (
        <ul className="space-y-1.5 bg-slate-50 rounded-lg p-2 border">
          {list.map((doc, idx) => (
            <li key={idx} className="flex items-center gap-2 bg-white rounded p-2 border border-slate-200">
              {isImage(doc.tipo) ? (
                <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{doc.nombre}</p>
                <p className="text-xs text-slate-500">
                  {formatSize(doc.tamano)}
                  {doc.fecha_subida && ` · ${new Date(doc.fecha_subida).toLocaleDateString("es-ES")}`}
                  {doc.subido_por && ` · ${doc.subido_por}`}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleView(doc, idx)}
                disabled={loadingPreview === idx}
                title="Ver / descargar"
              >
                {loadingPreview === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(idx)}
                className="text-red-600 hover:text-red-700"
                title="Eliminar de esta deuda"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}